// Generates the placeholder launcher assets (icon, adaptive icon, splash,
// favicon) as PNGs with no image dependencies: a wave glyph on the Éirí
// palette from docs/DESIGN.md. Re-run with `pnpm --filter @tonnta/app generate:assets`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

// Éirí: pre-dawn indigo sky over harbour water, dawn amber on the crest.
const SKY_TOP = [0x10, 0x14, 0x2e];
const SKY_BOTTOM = [0x1d, 0x3d, 0x44];
const WATER = [0x0b, 0x16, 0x1e];
const CREST = [0xe8, 0xa3, 0x3d];
const FOAM = [0x8f, 0xc1, 0xb5];

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Paints the wave glyph into a square canvas. `transparentSky` leaves the
 * background clear (Android adaptive foreground); the glyph always sits in
 * the centre so it survives the adaptive-icon safe zone.
 */
function paintWave(size, { transparentSky }) {
  const rgba = Buffer.alloc(size * size * 4);
  const crestY = size * 0.58;
  const amplitude = size * 0.06;
  const wavelength = size * 0.55;
  const crestWidth = size * 0.028;
  const foamWidth = size * 0.012;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const phase = ((x - size * 0.5) / wavelength) * Math.PI * 2;
      const surface = crestY + Math.sin(phase) * amplitude;
      const below = y - surface;

      let colour = transparentSky ? [0, 0, 0] : mix(SKY_TOP, SKY_BOTTOM, y / size);
      let alpha = transparentSky ? 0 : 255;

      const waterCoverage = smoothstep(-1, 1, below);
      if (waterCoverage > 0) {
        colour = mix(colour, WATER, waterCoverage);
        alpha = Math.max(alpha, Math.round(255 * waterCoverage));
      }

      const crestBand = 1 - smoothstep(0, crestWidth, Math.abs(below + crestWidth * 0.5));
      if (crestBand > 0) {
        colour = mix(colour, CREST, crestBand);
        alpha = Math.max(alpha, Math.round(255 * crestBand));
      }

      const foamBand = 1 - smoothstep(0, foamWidth, Math.abs(below - crestWidth * 1.6));
      if (foamBand > 0) {
        colour = mix(colour, FOAM, foamBand * 0.9);
        alpha = Math.max(alpha, Math.round(255 * foamBand));
      }

      if (!transparentSky) {
        // Rounded-square mask so the icon reads well where the OS does not mask it.
        const dx = Math.max(cornerRadius - x, x - (size - 1 - cornerRadius), 0);
        const dy = Math.max(cornerRadius - y, y - (size - 1 - cornerRadius), 0);
        const outside = Math.hypot(dx, dy) - cornerRadius;
        alpha = Math.round(alpha * (1 - smoothstep(-1, 1, outside)));
      }

      const offset = (y * size + x) * 4;
      rgba[offset] = colour[0];
      rgba[offset + 1] = colour[1];
      rgba[offset + 2] = colour[2];
      rgba[offset + 3] = alpha;
    }
  }
  return rgba;
}

/** Centres a square glyph on a larger canvas filled with the splash background. */
function paintSplash(width, height, glyphSize) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = WATER[0];
    rgba[i * 4 + 1] = WATER[1];
    rgba[i * 4 + 2] = WATER[2];
    rgba[i * 4 + 3] = 255;
  }
  const glyph = paintWave(glyphSize, { transparentSky: false });
  const left = Math.round((width - glyphSize) / 2);
  const top = Math.round((height - glyphSize) / 2);
  for (let y = 0; y < glyphSize; y += 1) {
    for (let x = 0; x < glyphSize; x += 1) {
      const src = (y * glyphSize + x) * 4;
      const alpha = glyph[src + 3] / 255;
      const dst = ((top + y) * width + (left + x)) * 4;
      for (let c = 0; c < 3; c += 1) {
        rgba[dst + c] = Math.round(rgba[dst + c] * (1 - alpha) + glyph[src + c] * alpha);
      }
    }
  }
  return rgba;
}

mkdirSync(OUT_DIR, { recursive: true });

const assets = [
  ['icon.png', 1024, 1024, paintWave(1024, { transparentSky: false })],
  ['adaptive-icon.png', 1024, 1024, paintWave(1024, { transparentSky: true })],
  ['favicon.png', 96, 96, paintWave(96, { transparentSky: false })],
  ['splash.png', 1284, 2778, paintSplash(1284, 2778, 512)],
];

for (const [name, width, height, rgba] of assets) {
  writeFileSync(join(OUT_DIR, name), encodePng(width, height, rgba));
  console.warn(`wrote assets/${name} (${width}x${height})`);
}
