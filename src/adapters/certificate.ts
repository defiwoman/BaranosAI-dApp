import { APP_NAME, CERTIFICATE, ISSUER, formatDate, type CertificateVariant } from '../content/brand';
import { buildImagePdf } from '../domain/pdf';

export interface CertificateData {
  name: string;
  completedAt: string;
  /** `earlier` reproduces certificates earned before the use-case step was added. */
  variant?: CertificateVariant;
}

/** A4 landscape at 300 dpi, so text stays sharp when printed or zoomed. */
export const CERT_WIDTH = 2480;
export const CERT_HEIGHT = 1754;

const INK = '#182746';
const NAVY = '#060C2C';
const INK_2 = '#4C5D79';
const POWDER = '#BFD3F6';
const ACCENT = '#5B7FC4';
const PAPER = '#F4F7FC';

const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", "Noto Serif", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "DejaVu Sans", Arial, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** Splits text into lines that fit `maxWidth` at the context's current font. */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  // A single very long word (e.g. a name with no spaces) is split by characters.
  return lines.flatMap((l) => (measure(l) <= maxWidth ? [l] : splitByChars(measure, l, maxWidth)));
}

function splitByChars(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of Array.from(text)) {
    if (measure(line + ch) > maxWidth && line) {
      out.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) out.push(line);
  return out;
}

/**
 * Picks the largest font size (between max and min) at which the name fits on one line,
 * otherwise wraps it over at most two lines at the minimum size.
 */
export function fitName(
  measureAt: (size: number, s: string) => number,
  name: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
): { size: number; lines: string[] } {
  for (let size = maxSize; size >= minSize; size -= 2) {
    if (measureAt(size, name) <= maxWidth) return { size, lines: [name] };
  }
  return { size: minSize, lines: balanceTwoLines((s) => measureAt(minSize, s), name, maxWidth) };
}

/** Splits text into two lines of similar width (at a space if possible), so no single word is left stranded. */
export function balanceTwoLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const candidates: [string, string][] = [];
  if (words.length > 1) {
    for (let i = 1; i < words.length; i++) candidates.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  }
  const chars = Array.from(text);
  // Also consider splitting inside a word (needed for long names without spaces).
  if (candidates.every(([a, b]) => measure(a) > maxWidth || measure(b) > maxWidth)) {
    for (let i = 1; i < chars.length; i++) candidates.push([chars.slice(0, i).join(''), chars.slice(i).join('')]);
  }
  let best: [string, string] | null = null;
  let bestWidth = Infinity;
  for (const [a, b] of candidates) {
    const w = Math.max(measure(a), measure(b));
    if (w < bestWidth) {
      best = [a, b];
      bestWidth = w;
    }
  }
  return best ? best.map((l) => l.trim()) : [text];
}

