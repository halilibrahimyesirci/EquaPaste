// Builds Chrome Web Store screenshots (exactly 1280x800) from the raw app captures
// in docs/screenshots/. Each capture is contain-fit and centered on a Neutral-Graphite
// background so mixed sizes/orientations look consistent. No image-library dependency:
// a small PNG decoder + area-average resampler + the same RGBA PNG encoder the icon
// script uses. Run: node scripts/store-shots.mjs   (also wired as `pnpm shots`)
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = resolve(ROOT, 'docs', 'screenshots');
const OUT_DIR = resolve(ROOT, 'store', 'screenshots');

const CANVAS_W = 1280;
const CANVAS_H = 800;
const MARGIN = 48; // breathing room so the shot floats on the graphite frame
const BG = [52, 58, 71]; // #343A47

// ---- PNG decode (8-bit, colour type 6 RGBA, non-interlaced) ---------------
function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG');
  let p = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0)
        throw new Error(`unsupported PNG (bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace})`);
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    p += 12 + len;
  }
  const inf = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const pp = a + b - c;
    const pa = Math.abs(pp - a);
    const pb = Math.abs(pp - b);
    const pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const ft = inf[y * (stride + 1)];
    const inRow = (y * (stride + 1)) + 1;
    const outRow = y * stride;
    for (let x = 0; x < stride; x++) {
      const raw = inf[inRow + x];
      const a = x >= bpp ? out[outRow + x - bpp] : 0;
      const b = y > 0 ? out[outRow - stride + x] : 0;
      const c = y > 0 && x >= bpp ? out[outRow - stride + x - bpp] : 0;
      let val;
      switch (ft) {
        case 0: val = raw; break;
        case 1: val = raw + a; break;
        case 2: val = raw + b; break;
        case 3: val = raw + ((a + b) >> 1); break;
        case 4: val = raw + paeth(a, b, c); break;
        default: throw new Error('bad filter ' + ft);
      }
      out[outRow + x] = val & 0xff;
    }
  }
  return { width, height, rgba: out };
}

// ---- area-average resize (great for downscaling text) ---------------------
function areaResize(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4);
  const xr = sw / dw;
  const yr = sh / dh;
  for (let dy = 0; dy < dh; dy++) {
    const fy0 = dy * yr;
    const fy1 = (dy + 1) * yr;
    const iy0 = Math.floor(fy0);
    const iy1 = Math.min(sh - 1, Math.ceil(fy1) - 1);
    for (let dx = 0; dx < dw; dx++) {
      const fx0 = dx * xr;
      const fx1 = (dx + 1) * xr;
      const ix0 = Math.floor(fx0);
      const ix1 = Math.min(sw - 1, Math.ceil(fx1) - 1);
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let sy = iy0; sy <= iy1; sy++) {
        const wy = Math.min(fy1, sy + 1) - Math.max(fy0, sy);
        if (wy <= 0) continue;
        for (let sx = ix0; sx <= ix1; sx++) {
          const wx = Math.min(fx1, sx + 1) - Math.max(fx0, sx);
          if (wx <= 0) continue;
          const w = wx * wy;
          const si = (sy * sw + sx) * 4;
          r += src[si] * w;
          g += src[si + 1] * w;
          b += src[si + 2] * w;
          a += src[si + 3] * w;
          wsum += w;
        }
      }
      const di = (dy * dw + dx) * 4;
      dst[di] = Math.round(r / wsum);
      dst[di + 1] = Math.round(g / wsum);
      dst[di + 2] = Math.round(b / wsum);
      dst[di + 3] = Math.round(a / wsum);
    }
  }
  return dst;
}

// ---- minimal RGBA PNG encoder (same approach as generate-icons.mjs) -------
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- compose --------------------------------------------------------------
function makeStoreShot(srcPng) {
  const { width: sw, height: sh, rgba } = decodePng(srcPng);
  const maxW = CANVAS_W - 2 * MARGIN;
  const maxH = CANVAS_H - 2 * MARGIN;
  const scale = Math.min(maxW / sw, maxH / sh, 1);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const shot = areaResize(rgba, sw, sh, dw, dh);

  const canvas = Buffer.alloc(CANVAS_W * CANVAS_H * 4);
  for (let i = 0; i < CANVAS_W * CANVAS_H; i++) {
    canvas[i * 4] = BG[0];
    canvas[i * 4 + 1] = BG[1];
    canvas[i * 4 + 2] = BG[2];
    canvas[i * 4 + 3] = 255;
  }
  const ox = Math.floor((CANVAS_W - dw) / 2);
  const oy = Math.floor((CANVAS_H - dh) / 2);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const si = (y * dw + x) * 4;
      const a = shot[si + 3] / 255;
      const di = ((oy + y) * CANVAS_W + (ox + x)) * 4;
      canvas[di] = Math.round(shot[si] * a + BG[0] * (1 - a));
      canvas[di + 1] = Math.round(shot[si + 1] * a + BG[1] * (1 - a));
      canvas[di + 2] = Math.round(shot[si + 2] * a + BG[2] * (1 - a));
      canvas[di + 3] = 255;
    }
  }
  return encodePng(CANVAS_W, CANVAS_H, canvas);
}

mkdirSync(OUT_DIR, { recursive: true });
const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.png'));
for (const f of files) {
  const png = makeStoreShot(readFileSync(resolve(SRC_DIR, f)));
  const outName = basename(f, '.png') + '.png';
  writeFileSync(resolve(OUT_DIR, outName), png);
  console.log(`wrote store/screenshots/${outName} (${CANVAS_W}x${CANVAS_H}, ${png.length} bytes)`);
}
