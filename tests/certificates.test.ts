import { readFile } from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { CERTIFICATE_NUMBER_PATTERN, generateCertificateNumber } from '@/lib/certificates/number';
import { breakLines, certificateFilename, layoutCourseTitle, renderCertificatePdf } from '@/lib/certificates/pdf';

const SAMPLE_NUMBER = 'CLPPBDVBNPF-ZVGVLGQGS-XCPXRPPPXH';

async function boldFont() {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  return pdf.embedFont(await readFile('assets/certificate/LiberationSerif-Bold.ttf'), { subset: true, features: { liga: false } });
}

describe('certificate numbers', () => {
  it('use the format of the client\'s certificates', () => {
    expect(SAMPLE_NUMBER).toMatch(CERTIFICATE_NUMBER_PATTERN);
    const numbers = Array.from({ length: 2000 }, generateCertificateNumber);
    for (const n of numbers) expect(n).toMatch(CERTIFICATE_NUMBER_PATTERN);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe('course title layout', () => {
  const chars = (line: string) => line.length;

  it('uses as few lines as fit, preferring lines that grow towards the bottom', () => {
    expect(breakLines(['A', 'B'], chars, 10, 3)).toEqual(['A B']);
    expect(breakLines(['AAAA', 'BB', 'CCCCC'], chars, 9, 3)).toEqual(['AAAA', 'BB CCCCC']);
    expect(breakLines(['AAAAAAAAAAA'], chars, 10, 3)).toBeNull();
  });

  it('breaks the sample title like the sample certificate', async () => {
    const bold = await boldFont();
    expect(layoutCourseTitle('Fixed Nuclear Gauge Radiation Safety Officer Training', bold))
      .toEqual({ size: 26.6, lines: ['FIXED NUCLEAR GAUGE', 'RADIATION SAFETY OFFICER TRAINING'] });
    expect(layoutCourseTitle('Fixed Nuclear Gauge Operation & Cleaning Training', bold).lines)
      .toEqual(['FIXED NUCLEAR GAUGE', 'OPERATION & CLEANING TRAINING']);
  });

  it('shrinks very long titles to fit three lines', async () => {
    const bold = await boldFont();
    const { size, lines } = layoutCourseTitle('Transportation of Dangerous Goods Class 7 Radioactive Materials Shipping, Receiving and Emergency Response Procedures for Portable Nuclear Gauge Operators and Supervisors', bold);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(size).toBeLessThan(26.6);
    for (const line of lines) expect(bold.widthOfTextAtSize(line, size)).toBeLessThanOrEqual(760);
  });
});

describe('certificate PDF', () => {
  it('renders one page in the size of the original with searchable metadata', async () => {
    const bytes = await renderCertificatePdf({
      learnerName: 'Tanner  Harnden', courseTitle: 'Fixed Nuclear Gauge Radiation Safety Officer Training',
      completedAt: new Date('2026-10-16T12:00:00Z'), number: SAMPLE_NUMBER,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(805.92, 2);
    expect(height).toBeCloseTo(570, 2);
    expect(pdf.getTitle()).toBe('Certificate of Training — Tanner Harnden');
    expect(pdf.getKeywords()).toBe(SAMPLE_NUMBER);
    expect(bytes.length).toBeLessThan(200_000);
  });

  it('copes with accented, non-Latin and very long input', async () => {
    for (const learnerName of ['René Lévesque-Côté', '王小明', 'x'.repeat(160)]) {
      const bytes = await renderCertificatePdf({ learnerName, courseTitle: 'y'.repeat(255), completedAt: new Date(), number: generateCertificateNumber() });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    }
  });

  it('is named like the original download', () => {
    expect(certificateFilename('Tanner Harnden')).toBe('Certificate-Tanner-Harnden.pdf');
    expect(certificateFilename('  Ann  "A/B" O\'Neil ')).toBe('Certificate-Ann-AB-O\'Neil.pdf');
    expect(certificateFilename('René Lévesque')).toBe('Certificate-René-Lévesque.pdf');
  });
});