/** Draws the certificate. `u` is one design unit; the layout is designed on a 1000 × 707 grid. */
export function drawCertificate(ctx: CanvasRenderingContext2D, data: CertificateData, logo: HTMLImageElement | null): void {
  const W = CERT_WIDTH;
  const H = CERT_HEIGHT;
  const u = W / 1000;
  const cx = W / 2;
  const font = (weight: string, size: number, family: string) => `${weight} ${Math.round(size * u)}px ${family}`;
  const spacing = (px: number) => {
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px * u}px`;
  };

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Subtle double border.
  ctx.strokeStyle = POWDER;
  ctx.lineWidth = 6 * u;
  ctx.strokeRect(22 * u, 22 * u, W - 44 * u, H - 44 * u);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1 * u;
  ctx.strokeRect(32 * u, 32 * u, W - 64 * u, H - 64 * u);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // The supplied logo, whole and unaltered, with rounded corners.
  const logoSize = 78 * u;
  const logoY = 60 * u;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx - logoSize / 2, logoY, logoSize, logoSize, 10 * u);
    ctx.clip();
    ctx.drawImage(logo, cx - logoSize / 2, logoY, logoSize, logoSize);
    ctx.restore();
  }

  ctx.fillStyle = INK_2;
  ctx.font = font('600', 15, SANS);
  spacing(3);
  ctx.fillText(APP_NAME.toUpperCase(), cx, 172 * u);
  spacing(0);

  ctx.fillStyle = NAVY;
  ctx.font = font('normal', 46, SERIF);
  ctx.fillText(CERTIFICATE.heading, cx, 226 * u);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(cx - 60 * u, 246 * u, 120 * u, 2.5 * u);

  ctx.fillStyle = INK_2;
  ctx.font = font('normal', 17, SANS);
  ctx.fillText('Presented to', cx, 288 * u);

  // The participant's name, as large as fits.
  const nameFont = (size: number) => font('bold', size, SERIF);
  const measureAt = (size: number, s: string) => {
    ctx.font = nameFont(size);
    return ctx.measureText(s).width / u;
  };
  const fitted = fitName(measureAt, data.name, 800, 56, 30);
  ctx.fillStyle = NAVY;
  ctx.font = nameFont(fitted.size);
  const nameLineHeight = fitted.size * 1.15;
  let y = (fitted.lines.length === 1 ? 346 : 330) * u;
  for (const line of fitted.lines) {
    ctx.fillText(line, cx, y);
    y += nameLineHeight * u;
  }

  // Recognition text.
  ctx.fillStyle = INK;
  ctx.font = font('normal', 16.5, SANS);
  const earlier = data.variant === 'earlier';
  const bodyText = earlier ? CERTIFICATE.earlierBodyAfterName : CERTIFICATE.bodyAfterName;
  const bodyLines = wrapLines((s) => ctx.measureText(s).width / u, bodyText, 740);
  y = (fitted.lines.length === 1 ? 392 : 406) * u;
  for (const line of bodyLines) {
    ctx.fillText(line, cx, y);
    y += 25 * u;
  }

  // Programme and completion details.
  // Details sit a little below the recognition text, but never lower than the original layout.
  const detailsY = Math.min(540 * u, y + 40 * u);
  ctx.fillStyle = NAVY;
  ctx.font = font('normal', 20, SERIF);
  ctx.fillText(CERTIFICATE.program, cx, detailsY);
  ctx.fillStyle = INK;
  ctx.font = font('600', earlier ? 15.5 : 14, SANS);
  const achievements = earlier ? CERTIFICATE.cases : `${CERTIFICATE.cases}  ·  ${CERTIFICATE.useCase}`;
  ctx.fillText(`${achievements}  ·  Completed on ${formatDate(data.completedAt)}`, cx, detailsY + 30 * u);

  ctx.fillStyle = POWDER;
  ctx.fillRect(cx - 220 * u, 598 * u, 440 * u, 1 * u);

  ctx.fillStyle = INK_2;
  ctx.font = font('normal', 13, SANS);
  ctx.fillText('Issued by', cx, 622 * u);
  ctx.fillStyle = INK;
  ctx.font = font('600', 15, SANS);
  ctx.fillText(ISSUER, cx, 643 * u);

  ctx.fillStyle = INK_2;
  ctx.font = font('normal', 11, SANS);
  ctx.fillText(earlier ? CERTIFICATE.earlierFootnote : CERTIFICATE.footnote, cx, 664 * u);
}

export async function renderCertificate(data: CertificateData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = CERT_WIDTH;
  canvas.height = CERT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  const logo = await loadImage('/brand/baranos-logo.png').catch(() => null);
  drawCertificate(ctx, data, logo);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), type, quality),
  );
}

export function certificatePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return canvasBlob(canvas, 'image/png');
}

export async function certificatePdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpeg = new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.93)).arrayBuffer());
  const pdf = buildImagePdf(jpeg, canvas.width, canvas.height, `${APP_NAME} certificate`);
  return new Blob([pdf], { type: 'application/pdf' });
}

export function certificateFilename(name: string, ext: 'png' | 'pdf'): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 40);
  return `baranosai-quest-certificate${slug ? `-${slug}` : ''}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
