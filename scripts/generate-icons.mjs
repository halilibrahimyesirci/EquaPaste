// Generates EquaPaste placeholder icons (graphite squircle + white sigma) as PNGs.
// No image-library dependency: a tiny hand-rolled PNG encoder (RGBA, zlib IDAT).
// Run: node scripts/generate-icons.mjs   (also wired as `pnpm icons`)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');
const SIZES = [16, 32, 48, 128];

// Neutral-Graphite brand tokens.
const GRAPHITE = [52, 58, 71, 255]; // #343A47
const MARK = [247, 248, 250, 255]; // #F7F8FA

// ---- minimal PNG encoder -------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing -------------------------------------------------------------
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Signed coverage of a rounded rectangle (1 inside, 0 outside, soft edge).
function roundedCoverage(x, y, w, h, r) {
  const cx = clamp(x, r, w - 1 - r);
  const cy = clamp(y, r, h - 1 - r);
  const d = Math.hypot(x - cx, y - cy);
  return clamp(r + 0.5 - d, 0, 1);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = Math.round(size * 0.24);
  const t = Math.max(2, size * 0.12); // stroke thickness

  // Sigma glyph box.
  const m = size * 0.28;
  const gx0 = m;
  const gy0 = m;
  const gx1 = size - m;
  const gy1 = size - m;
  const midY = (gy0 + gy1) / 2;
  const midX = gx0 + (gx1 - gx0) * 0.46;
  const segs = [
    [gx0, gy0, gx1, gy0], // top bar
    [gx0, gy0, midX, midY], // upper diagonal
    [midX, midY, gx0, gy1], // lower diagonal
    [gx0, gy1, gx1, gy1], // bottom bar
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const tileCov = roundedCoverage(px, py, size, size, r);
      if (tileCov <= 0) continue;

      let markDist = Infinity;
      for (const [ax, ay, bx, by] of segs) {
        const d = distToSegment(px, py, ax, ay, bx, by);
        if (d < markDist) markDist = d;
      }
      const markCov = clamp(t / 2 + 0.5 - markDist, 0, 1);

      // Composite: graphite tile, white sigma on top.
      const i = (y * size + x) * 4;
      const baseA = tileCov;
      const r0 = GRAPHITE[0];
      const g0 = GRAPHITE[1];
      const b0 = GRAPHITE[2];
      const r1 = MARK[0];
      const g1 = MARK[1];
      const b1 = MARK[2];
      rgba[i] = Math.round(r0 * (1 - markCov) + r1 * markCov);
      rgba[i + 1] = Math.round(g0 * (1 - markCov) + g1 * markCov);
      rgba[i + 2] = Math.round(b0 * (1 - markCov) + b1 * markCov);
      rgba[i + 3] = Math.round(255 * baseA);
    }
  }
  return rgba;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = encodePng(size, size, drawIcon(size));
  writeFileSync(resolve(OUT_DIR, `${size}.png`), png);
  console.log(`wrote icon/${size}.png (${png.length} bytes)`);
}
