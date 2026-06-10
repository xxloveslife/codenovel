// 生成 128x128 的 CodeNovel 图标（无第三方依赖：Node zlib + 手写 PNG 编码）。
// 设计：深色圆角底 + 几行不等长「代码/正文」横线 + 右侧青色书签。
import zlib from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZE = 128;
const SS = 3; // 超采样倍数，抗锯齿
const R = SIZE * SS;
const hi = new Uint8Array(R * R * 4);

const BG = [30, 30, 46];
const PURPLE = [197, 134, 192];
const GREEN = [106, 153, 85];
const BLUE = [86, 156, 214];
const TEAL = [78, 201, 176];

function setHi(x, y, col) {
  if (x < 0 || y < 0 || x >= R || y >= R) return;
  const i = (y * R + x) * 4;
  hi[i] = col[0];
  hi[i + 1] = col[1];
  hi[i + 2] = col[2];
  hi[i + 3] = col.length > 3 ? col[3] : 255;
}

/** 在 128 设计坐标系画圆角矩形（内部换算到超采样尺度） */
function fillRoundRect(X, Y, W, H, Rr, col) {
  const x = X * SS, y = Y * SS, w = W * SS, h = H * SS, r = Rr * SS;
  const x1 = x + r, x2 = x + w - r, y1 = y + r, y2 = y + h - r;
  const corners = [[x1, y1], [x2, y1], [x1, y2], [x2, y2]];
  for (let py = Math.floor(y); py < y + h; py++) {
    for (let px = Math.floor(x); px < x + w; px++) {
      let inside = false;
      if (px >= x && px < x + w && py >= y1 && py < y2) inside = true;
      else if (px >= x1 && px < x2 && py >= y && py < y + h) inside = true;
      else {
        for (const [cx, cy] of corners) {
          const dx = px - cx + 0.5, dy = py - cy + 0.5;
          if (dx * dx + dy * dy <= r * r) { inside = true; break; }
        }
      }
      if (inside) setHi(px, py, col);
    }
  }
}

const hLine = (x, y, w, col) => fillRoundRect(x, y, w, 7, 3.5, col);

// —— 绘制 ——
fillRoundRect(0, 0, 128, 128, 26, BG);
hLine(22, 30, 46, PURPLE);
hLine(22, 46, 60, GREEN);
hLine(34, 62, 44, GREEN);
hLine(22, 78, 54, GREEN);
hLine(34, 94, 36, GREEN);
hLine(22, 110, 28, BLUE);

// 书签 + 底部 V 形缺口
fillRoundRect(94, 8, 14, 46, 2, TEAL);
const bx = 94 * SS, bw = 14 * SS, cxb = bx + bw / 2;
const notchTop = (8 + 46 - 9) * SS, notchBot = (8 + 46) * SS, half = bw / 2;
for (let py = Math.floor(notchTop); py < notchBot; py++) {
  for (let px = bx; px < bx + bw; px++) {
    const t = (py - notchTop) / (notchBot - notchTop);
    if (Math.abs(px - cxb) < t * half) hi[(py * R + px) * 4 + 3] = 0;
  }
}

// —— 降采样到 128（按 alpha 预乘平均） ——
const out = new Uint8Array(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * R + (x * SS + dx)) * 4;
        const al = hi[i + 3];
        r += hi[i] * al; g += hi[i + 1] * al; b += hi[i + 2] * al; a += al;
      }
    }
    const oi = (y * SIZE + x) * 4;
    if (a > 0) { out[oi] = Math.round(r / a); out[oi + 1] = Math.round(g / a); out[oi + 2] = Math.round(b / a); }
    out[oi + 3] = Math.round(a / (SS * SS));
  }
}

// —— PNG 编码 ——
const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    raw[p++] = out[i]; raw[p++] = out[i + 1]; raw[p++] = out[i + 2]; raw[p++] = out[i + 3];
  }
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync('images', { recursive: true });
writeFileSync('images/icon.png', png);
console.log(`images/icon.png 已生成（${png.length} 字节）`);
