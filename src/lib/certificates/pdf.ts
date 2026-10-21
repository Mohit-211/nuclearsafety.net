import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatFullDate } from '@/lib/format';

/*
 * Certificate of Training PDF, laid out like the client's existing certificate (a
 * ClassMarker export). Measurements are the CSS px of that document (1 px = 0.75 pt),
 * with y measured down from the top of the page to the text baseline. Liberation Serif
 * is metric-compatible with the Times New Roman it uses, so lines have the same widths.
 */

export type CertificateContent = {
  learnerName: string;
  courseTitle: string;
  completedAt: Date;
  /** See ./number.ts */
  number: string;
};

const PT = 0.75;
const PAGE_W = 1074.56;
const PAGE_H = 760;
const CENTER_X = PAGE_W / 2;
/** Widest a name or course-title line may be. */
const MAX_LINE_W = 760;

const BLACK = rgb(0, 0, 0);
const NAVY = rgb(0, 55 / 255, 94 / 255);
const GREY = rgb(126 / 255, 126 / 255, 126 / 255);
const BAND_DARK = rgb(2 / 255, 54 / 255, 98 / 255);
const BAND_LIGHT = rgb(9 / 255, 114 / 255, 189 / 255);

/** Slanted header and footer bands. Each pair overlaps so no seam shows between the colours. */
const BANDS: [Color, string][] = [
  [BAND_DARK, `M0 0 L${PAGE_W} 0 L${PAGE_W} 55.8 L0 67.5 Z`],
  [BAND_LIGHT, `M0 20.7 L${PAGE_W} 41.7 L${PAGE_W} 55.8 L0 67.5 Z`],
  [BAND_LIGHT, `M0 729.4 L${PAGE_W} 709.4 L${PAGE_W} ${PAGE_H} L0 ${PAGE_H} Z`],
  [BAND_DARK, `M0 742.4 L${PAGE_W} 747.6 L${PAGE_W} ${PAGE_H} L0 ${PAGE_H} Z`],
];

const LOGO = { x: 9, top: 82, width: 293, height: 230 };
const NAME_SIZE = 26.6;
const TITLE = { size: 26.6, minSize: 16, firstBaseline: 475, lineGap: 31 };
/** Baseline distance from the last course-title line to the date. */
const DATE_GAP = 56;

const ASSET_DIR = path.join(process.cwd(), 'assets/certificate');
type Assets = { regular: Buffer; bold: Buffer; italic: Buffer; sans: Buffer; logo: Buffer };

let assets: Promise<Assets> | undefined;

/** Fonts and logo (see assets/certificate/README.md), read once per process. */
function loadAssets(): Promise<Assets> {
  const read = (file: string) => readFile(path.join(ASSET_DIR, file));
  assets ??= Promise.all([
    read('LiberationSerif-Regular.ttf'), read('LiberationSerif-Bold.ttf'), read('LiberationSerif-Italic.ttf'), read('OpenSans-Bold.ttf'), read('logo.jpg'),
  ])
    .then(([regular, bold, italic, sans, logo]) => ({ regular, bold, italic, sans, logo }))
    .catch(err => { assets = undefined; throw err; });
  return assets;
}

/** Every way to split `words` into `count` consecutive, non-empty lines. */
function* splits(words: string[], count: number): Generator<string[]> {
  if (count === 1) { yield [words.join(' ')]; return; }
  for (let i = 1; i <= words.length - count + 1; i++) {
    for (const rest of splits(words.slice(i), count - 1)) yield [words.slice(0, i).join(' '), ...rest];
  }
}

/**
 * Break words into as few lines (at most `maxLines`) no wider than `maxWidth` as possible.
 * Prefers lines that get longer towards the bottom, as on the sample certificate
 * ("FIXED NUCLEAR GAUGE / RADIATION SAFETY OFFICER TRAINING"), then the narrowest
 * widest line. Returns null when the words do not fit.
 */
export function breakLines(words: string[], width: (line: string) => number, maxWidth: number, maxLines: number): string[] | null {
  for (let count = 1; count <= Math.min(maxLines, words.length); count++) {
    let best: { lines: string[]; growing: boolean; widest: number } | null = null;
    for (const lines of splits(words, count)) {
      const widths = lines.map(width);
      const widest = Math.max(...widths);
      if (widest > maxWidth) continue;
      const growing = widths.every((w, i) => i === 0 || w >= widths[i - 1]!);
      if (!best || (growing && !best.growing) || (growing === best.growing && widest < best.widest)) best = { lines, growing, widest };
    }
    if (best) return best.lines;
  }
  return null;
}

