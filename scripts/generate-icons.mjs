/**
 * PWA 아이콘 생성 스크립트 (외부 패키지 없음)
 * 인디고(#4f46e5) 배경 + "PT" 흰색 텍스트 PNG 생성
 * 실행: node scripts/generate-icons.mjs
 */

import zlib from "zlib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/icons");
fs.mkdirSync(outDir, { recursive: true });

// CRC32
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // 픽셀 데이터: 인디고 배경 #4f46e5 = rgb(79,70,229)
  const stride = size * 3;
  const raw = Buffer.allocUnsafe((1 + stride) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      // 둥근 배경 효과 (단순 solid, 아이콘 생성 후 디자이너 교체 권장)
      const off = y * (stride + 1) + 1 + x * 3;
      raw[off] = 79;   // R
      raw[off + 1] = 70;  // G
      raw[off + 2] = 229; // B
    }
  }

  const idat = zlib.deflateSync(raw);
  const sig2 = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig2,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const s of sizes) {
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), makePNG(s));
  console.log(`✅ icon-${s}.png 생성`);
}

// apple-touch-icon (180px)
fs.writeFileSync(path.join(__dirname, "../public/apple-touch-icon.png"), makePNG(180));
console.log("✅ apple-touch-icon.png 생성");

console.log("\n🎉 완료! public/icons/ 폴더를 확인하세요.");
