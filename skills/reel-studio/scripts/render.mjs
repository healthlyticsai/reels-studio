/**
 * Renders the reel, with settings read off the machine rather than guessed.
 *
 * The fixed `--concurrency=6` this replaces was the main reason renders crawled.
 * Each 1080x1920 Chromium tab peaks around 1.5GB, so six of them need ~9GB free.
 * On a 16GB laptop already running an editor and a browser that tips the machine
 * into swap, and a swapping render does not run slowly — it runs about ten times
 * slower, because every frame is now disk-bound. CPU count is almost never the
 * binding constraint on a laptop; memory is.
 *
 * It also fixes the other half of the problem, which is not knowing. A render
 * with no output is indistinguishable from a hung one, so this prints a heartbeat
 * with an ETA, and gives up loudly if nothing moves for a while instead of
 * sitting there for half an hour.
 *
 * Usage:
 *   node scripts/render.mjs                      # out/<folder>.mp4
 *   node scripts/render.mjs out/final.mp4
 *   node scripts/render.mjs --draft              # half scale, for checking motion
 *   node scripts/render.mjs --concurrency 2      # override the pick
 *   node scripts/render.mjs --stall-minutes 10   # patience for a silent render
 *   node scripts/render.mjs --max-minutes 40     # raise the hard ceiling
 *
 * For scale: a 60-second 1080x1920 reel is roughly two minutes on an M1 Pro, and
 * almost all of that is rendering frames rather than encoding them. There is no
 * flag that makes that dramatically faster — `--draft` halves the resolution and
 * is the right tool while you are still iterating on motion.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (argv[i + 1] ?? true);
};
const has = (name) => argv.includes(`--${name}`);

const draft = has("draft");
const out =
  argv.find((a) => !a.startsWith("--") && a.endsWith(".mp4")) ??
  path.join("out", `${path.basename(process.cwd())}${draft ? "-draft" : ""}.mp4`);

/* ── What the machine can actually give us ───────────────────────────────── */

const GB = 1024 ** 3;

/**
 * Memory a new process can actually claim. `os.freemem()` badly understates this
 * on macOS, where inactive and purgeable pages are available on demand but are
 * not counted as free.
 */
const availableGb = () => {
  if (process.platform === "darwin") {
    try {
      const out = execFileSync("vm_stat", { encoding: "utf8" });
      const pageSize = Number(out.match(/page size of (\d+)/)?.[1] ?? 4096);
      const pages = (name) => Number(out.match(new RegExp(`${name}:\\s+(\\d+)`))?.[1] ?? 0);
      const usable =
        pages("Pages free") + pages("Pages inactive") + pages("Pages speculative") + pages("Pages purgeable");
      return (usable * pageSize) / GB;
    } catch {
      /* fall through to the portable answer */
    }
  }
  return os.freemem() / GB;
};

/** How full swap already is, as a fraction. Null where we cannot tell. */
const swapPressure = () => {
  if (process.platform !== "darwin") return null;
  try {
    const usage = execFileSync("sysctl", ["-n", "vm.swapusage"], { encoding: "utf8" });
    const total = Number(usage.match(/total = ([\d.]+)M/)?.[1] ?? 0);
    const used = Number(usage.match(/used = ([\d.]+)M/)?.[1] ?? 0);
    return total ? used / total : null;
  } catch {
    return null;
  }
};

// Measured rather than assumed: at 1080x1920 with jpeg frames, a renderer tab
// peaks around 300-550MB, and the browser process around it adds a few hundred
// more. One gigabyte per tab is the honest allowance.
const PER_TAB_GB = draft ? 0.5 : 1.0;

