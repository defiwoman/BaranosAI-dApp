import type { SummaryData } from '../domain/summary';

const W = 1200;
const H = 630;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Draws a share card from the player's actual local progress. Everything happens in the
 * browser; the image is never uploaded. The logo is drawn whole and unaltered.
 */
export async function renderShareCard(canvas: HTMLCanvasElement, data: SummaryData): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = '#060C2C';
  ctx.fillRect(0, 0, W, H);

  try {
    const logo = await loadImage('/brand/baranos-logo.png');
    ctx.drawImage(logo, 64, 64, 160, 160);
  } catch {
    // The card is still meaningful without the logo.
  }

  ctx.fillStyle = '#E2EBFC';
  ctx.font = '48px Georgia, serif';
  ctx.fillText('Baranos Lab', 256, 120);
  ctx.font = '30px Georgia, serif';
  ctx.fillStyle = '#BFD3F6';
  ctx.fillText('The Verification Files', 256, 164);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(`${data.completed} of ${data.total} case files · Rank: ${data.rank}`, 256, 210);

  ctx.fillStyle = '#EEF3FB';
  ctx.fillRect(64, 260, W - 128, 290);
  ctx.fillStyle = '#182746';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Concepts explored', 96, 304);
  ctx.font = '24px system-ui, sans-serif';
  const lines = data.concepts.length > 0 ? data.concepts.map((c) => `${c.id}  ${c.concept}`) : ['No cases completed yet'];
  lines.slice(0, 6).forEach((l, i) => ctx.fillText(l, 96, 348 + i * 34));

  ctx.fillStyle = '#A9B9D8';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Community-built learning simulation · fictional cases · progress stored in my browser', 64, 596);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
