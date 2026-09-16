/**
 * Phase 1a: gathers real-world context on the topic before anything is written.
 *
 * A one-line topic is not enough material to make a distinctive reel from — with
 * nothing but "referral letters" to go on, the model reaches for the same generic
 * doctor-at-a-desk imagery every time. This step grounds the brief in the actual
 * world of the topic: who lives in it, what the numbers are, what objects and
 * rooms and moments belong to it, what the audience would push back on.
 *
 * The visual sections matter as much as the factual ones — `visualMotifs` and
 * `humanMoments` are what the asset manifest is built out of downstream.
 *
 * Usage:
 *   node research.mjs --topic "..." --project ./my-reel [--notes "..."]
 *   node research.mjs --topic "..." --project ./my-reel --no-search   # no grounding
 */
import fs from "fs";
import path from "path";
import { requireKey } from "./env.mjs";
import { callGemini, extractJson } from "./gemini.mjs";

const args = (() => {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    out[argv[i].slice(2)] = next && !next.startsWith("--") ? next : true;
  }
  return out;
})();

if (!args.topic) {
  console.error('Usage: node research.mjs --topic "..." --project ./slug [--notes "..."]');
  process.exit(1);
}

const project = path.resolve(args.project && args.project !== true ? args.project : ".");
const key = requireKey(project);
const search = args["no-search"] !== true;

const prompt = `You are a documentary researcher briefing a motion-graphics director who has to
make a 60-second vertical explainer about the topic below. They have never worked in this
world. Everything distinctive about the finished film will come from what you hand them.

TOPIC: ${args.topic}

WHAT THE COMMISSIONER ALREADY TOLD US: ${args.notes || "Nothing beyond the topic."}

${
  search
    ? "Search for current, specific, verifiable material. Prefer primary sources and recent figures, and say when a number is contested or dated."
    : "Work from what you know. Mark anything you are not confident about."
}

Return ONE JSON object and nothing else — no prose before or after, no markdown fence:

{
  "summary": "Three or four sentences a director could read to understand what this actually is and why it matters. Plain language, no marketing.",
  "audience": {
    "who": "The specific person this reel is for — role, setting, seniority.",
    "theirDay": "What a normal working day actually looks like for them, concretely.",
    "vocabulary": ["Words and phrases these people genuinely use, so the script sounds native"],
    "whatTheyAlreadyBelieve": "The assumption the script will either confirm or break."
  },
  "concreteFacts": [
    { "claim": "A specific, checkable statement, ideally with a number in it.", "number": "the figure on its own, or null", "source": "who says so", "confidence": "high | medium | low" }
  ],
  "painPoints": ["Specific frustrations, described as moments rather than categories"],
  "objections": ["What a sceptical member of this audience would say back to the claim"],
  "competitors": [{ "name": "...", "angle": "How they position, and where the gap is" }],
  "jargon": [{ "term": "...", "meaning": "...", "sayInsteadOnCamera": "The plain-English version for the voiceover" }],
  "visualMotifs": [
    { "thing": "A real physical object, screen, document, room or artefact from this world", "why": "What it proves or evokes on screen" }
  ],
  "humanMoments": [
    { "moment": "One specific human moment worth photographing — a posture, an expression, a small physical action at a particular point in the day", "reads": "What the viewer understands from it instantly" }
  ],
  "surprising": ["Facts that would make someone inside this world stop scrolling, because even they did not know"],
  "metaphors": ["Concrete analogies that could be built as motion graphics rather than said out loud"],
  "avoid": ["Claims that would overreach, mislead, or need regulatory or legal review in this field"]
}

Requirements: at least 8 entries in visualMotifs and at least 6 in humanMoments — the asset
list for the film is built directly from them, so thin answers here produce a generic film.
Every visualMotif must be something that could actually be photographed. No abstractions like
"efficiency" or "trust", and no user-interface mockups — those get built as animation, not shot.`;

console.log(`Researching: ${args.topic}${search ? " (with web grounding)" : ""}`);

const { text, sources } = await callGemini({ key, prompt, temperature: 0.7, json: !search, search });

let research;
try {
  research = extractJson(text);
} catch (err) {
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "research.raw.txt"), text);
  throw new Error(`${err.message} — raw response saved to research.raw.txt`);
}

research.sources = sources;
research.topic = args.topic;

fs.mkdirSync(project, { recursive: true });
fs.writeFileSync(path.join(project, "research.json"), JSON.stringify(research, null, 2));

/* ── Human-readable version ──────────────────────────────────────────────── */

const md = ["# Research — " + args.topic, "", research.summary ?? "", ""];

const section = (title, lines) => {
  if (!lines?.length) return;
  md.push(`## ${title}`, "", ...lines, "");
};

if (research.audience) {
  section("Audience", [
    `**Who.** ${research.audience.who}`,
    "",
    `**Their day.** ${research.audience.theirDay}`,
    "",
    `**What they already believe.** ${research.audience.whatTheyAlreadyBelieve}`,
    "",
    `**Their words.** ${(research.audience.vocabulary ?? []).join(", ")}`,
  ]);
}

section(
  "Facts",
  (research.concreteFacts ?? []).map(
    (f) => `- ${f.claim}  \n  *${f.source ?? "unsourced"} · confidence: ${f.confidence ?? "?"}*`,
  ),
);
section("Pain points", (research.painPoints ?? []).map((p) => `- ${p}`));
section("Objections", (research.objections ?? []).map((o) => `- ${o}`));
section("Competitors", (research.competitors ?? []).map((c) => `- **${c.name}** — ${c.angle}`));
section(
  "Language",
  (research.jargon ?? []).map((j) => `- **${j.term}** — ${j.meaning}. On camera: "${j.sayInsteadOnCamera}"`),
);
section("Visual motifs", (research.visualMotifs ?? []).map((v) => `- **${v.thing}** — ${v.why}`));
section("Human moments", (research.humanMoments ?? []).map((h) => `- **${h.moment}** — reads as ${h.reads}`));
section("Surprising", (research.surprising ?? []).map((s) => `- ${s}`));
section("Metaphors to build", (research.metaphors ?? []).map((m) => `- ${m}`));
section("Do not claim", (research.avoid ?? []).map((a) => `- ${a}`));
section("Sources", sources.map((s) => `- [${s.title}](${s.uri})`));

fs.writeFileSync(path.join(project, "RESEARCH.md"), md.join("\n"));

console.log(
  `  ${(research.concreteFacts ?? []).length} facts · ` +
    `${(research.visualMotifs ?? []).length} visual motifs · ` +
    `${(research.humanMoments ?? []).length} human moments · ` +
    `${sources.length} sources`,
);
console.log(`Wrote ${path.join(project, "RESEARCH.md")} and research.json`);
