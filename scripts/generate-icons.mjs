import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const iconsDir = join(import.meta.dirname, "..", "src-tauri", "icons");
mkdirSync(iconsDir, { recursive: true });

const accentBlue = "#14cdd0";
const bg = "#1a1a2e";

async function createIcon(size) {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="${bg}"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
      font-family="'Share Tech Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      font-weight="700" font-size="${Math.round(size * 0.34)}" fill="${accentBlue}">&lt;/&gt;</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Generate PNGs
for (const size of [32, 128, 256]) {
  const buf = await createIcon(size);
  const name = size === 256 ? "128x128@2x.png" : `${size}x${size}.png`;
  writeFileSync(join(iconsDir, name), buf);
  console.log(`Created ${name}`);
}

// Generate .icns placeholder (macOS) - just use the 256px PNG
const buf256 = await createIcon(256);
writeFileSync(join(iconsDir, "icon.icns"), buf256);
console.log("Created icon.icns (placeholder)");

// Generate .ico (Windows) - ICO format with multiple sizes
const sizes = [16, 32, 48, 256];
const images = [];
for (const s of sizes) {
  images.push(await createIcon(s));
}

// Build a minimal ICO file
function buildIco(pngBuffers, iconSizes) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // count

  // Each directory entry: 16 bytes
  const dirSize = 16 * pngBuffers.length;
  let dataOffset = 6 + dirSize;
  const entries = [];
  for (let i = 0; i < pngBuffers.length; i++) {
    const entry = Buffer.alloc(16);
    const s = iconSizes[i];
    entry.writeUInt8(s >= 256 ? 0 : s, 0); // width (0 = 256)
    entry.writeUInt8(s >= 256 ? 0 : s, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8); // size
    entry.writeUInt32LE(dataOffset, 12); // offset
    dataOffset += pngBuffers[i].length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const ico = buildIco(images, sizes);
writeFileSync(join(iconsDir, "icon.ico"), ico);
console.log("Created icon.ico");

console.log("All icons generated!");