const pick = () => {
  const cores = os.cpus().length;
  const free = availableGb();
  const swap = swapPressure();

  const byCpu = Math.max(1, Math.floor(cores / 2));
  const byMemory = Math.max(1, Math.floor(free / PER_TAB_GB));
  let n = Math.min(byCpu, byMemory, 8);
  let note = byMemory < byCpu ? `memory-bound (${free.toFixed(1)}GB free)` : `cpu-bound (${cores} cores)`;

  // Deep into swap means the machine is short of memory right now, not merely
  // tight. Backing off halfway costs a little time and avoids the cliff where
  // every frame becomes disk-bound and a two-minute render becomes thirty.
  if (swap !== null && swap > 0.75) {
    n = Math.max(2, Math.floor(n / 2));
    note = `swap is ${(swap * 100).toFixed(0)}% full — backing off to ${n} to stay out of it`;
  }

  return { n, note, cores, free, swap };
};

const chosen = pick();
const concurrency = Number(flag("concurrency", chosen.n));

/* ── Build the command ───────────────────────────────────────────────────── */

const args = [
  "remotion",
  "render",
  "Reel",
  out,
  "--codec=h264",
  `--concurrency=${concurrency}`,
];

if (draft) {
  // Half the linear resolution is a quarter of the pixels, which is the only
  // lever that changes the cost of the part that actually dominates.
  args.push("--crf=28", "--scale=0.5", "--jpeg-quality=70", "--x264-preset=veryfast");
} else {
  // `faster` against the default `medium` is invisible at crf 20 on a phone
  // screen and takes a chunk off the encode.
  //
  // Hardware acceleration is deliberately not requested: Remotion refuses it
  // whenever --crf is set, and prints a warning that reads like a fault. Encoding
  // is only around a tenth of the wall time here, so keeping the quality anchored
  // to crf is worth more than the seconds a bitrate-target encode would save.
  args.push("--crf=20", "--x264-preset=faster");
}

fs.mkdirSync(path.dirname(out), { recursive: true });

console.log(`Rendering ${draft ? "a draft " : ""}to ${out}`);
console.log(`  concurrency ${concurrency}  —  ${chosen.note}`);
if (chosen.swap !== null && chosen.swap > 0.75) {
  console.log("  Closing a browser or an editor before a render is worth more than any flag here.");
}
console.log();

/* ── Run it, with a heartbeat and a watchdog ─────────────────────────────── */

// Two different failures. A render that stops producing output is hung; a render
// that keeps producing output but has fallen off the memory cliff is thrashing,
// and will finish eventually — in half an hour. The first needs a stall timer,
// the second a ceiling, and without both one of them always gets through.
const STALL_MS = Number(flag("stall-minutes", 8)) * 60_000;
const MAX_MS = Number(flag("max-minutes", 25)) * 60_000;
const started = Date.now();
let lastOutput = Date.now();
let lastReport = 0;
let phase = "bundling";
let done = 0;
let total = 0;
let warned = false;

const mmss = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
};

const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"] });

const absorb = (buf) => {
  lastOutput = Date.now();
  const text = buf.toString();

  for (const line of text.split("\n")) {
    const rendered = line.match(/Rendered (\d+)\/(\d+)/);
    const encoded = line.match(/Encoded (\d+)\/(\d+)/);
    if (rendered) {
      phase = "rendering frames";
      done = Number(rendered[1]);
      total = Number(rendered[2]);
    } else if (encoded) {
      phase = "encoding";
      done = Number(encoded[1]);
      total = Number(encoded[2]);
    } else if (/Bundl/i.test(line)) {
      phase = "bundling";
    }
    // Anything that is not progress chatter is worth seeing — warnings, errors,
    // the final output line.
    const noise = /Rendered \d|Encoded \d|time remaining|^\s*$|Bundling|^\+/;
    if (!noise.test(line) && line.trim()) console.log(line.trimEnd());
  }

};

/**
 * The heartbeat runs on its own clock rather than off the child's output, because
 * the phase that most needs it is the one that prints nothing. A first bundle in
 * a fresh project is silent for over two minutes, which is indistinguishable from
 * a hang — and that indistinguishability is the actual bug being fixed here.
 */
