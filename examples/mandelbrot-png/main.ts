// Renders the Mandelbrot set to a PNG file. The PNG encoder is written here
// by hand on top of node:zlib (deflate + CRC-32), so the program needs no
// image library under Node.js or TypeNative.
//
//   node main.ts [width=1920] [height=1080] [out=mandelbrot.png]
//   ./mandelbrot [width] [height] [out]
import fs from 'node:fs';
import zlib from 'node:zlib';

const width = Number(process.argv[2] ?? '1920');
const height = Number(process.argv[3] ?? '1080');
const out = process.argv[4] ?? 'mandelbrot.png';
const maxIter = 500;

// Smooth escape-time colouring: a cosine palette indexed by the
// continuous iteration count, black inside the set
function colorAt(cx: number, cy: number): [number, number, number] {
  let x = 0;
  let y = 0;
  let i = 0;
  while (x * x + y * y <= 256 && i < maxIter) {
    const xt = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xt;
    i++;
  }
  if (i === maxIter) return [0, 0, 0];
  const smooth = i + 1 - Math.log2(Math.log2(x * x + y * y) / 2);
  const t = 0.55 + Math.sqrt(smooth) * 0.11;
  const r = Math.round(255 * (0.5 + 0.5 * Math.cos(6.2832 * (t + 0.0))));
  const g = Math.round(255 * (0.5 + 0.5 * Math.cos(6.2832 * (t + 0.1))));
  const b = Math.round(255 * (0.5 + 0.5 * Math.cos(6.2832 * (t + 0.2))));
  return [r, g, b];
}

// Raw PNG scanlines: each row is a filter byte (0 = none) then RGB triples
function render(): Uint8Array {
  const stride = width * 3 + 1;
  const pixels = new Uint8Array(stride * height);
  const scale = 3 / height;
  for (let py = 0; py < height; py++) {
    const cy = (py - height / 2) * scale;
    let offset = py * stride + 1;
    for (let px = 0; px < width; px++) {
      const cx = (px - width * 0.65) * scale;
      const [r, g, b] = colorAt(cx, cy);
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      offset += 3;
    }
  }
  return pixels;
}

// One PNG chunk: length, type, data, CRC-32 of type + data
function chunk(type: string, data: Uint8Array): Uint8Array {
  const typed = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) typed[i] = type.charCodeAt(i);
  typed.set(data, 4);
  const result = new Uint8Array(12 + data.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.length);
  result.set(typed, 4);
  view.setUint32(8 + data.length, zlib.crc32(typed));
  return result;
}

function encodePng(pixels: Uint8Array): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour RGB
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', new Uint8Array(zlib.deflateSync(pixels))),
    chunk('IEND', new Uint8Array(0))
  ];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

const t0 = performance.now();
const pixels = render();
const t1 = performance.now();
const png = encodePng(pixels);
fs.writeFileSync(out, png);
const t2 = performance.now();
console.log(`Rendered ${width}x${height} in ${Math.round(t1 - t0)} ms, encoded ${png.length} bytes in ${Math.round(t2 - t1)} ms -> ${out}`);
