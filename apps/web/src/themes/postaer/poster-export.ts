import type { PosterInput } from './poster-scene';
import { posterInks, posterLayout } from './poster-scene';

/**
 * Draw today's poster at story size (1080×1920) and hand it to the share
 * sheet — or download it where navigator.share can't take files.
 */

function inkFor(
  key: 'shallow' | 'mid' | 'deep' | 'deepest',
  inks: ReturnType<typeof posterInks>
): string {
  if (key === 'shallow') return inks.shallow;
  if (key === 'mid') return inks.mid;
  if (key === 'deep') return inks.deep;
  return '#143733';
}

export function drawPoster(ctx: CanvasRenderingContext2D, input: PosterInput): void {
  const layout = posterLayout(input);
  const inks = posterInks(input.verdict);
  const { width, height } = layout;

  ctx.fillStyle = inks.stock;
  ctx.fillRect(0, 0, width, height);

  // Sun disc
  ctx.fillStyle = inks.sun;
  ctx.beginPath();
  ctx.arc(layout.sun.cx, layout.sun.cy, layout.sun.r, 0, Math.PI * 2);
  ctx.fill();

  // Wave bands — flat half-ellipse crests, printed back to front
  for (const band of layout.bands) {
    ctx.fillStyle = inkFor(band.ink, inks);
    ctx.beginPath();
    ctx.ellipse(width / 2, band.yTop + 130, width * 1.1, 130, 0, Math.PI, 0, false);
    ctx.rect(-width * 0.25, band.yTop + 128, width * 1.5, height - band.yTop);
    ctx.fill();
  }

  // Rain hatching on blown-out days
  if (input.verdict === 'blown') {
    ctx.strokeStyle = 'rgba(61, 80, 73, 0.25)';
    ctx.lineWidth = 6;
    for (let x = -height; x < width + height; x += 54) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * 0.45, height * 0.62);
      ctx.stroke();
    }
  }

  // Headline
  ctx.fillStyle = inks.headline;
  ctx.textAlign = 'center';
  ctx.font = `700 ${layout.headline.sizePx}px 'Clash Display', sans-serif`;
  ctx.fillText(layout.headline.text, width / 2, layout.headline.y);

  if (layout.subline.text.length > 0) {
    ctx.fillStyle = inks.subline;
    ctx.font = "700 44px 'General Sans', sans-serif";
    const spaced = layout.subline.text.split('').join('  ');
    ctx.fillText(spaced, width / 2, layout.subline.y);
  }

  ctx.fillStyle = inks.headline;
  ctx.font = "400 40px 'General Sans', sans-serif";
  ctx.fillText(input.reason, width / 2, layout.reasonY);

  // Date stamp on the deepest band
  ctx.fillStyle = inks.stock;
  ctx.font = "700 34px 'General Sans', sans-serif";
  ctx.fillText(layout.stamp.text.toUpperCase(), width / 2, layout.stamp.y);
}

async function posterBlob(input: PosterInput): Promise<Blob> {
  await document.fonts.load("700 232px 'Clash Display'");
  await document.fonts.load("700 44px 'General Sans'");
  const canvas = document.createElement('canvas');
  const layout = posterLayout(input);
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('Canvas unavailable');
  }
  drawPoster(ctx, input);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Poster render failed'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function sharePoster(
  input: PosterInput
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await posterBlob(input);
  const filename = `tonnta-${input.dateLabel.replaceAll('.', '-')}.png`;
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator;
  if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Tonnta — today at the beach' });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) {
        return 'cancelled';
      }
      // Share sheet unavailable (e.g. headless, kiosk) — fall through to download.
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
