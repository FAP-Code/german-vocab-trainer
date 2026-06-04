/**
 * generate-icons.cjs
 * Creates PNG icons for the HumScore PWA using pure Node.js (no native deps).
 * Produces a deep-indigo background with a white music-note silhouette.
 *
 * Run: node scripts/generate-icons.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Minimal PNG encoder ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function encodePNG(width, height, pixels /* Uint8Array RGBA */) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  const ihdr = chunk('IHDR', ihdrData);

  // Build raw scanlines (filter byte 0 = None per row)
  const scanlines = Buffer.alloc((1 + width * 4) * height);
  for (let y = 0; y < height; y++) {
    scanlines[(1 + width * 4) * y] = 0; // filter = None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = (1 + width * 4) * y + 1 + x * 4;
      scanlines[dst]     = pixels[src];
      scanlines[dst + 1] = pixels[src + 1];
      scanlines[dst + 2] = pixels[src + 2];
      scanlines[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(scanlines, { level: 6 });
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= width || y < 0 || y >= width) return;
  const i = (y * width + x) * 4;
  const fa = a / 255;
  pixels[i]     = Math.round(pixels[i]     * (1 - fa) + r * fa);
  pixels[i + 1] = Math.round(pixels[i + 1] * (1 - fa) + g * fa);
  pixels[i + 2] = Math.round(pixels[i + 2] * (1 - fa) + b * fa);
  pixels[i + 3] = Math.min(255, pixels[i + 3] + a);
}

function fillEllipse(pixels, width, cx, cy, rx, ry, r, g, b) {
  const x0 = Math.floor(cx - rx - 1);
  const x1 = Math.ceil(cx + rx + 1);
  const y0 = Math.floor(cy - ry - 1);
  const y1 = Math.ceil(cy + ry + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const dist = dx * dx + dy * dy;
      if (dist <= 1.0) {
        // Anti-alias at edge
        const aa = dist > 0.85 ? Math.max(0, (1 - dist) / 0.15) : 1;
        setPixel(pixels, width, x, y, r, g, b, Math.round(aa * 255));
      }
    }
  }
}

function fillRect(pixels, size, x0, y0, x1, y1, r, g, b) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) {
      setPixel(pixels, size, x, y, r, g, b);
    }
  }
}

function drawLine(pixels, size, x0, y0, x1, y1, thickness, r, g, b) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + t * (x1 - x0);
    const y = y0 + t * (y1 - y0);
    for (let dx = -thickness / 2; dx <= thickness / 2; dx += 0.5) {
      for (let dy = -thickness / 2; dy <= thickness / 2; dy += 0.5) {
        setPixel(pixels, size, x + dx, y + dy, r, g, b);
      }
    }
  }
}

// ─── Icon drawing ─────────────────────────────────────────────────────────────

function createIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Background: radial gradient from indigo-700 (#4338ca) center to indigo-900 (#1e1b4b)
  const cx = size / 2, cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy) / (size * 0.7);
      const t = Math.min(1, dist);
      // Interpolate #4338ca → #1e1b4b
      const r = Math.round(67  + (30  - 67)  * t);
      const g = Math.round(56  + (27  - 56)  * t);
      const b = Math.round(202 + (75  - 202) * t);
      const i = (y * size + x) * 4;
      pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255;
    }
  }

  // Rounded rect mask for maskable icons (optional — skip for simplicity)

  // Draw music note scaled to icon size
  const s = size / 192;

  // Stem (vertical rect)
  const stemX  = 110 * s;
  const stemW  = Math.max(4, 6 * s);
  const stemY0 = 38 * s;
  const stemY1 = 145 * s;
  fillRect(pixels, size, stemX - stemW/2, stemY0, stemX + stemW/2, stemY1, 255, 255, 255);

  // Note head (ellipse)
  fillEllipse(pixels, size, 88 * s, 148 * s, 28 * s, 19 * s, 255, 255, 255);

  // Flag (curved line from top of stem)
  for (let t = 0; t <= 1; t += 0.004) {
    const fx = stemX + 40 * s * Math.sin(t * Math.PI * 0.9);
    const fy = stemY0 + t * 52 * s;
    drawLine(pixels, size, fx - 0.5, fy, fx + 0.5, fy, Math.max(3, 3 * s), 255, 255, 255);
  }

  return encodePNG(size, size, pixels);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const sz of sizes) {
  const png = createIcon(sz);
  const fname = `icon-${sz}x${sz}.png`;
  fs.writeFileSync(path.join(iconsDir, fname), png);
  console.log(`  ✓ ${fname}`);
}

// apple-touch-icon (180×180)
const apple = createIcon(180);
fs.writeFileSync(path.join(__dirname, '../public/apple-touch-icon.png'), apple);
console.log('  ✓ apple-touch-icon.png');

// screenshot placeholder (390×844, just a colored rect)
const shotW = 390, shotH = 844;
const shotPx = new Uint8Array(shotW * shotH * 4);
for (let i = 0; i < shotW * shotH; i++) {
  shotPx[i*4] = 15; shotPx[i*4+1] = 23; shotPx[i*4+2] = 42; shotPx[i*4+3] = 255;
}
fs.writeFileSync(
  path.join(iconsDir, 'screenshot-1.png'),
  encodePNG(shotW, shotH, shotPx),
);
console.log('  ✓ screenshot-1.png');

console.log('\nAll icons generated successfully!');