/** Course title in capitals: up to three lines, shrinking the type if it would not fit. */
export function layoutCourseTitle(title: string, font: PDFFont): { size: number; lines: string[] } {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const widths = new Map<string, number>();
  const widthAt = (size: number) => (line: string) => {
    if (!widths.has(line)) widths.set(line, font.widthOfTextAtSize(line, 1));
    return widths.get(line)! * size;
  };
  for (let size = TITLE.size; size >= TITLE.minSize; size -= 1.4) {
    const lines = breakLines(words, widthAt(size), MAX_LINE_W, 3);
    if (lines) return { size, lines };
  }
  const lines = breakLines(words, widthAt(TITLE.minSize), MAX_LINE_W, 6);
  if (lines) return { size: TITLE.minSize, lines };
  // Only reachable with absurdly long single words: one line, shrunk to fit.
  const line = words.join(' ');
  return { size: Math.min(TITLE.minSize, MAX_LINE_W / widthAt(1)(line)), lines: [line] };
}

function drawText(page: PDFPage, text: string, font: PDFFont, size: number, baseline: number, align: 'center' | { right: number }, color = BLACK) {
  const width = font.widthOfTextAtSize(text, size);
  const x = align === 'center' ? CENTER_X - width / 2 : align.right - width;
  page.drawText(text, { x: x * PT, y: (PAGE_H - baseline) * PT, size: size * PT, font, color });
}

export async function renderCertificatePdf(content: CertificateContent): Promise<Uint8Array> {
  const files = await loadAssets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Subset to the glyphs used; no ligatures, so the text copies out exactly as written.
  const [regular, bold, italic, sans] = await Promise.all(
    [files.regular, files.bold, files.italic, files.sans].map(bytes => pdf.embedFont(bytes, { subset: true, features: { liga: false } })),
  );
  const logo = await pdf.embedJpg(files.logo);
  const page = pdf.addPage([PAGE_W * PT, PAGE_H * PT]);

  for (const [color, d] of BANDS) page.drawSvgPath(d, { x: 0, y: PAGE_H * PT, scale: PT, color });
  page.drawImage(logo, { x: LOGO.x * PT, y: (PAGE_H - LOGO.top - LOGO.height) * PT, width: LOGO.width * PT, height: LOGO.height * PT });

  const name = content.learnerName.replace(/\s+/g, ' ').trim();
  const nameSize = Math.min(NAME_SIZE, NAME_SIZE * MAX_LINE_W / bold.widthOfTextAtSize(name, NAME_SIZE));
  drawText(page, 'Certificate of Training', bold, 35, 259, 'center', NAVY);
  drawText(page, 'is hereby granted to', sans, 18.2, 306, 'center', GREY);
  drawText(page, name, bold, nameSize, 359, 'center');
  drawText(page, 'to certify successful completion by examination', italic, 18.2, 408, 'center');
  drawText(page, 'of the course', italic, 18.2, 429, 'center');

  const title = layoutCourseTitle(content.courseTitle, bold);
  const lineGap = TITLE.lineGap * title.size / TITLE.size;
  title.lines.forEach((line, i) => drawText(page, line, bold, title.size, TITLE.firstBaseline + i * lineGap, 'center'));
  const dateBaseline = TITLE.firstBaseline + (title.lines.length - 1) * lineGap + DATE_GAP;
  drawText(page, formatFullDate(content.completedAt), regular, 26.6, dateBaseline, 'center');

  drawText(page, 'Taken at HazardU.com', regular, 14, 666, 'center');
  drawText(page, 'A division of Canadian Nuclear Safety Services Inc.', regular, 14, 682, 'center');
  drawText(page, content.number, regular, 12.6, 686, { right: 1064.74 });

  pdf.setTitle(`Certificate of Training — ${name}`, { showInWindowTitleBar: true });
  pdf.setSubject(content.courseTitle);
  pdf.setKeywords([content.number]);
  pdf.setCreator('nuclearsafety.net');
  pdf.setProducer('nuclearsafety.net');
  return pdf.save();
}

/** Download name in the style of the original, e.g. "Certificate-Tanner-Harnden.pdf". */
export function certificateFilename(learnerName: string): string {
  const name = learnerName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().split(/\s+/).filter(Boolean).join('-');
  return `Certificate${name ? `-${name}` : ''}.pdf`;
}
