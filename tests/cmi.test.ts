import { describe, expect, it } from 'vitest';
import {
  buildLaunchCmi, isCourseComplete, mergeOutcome, normalizeCmi, parseIsoDuration, parseScorm12Time, progressPercent, scorePercent,
} from '@/lib/scorm/cmi';

describe('time parsing', () => {
  it('parses SCORM 1.2 and 2004 durations', () => {
    expect(parseScorm12Time('0001:02:03.50')).toBe(3723.5);
    expect(parseScorm12Time('00:00:00')).toBe(0);
    expect(parseScorm12Time('bad')).toBeNull();
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('P1DT0H0M10.5S')).toBe(86411);
    expect(parseIsoDuration('PT')).toBeNull();
  });
});

describe('normalizeCmi', () => {
  it('splits SCORM 1.2 lesson_status into completion and success', () => {
    const cmi = { core: { lesson_status: 'failed', lesson_location: 'p3', exit: 'suspend', score: { raw: '40', min: '0', max: '100' }, total_time: '0000:10:00' } };
    const s = normalizeCmi('1.2', cmi);
    expect(s).toMatchObject({ completionStatus: 'completed', successStatus: 'failed', scoreRaw: 40, location: 'p3', exit: 'suspend', totalTimeSeconds: 600 });
    expect(normalizeCmi('1.2', { core: { lesson_status: 'passed' } })).toMatchObject({ completionStatus: 'completed', successStatus: 'passed' });
    expect(normalizeCmi('1.2', { core: { lesson_status: 'incomplete' } })).toMatchObject({ completionStatus: 'incomplete', successStatus: 'unknown' });
    expect(normalizeCmi('1.2', {})).toMatchObject({ completionStatus: 'not attempted', totalTimeRaw: null });
  });

  it('keeps SCORM 2004 completion/success/score separate', () => {
    const s = normalizeCmi('2004', { completion_status: 'completed', success_status: 'passed', score: { scaled: '0.9', raw: '' }, progress_measure: '1', total_time: 'PT1M5S' });
    expect(s).toMatchObject({ completionStatus: 'completed', successStatus: 'passed', scoreScaled: 0.9, scoreRaw: null, progressMeasure: 1, totalTimeSeconds: 65 });
  });
});

describe('outcome rules', () => {
  it('completion and pass are sticky; fail can become pass', () => {
    const incomplete = normalizeCmi('2004', { completion_status: 'incomplete' });
    expect(mergeOutcome({ completionStatus: 'completed', successStatus: 'passed' }, incomplete)).toEqual({ completionStatus: 'completed', successStatus: 'passed' });
    const passed = normalizeCmi('2004', { completion_status: 'completed', success_status: 'passed' });
    expect(mergeOutcome({ completionStatus: 'completed', successStatus: 'failed' }, passed).successStatus).toBe('passed');
  });

  it('opening a course is not completion; failing is not completion', () => {
    expect(isCourseComplete({ completionStatus: 'incomplete', successStatus: 'unknown' })).toBe(false);
    expect(isCourseComplete({ completionStatus: 'completed', successStatus: 'failed' })).toBe(false);
    expect(isCourseComplete({ completionStatus: 'completed', successStatus: 'unknown' })).toBe(true);
  });

  it('score and progress percentages', () => {
    expect(scorePercent({ scoreScaled: 0.85, scoreRaw: null, scoreMin: null, scoreMax: null })).toBe(85);
    expect(scorePercent({ scoreScaled: null, scoreRaw: 8, scoreMin: 0, scoreMax: 10 })).toBe(80);
    expect(scorePercent({ scoreScaled: null, scoreRaw: null, scoreMin: null, scoreMax: null })).toBeNull();
    expect(progressPercent({ completionStatus: 'incomplete', successStatus: 'unknown', progressMeasure: 0.42 })).toBe(42);
    expect(progressPercent({ completionStatus: 'incomplete', successStatus: 'unknown', progressMeasure: null })).toBeNull();
    expect(progressPercent({ completionStatus: 'completed', successStatus: 'passed', progressMeasure: null })).toBe(100);
  });
});

describe('buildLaunchCmi', () => {
  const learner = { id: 7, name: 'Jane Q Doe' };
  it('first launch is ab-initio with learner identity and mastery score', () => {
    const cmi = buildLaunchCmi({ version: '1.2', storedCmi: null, totalTimeRaw: null, lastExit: null, learner, item: { masteryScore: '80' }, review: false });
    expect(cmi).toMatchObject({ core: { student_id: '7', student_name: 'Doe, Jane Q', entry: 'ab-initio', lesson_mode: 'normal', credit: 'credit' }, student_data: { mastery_score: '80' } });
  });

  it('resume restores suspend data/location and strips session-only fields', () => {
    const stored = JSON.stringify({ suspend_data: 'abc', core: { lesson_location: 'p3', exit: 'suspend', session_time: '00:01:00', total_time: '00:00:00' } });
    const cmi = buildLaunchCmi({ version: '1.2', storedCmi: stored, totalTimeRaw: '0000:05:00', lastExit: 'suspend', learner, item: undefined, review: false }) as { suspend_data: string; core: Record<string, unknown> };
    expect(cmi.suspend_data).toBe('abc');
    expect(cmi.core).toMatchObject({ lesson_location: 'p3', entry: 'resume', total_time: '0000:05:00' });
    expect(cmi.core.session_time).toBeUndefined();
    expect(cmi.core.exit).toBeUndefined();
  });

  it('2004 review launches use review mode without credit', () => {
    const stored = JSON.stringify({ location: 'p9', completion_status: 'completed', exit: 'normal' });
    const cmi = buildLaunchCmi({ version: '2004', storedCmi: stored, totalTimeRaw: 'PT1M', lastExit: 'normal', learner, item: undefined, review: true });
    expect(cmi).toMatchObject({ location: 'p9', mode: 'review', credit: 'no-credit', entry: '', learner_id: '7', total_time: 'PT1M' });
  });
});
