const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  const crcVal = zlib.crc32(typeAndData);
  crc.writeUInt32BE(crcVal, 0);

  return Buffer.concat([len, typeAndData, crc]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // Raw scanlines: each row has 1 filter byte (0) + width * 4 bytes RGBA
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center for rounded circle/squircle
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default transparent
      let r = 0, g = 0, b = 0, a = 0;

      // Rounded container (Smooth antialiased circle)
      if (dist <= radius + 1) {
        // Vibrant blue gradient (deep blue to bright cyan-blue)
        const t = (x + y) / (width + height);
        r = Math.round(30 + t * 25);   // ~30 to 55
        g = Math.round(110 + t * 50);  // ~110 to 160
        b = Math.round(235 + t * 20);  // ~235 to 255
        a = 255;

        // Chat bubble shape
        // Bubble body: ellipse centered slightly above middle
        const bCx = center;
        const bCy = center - size * 0.04;
        const bRx = size * 0.28;
        const bRy = size * 0.24;
        const bNorm = (Math.pow(x - bCx, 2) / Math.pow(bRx, 2)) + (Math.pow(y - bCy, 2) / Math.pow(bRy, 2));

        // Bubble tail (bottom left corner)
        const inTail = (x >= center - size * 0.22 && x <= center - size * 0.08 &&
                        y >= center + size * 0.12 && y <= center + size * 0.26 &&
                        (x - (center - size * 0.08)) < (y - (center + size * 0.12)) * 1.2);

        if (bNorm <= 1.0 || inTail) {
          // White chat bubble
          r = 255;
          g = 255;
          b = 255;

          // Heart inside chat bubble
          // Heart formula: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
          const hScale = size * 0.14;
          const hx = (x - bCx) / hScale;
          const hy = -(y - (bCy - size * 0.02)) / hScale; // Invert y for math coord
          const heartEq = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3);

          if (heartEq <= 0) {
            // Sweet vibrant pink/red heart #f43f5e
            r = 244;
            g = 63;
            b = 94;
          }
        }

        // Antialias outer circle edge
        if (dist > radius) {
          const alphaFactor = 1 - (dist - radius);
          a = Math.round(255 * Math.max(0, Math.min(1, alphaFactor)));
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk (zlib compressed)
  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const p192 = generatePng(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), p192);
console.log('✓ Generated public/icon-192.png (' + p192.length + ' bytes)');

// Generate 512x512
const p512 = generatePng(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), p512);
console.log('✓ Generated public/icon-512.png (' + p512.length + ' bytes)');
