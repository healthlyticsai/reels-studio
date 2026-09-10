/** Confirms the hand-off files actually landed and are real audio. */
import fs from "fs";
import path from "path";

const project = process.argv[2] || ".";
let ok = true;

for (const [name, minKb] of [
  ["vo.mp3", 40],
  ["bg.mp3", 40],
]) {
  const file = path.join(project, "assets", "audio", name);
  if (!fs.existsSync(file)) {
    console.log(`MISSING: ${file}`);
    ok = false;
    continue;
  }
  const kb = fs.statSync(file).size / 1024;
  const head = fs.readFileSync(file, { start: 0, end: 3 });
  const isMp3 = head[0] === 0x49 || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
  if (kb < minKb) {
    console.log(`TOO SMALL: ${file} is ${kb.toFixed(0)}KB — probably not a real recording`);
    ok = false;
  } else if (!isMp3) {
    console.log(`NOT MP3: ${file} does not start with an MP3 header`);
    ok = false;
  } else {
    console.log(`OK: ${name} (${kb.toFixed(0)}KB)`);
  }
}

if (!ok) {
  console.log("\nBoth files are required before phase 3 can start.");
  process.exit(1);
}
console.log("\nBoth audio files present. Ready to build.");
