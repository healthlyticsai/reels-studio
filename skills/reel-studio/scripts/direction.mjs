/**
 * Picks the creative direction for one reel.
 *
 * This is the thing that stops every reel looking like the last one. It draws an
 * art direction, a set of kinetic type systems, an edit language, motion motifs,
 * a camera language, a narrative arc and an opening gambit out of
 * references/creative-systems.json, and writes the result to direction.json in
 * the project. brief.mjs injects that into the Gemini prompt, generate-assets.mjs
 * uses it for the art direction of every image, and the scene code reads it for
 * the backdrop variant.
 *
 * Draws are history-aware: anything used by the last few reels on this machine is
 * held out of the pool, so consecutive reels cannot land on the same look.
 *
 * Usage:
 *   node direction.mjs --project ./my-reel
 *   node direction.mjs --project ./my-reel --art night-data --arc myth-bust
 *   node direction.mjs --project ./my-reel --seed 42        # reproducible
 *   node direction.mjs --list
 */
import fs from "fs";
import os from "os";
import path from "path";
import { SKILL_DIR } from "./env.mjs";

const args = (() => {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith("--") ? next : true;
  }
  return out;
})();

const systemsPath = path.join(SKILL_DIR, "references", "creative-systems.json");
const SYSTEMS = JSON.parse(fs.readFileSync(systemsPath, "utf8"));

if (args.list) {
  for (const [group, items] of Object.entries(SYSTEMS)) {
    if (!Array.isArray(items)) continue;
    console.log(`\n${group}`);
    for (const it of items) console.log(`  ${it.id.padEnd(22)} ${it.name ?? it.how ?? ""}`);
  }
  process.exit(0);
}

/* ── History ─────────────────────────────────────────────────────────────── */

const HOME = process.env.REEL_STUDIO_HOME || path.join(os.homedir(), ".reel-studio");
const HISTORY = path.join(HOME, "history.json");

const readHistory = () => {
  try {
    return JSON.parse(fs.readFileSync(HISTORY, "utf8"));
  } catch {
    return [];
  }
};

const history = readHistory();

/** Ids used by the last `n` reels, which this draw will avoid. */
const recent = (field, n) =>
  new Set(
    history
      .slice(-n)
      .flatMap((h) => (Array.isArray(h[field]) ? h[field] : [h[field]]))
      .filter(Boolean),
  );

/* ── Seeded RNG, so --seed reproduces a draw exactly ─────────────────────── */

const seed = args.seed ? Number(args.seed) >>> 0 : (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;

let state = seed || 1;
const rnd = () => {
  // mulberry32 — small, fast, good enough for picking from a list.
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = (list, { avoid = new Set(), forced } = {}) => {
  if (forced) {
    const hit = list.find((x) => x.id === forced);
    if (!hit) {
      console.error(`Unknown id "${forced}". Run --list to see the options.`);
      process.exit(1);
    }
    return hit;
  }
  // Holding out recent picks is the whole point — but never hold out so much
  // that there is nothing left to choose from.
  const pool = list.filter((x) => !avoid.has(x.id));
  const from = pool.length ? pool : list;
  return from[Math.floor(rnd() * from.length)];
};

const pickMany = (list, count, { avoid = new Set(), forced } = {}) => {
  if (forced) {
    const ids = String(forced).split(",").map((s) => s.trim());
    return ids.map((id) => pick(list, { forced: id }));
  }
  const chosen = [];
  const taken = new Set();
  for (let i = 0; i < count; i++) {
    const next = pick(list, { avoid: new Set([...avoid, ...taken]) });
    chosen.push(next);
    taken.add(next.id);
  }
  return chosen;
};

/* ── The draw ────────────────────────────────────────────────────────────── */

const art = pick(SYSTEMS.artDirections, { avoid: recent("art", 4), forced: args.art });
const arc = pick(SYSTEMS.narrativeArcs, { avoid: recent("arc", 3), forced: args.arc });
const edit = pick(SYSTEMS.editLanguages, { avoid: recent("edit", 3), forced: args.edit });
const camera = pick(SYSTEMS.cameraLanguages, { avoid: recent("camera", 2), forced: args.camera });
const gambit = pick(SYSTEMS.openingGambits, { avoid: recent("gambit", 3), forced: args.gambit });

// Four type systems, not one: a reel that animates every headline the same way
// is the single loudest tell that it came off a template. The first is the
// anchor; scenes rotate through the rest.
const typeSystems = pickMany(SYSTEMS.typeSystems, 4, {
  avoid: recent("typeSystems", 2),
  forced: args.type,
});

const motifs = pickMany(SYSTEMS.motionMotifs, 3, {
  avoid: recent("motifs", 2),
  forced: args.motifs,
});

const direction = {
  seed,
  drawnAt: new Date().toISOString(),
  artDirection: art,
  narrativeArc: arc,
  editLanguage: edit,
  cameraLanguage: camera,
  openingGambit: gambit,
  typeSystems,
  motionMotifs: motifs,
  transitionPalette: art.transitions,
};

/* ── Write ───────────────────────────────────────────────────────────────── */

const project = args.project && args.project !== true ? path.resolve(args.project) : null;

if (project) {
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "direction.json"), JSON.stringify(direction, null, 2));

  fs.mkdirSync(HOME, { recursive: true });
  history.push({
    slug: path.basename(project),
    at: direction.drawnAt,
    seed,
    art: art.id,
    arc: arc.id,
    edit: edit.id,
    camera: camera.id,
    gambit: gambit.id,
    typeSystems: typeSystems.map((t) => t.id),
    motifs: motifs.map((m) => m.id),
  });
  // Keep the tail only; the avoid-window never looks further back than this.
  fs.writeFileSync(HISTORY, JSON.stringify(history.slice(-40), null, 2));
}

if (args.json) {
  console.log(JSON.stringify(direction, null, 2));
  process.exit(0);
}

const line = (label, value) => console.log(`  ${label.padEnd(16)}${value}`);

console.log("\nCREATIVE DIRECTION FOR THIS REEL");
console.log("─".repeat(72));
line("Look", `${art.name} — ${art.summary}`);
line("Arc", `${arc.name}: ${arc.shape}`);
line("Opens with", gambit.how);
line("Edit", `${edit.name} — ${edit.how} (${edit.pace})`);
line("Camera", `${camera.name} — ${camera.how}`);
line("Type", typeSystems.map((t) => t.name).join(" · "));
line("Motifs", motifs.map((m) => `${m.name} (${m.component})`).join(" · "));
line("Cuts", art.transitions.join(", "));
line("Backdrop", art.backdrop);
line("Seed", `${seed}   (reproduce with --seed ${seed})`);
console.log();
if (project) console.log(`Wrote ${path.join(project, "direction.json")}\n`);
