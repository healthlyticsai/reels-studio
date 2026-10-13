/**
 * Reads the pixel size of a PNG, JPEG or WebP from its header, with no
 * dependencies — the demo plan needs every screenshot's size before npm
 * install has run, so zoom boxes can be turned into exact pixels.
 *
 * Usage as a script: node image-size.mjs <file>...
 */
import fs from "fs";

export const imageSize = (file) => {
  const b = fs.readFileSync(file);

  // PNG: IHDR is always the first chunk.
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type: "png" };
  }

  // JPEG: walk the markers to the first start-of-frame.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (sof) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5), type: "jpeg" };
      i += 2 + len;
    }
  }

  // WebP: lossy (VP8 ), lossless (VP8L) and extended (VP8X).
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, type: "webp" };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, type: "webp" };
    }
    if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1, type: "webp" };
  }

  throw new Error(`Unrecognised image format: ${file}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const s = imageSize(f);
    console.log(`${f}  ${s.width}×${s.height}  ${s.type}`);
  }
}
