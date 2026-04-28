import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

// Minimal PNG encoder — no dependencies
function createPng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const buf = Buffer.alloc(4 + type.length + data.length + 4);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4);
    data.copy(buf, 4 + type.length);
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeInt32BE(crc, buf.length - 4);
    return buf;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw image data with filter byte 0 per row
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 3;
      const di = y * (1 + width * 3) + 1 + x * 3;
      raw[di] = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
    }
  }

  const compressed = deflateSync(raw);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", iend),
  ]);
}

// CRC32
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

// Draw the Kadence K logo (simplified from the SVG path)
function drawLogo(pixels, size, logoScale, offsetX, offsetY) {
  // The SVG viewBox for the logo path is roughly 0-17.2 x 0-14.5
  // Three chevron stripes making the Solana-style K
  const stripes = [
    // Top stripe (going right-to-left at top)
    { x1: 0.91, y1: 3.18, x2: 3.61, y2: 0.34, x3: 17.09, y3: 0.14, x4: 14.39, y4: 3.49, fillY: 0 },
    // Middle stripe
    { x1: 0.93, y1: 6.06, x2: 3.63, y2: 8.9, x3: 16.86, y3: 9.09, x4: 17.09, y4: 8.58, fillY: 5.5 },
    // Bottom stripe
    { x1: 0.93, y1: 13.98, x2: 3.63, y2: 11.14, x3: 16.86, y3: 10.95, x4: 17.08, y4: 11.46, fillY: 10.9 },
  ];

  // Draw each stripe as a filled parallelogram
  for (const stripe of stripes) {
    const points = [
      [stripe.x1, stripe.y1 + (stripe.fillY > 5 ? 0.5 : 0)],
      [stripe.x2, stripe.y2],
      [stripe.x3, stripe.y3],
      [stripe.x4, stripe.y4],
    ];

    // Scale and offset
    const scaled = points.map(([x, y]) => [
      Math.round(x * logoScale + offsetX),
      Math.round(y * logoScale + offsetY),
    ]);

    // Fill using scanline
    const minY = Math.max(0, Math.min(...scaled.map((p) => p[1])));
    const maxY = Math.min(size - 1, Math.max(...scaled.map((p) => p[1])));

    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0; i < scaled.length; i++) {
        const [x1, y1] = scaled[i];
        const [x2, y2] = scaled[(i + 1) % scaled.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          const t = (y - y1) / (y2 - y1);
          intersections.push(Math.round(x1 + t * (x2 - x1)));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const xStart = Math.max(0, intersections[i]);
        const xEnd = Math.min(size - 1, intersections[i + 1]);
        for (let x = xStart; x <= xEnd; x++) {
          const idx = (y * size + x) * 3;
          pixels[idx] = 255;
          pixels[idx + 1] = 255;
          pixels[idx + 2] = 255;
        }
      }
    }
  }
}

function generateIcon(size, maskable) {
  const pixels = Buffer.alloc(size * size * 3, 0); // Black background (0D0D0D approx)

  // Fill with #0D0D0D
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = 13;
    pixels[i * 3 + 1] = 13;
    pixels[i * 3 + 2] = 13;
  }

  // For maskable icons, logo sits in the center 60% safe zone
  // For regular icons, logo can use more space
  const logoPadding = maskable ? size * 0.25 : size * 0.15;
  const availableWidth = size - logoPadding * 2;
  const availableHeight = size - logoPadding * 2;

  // Logo SVG bounds: ~17.2 wide x ~14.5 tall
  const logoAspect = 17.2 / 14.5;
  let logoW, logoH;
  if (availableWidth / availableHeight > logoAspect) {
    logoH = availableHeight;
    logoW = logoH * logoAspect;
  } else {
    logoW = availableWidth;
    logoH = logoW / logoAspect;
  }

  const scale = logoW / 17.2;
  const offsetX = (size - logoW) / 2;
  const offsetY = (size - logoH) / 2;

  drawLogo(pixels, size, scale, offsetX, offsetY);

  return createPng(size, size, pixels);
}

// Generate all three icons
writeFileSync("public/icons/icon-192.png", generateIcon(192, false));
writeFileSync("public/icons/icon-512.png", generateIcon(512, false));
writeFileSync("public/icons/icon-maskable-512.png", generateIcon(512, true));

console.log("Generated icon-192.png, icon-512.png, icon-maskable-512.png");