const beat = () => {
  const now = Date.now();
  if (now - lastReport < 15_000) return;
  lastReport = now;

  const elapsed = now - started;
  const pct = total ? done / total : 0;
  const eta = pct > 0.02 ? `  eta ${mmss((elapsed / pct) * (1 - pct))}` : "";
  const quiet = now - lastOutput > 45_000 ? `  (quiet for ${mmss(now - lastOutput)})` : "";
  console.log(
    `  [${mmss(elapsed)}] ${phase}${total ? ` ${done}/${total} (${(pct * 100).toFixed(0)}%)` : ""}${eta}${quiet}`,
  );

  if (phase === "bundling" && elapsed > 60_000 && !warned) {
    warned = true;
    console.log("    First bundle in a new project takes a few minutes. This is normal once.");
    return;
  }

  // Say it early, while stopping and rerunning with --draft is still cheap.
  const projected = pct > 0.02 ? elapsed / pct : 0;
  if (!warned && projected > 12 * 60_000) {
    warned = true;
    console.log(
      `    ^ projects to about ${mmss(projected)} total, far slower than this should be.\n` +
        "      Worth stopping and rerunning with --draft, or closing something memory-hungry.",
    );
  }
};

child.stdout.on("data", absorb);
child.stderr.on("data", absorb);

const heartbeat = setInterval(beat, 5_000);

const advice = (headline) =>
  `\n${headline}\n\n` +
  "This is almost always memory rather than anything wrong with the reel.\n" +
  "In order:\n" +
  "  1. Check the machine:  sysctl vm.swapusage\n" +
  "     Swap near full means close a browser or an editor first — that is worth\n" +
  "     more than any flag below.\n" +
  "  2. node scripts/render.mjs --draft          half scale, ~35% quicker\n" +
  "  3. node scripts/render.mjs --concurrency 1  slowest per frame, lightest\n" +
  "  4. If it stalled while bundling, delete node_modules/.cache and rerun.\n" +
  "  5. Genuinely need longer:  node scripts/render.mjs --max-minutes 45\n";

const give_up = (headline) => {
  clearInterval(watchdog);
  clearInterval(heartbeat);
  child.kill("SIGKILL");
  console.error(advice(headline));
  if (fs.existsSync(out)) {
    // Remotion writes the muxed file only at the end, so a partial file here is
    // not usable — say so rather than leaving a stub that looks like a result.
    fs.rmSync(out, { force: true });
    console.error(`Removed the incomplete ${out}.\n`);
  }
  process.exit(1);
};

const watchdog = setInterval(() => {
  const now = Date.now();
  if (now - started > MAX_MS) {
    const got = total ? ` It reached ${done}/${total} frames.` : "";
    give_up(
      `Still going after ${Math.round(MAX_MS / 60000)} minutes — stopped.${got}\n` +
        "A 60-second reel should take two to four minutes, so something is starving it.",
    );
  }
  if (now - lastOutput > STALL_MS) {
    give_up(`No output at all for ${Math.round(STALL_MS / 60000)} minutes during "${phase}" — stopped.`);
  }
}, 30_000);

child.on("close", (code) => {
  clearInterval(watchdog);
  clearInterval(heartbeat);
  if (code !== 0) {
    console.error(`\nRender failed (exit ${code}).`);
    process.exit(code ?? 1);
  }

  const size = fs.existsSync(out) ? fs.statSync(out).size : 0;
  if (size < 100_000) {
    console.error(`\n${out} is only ${size} bytes — the render reported success but wrote nothing usable.`);
    process.exit(1);
  }

  console.log(`\nDone in ${mmss(Date.now() - started)}  —  ${out}  ${(size / 1024 / 1024).toFixed(1)}MB`);
  console.log("Check the delivered file, not just the composition:");
  console.log(`  node scripts/contact-sheet.mjs --video ${out} /tmp/final.png`);
});
