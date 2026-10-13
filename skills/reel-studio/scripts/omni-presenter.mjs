/**
 * Presenter engine "omni": Gemini Omni Flash films the presenter delivering the
 * whole script as one continuous take, and that take's own audio becomes the
 * demo's voiceover.
 *
 * This inverts the Higgsfield pipeline on purpose. Omni cannot lip-sync to a
 * supplied audio file ("uploading audio references is unsupported"), but it
 * generates voice and mouth together, so its own sync is native. Keeping one
 * take — a first clip, then extensions of it — keeps the voice and the face
 * consistent from start to finish. demo-timing.mjs then plays that take at the
 * same absolute frame wherever the presenter is on screen, so it is in sync by
 * construction, and no slicing or clip-by-clip generation is needed.
 *
 * The trade-offs, stated plainly: the voice is Omni's, not your Chirp or
 * ElevenLabs voice; Omni may paraphrase a word (demo-timing's match score will
 * say so); and a take is capped at about 40 seconds. Good for a proof of
 * concept; Higgsfield remains the production path.
 *
 * Outputs:
 *   assets/avatar/raw/omni-take.mp4   the take as Omni returned it
 *   public/avatar/take.mp4            30fps, muted — the picture the scenes play
 *   assets/audio/vo.mp3               the take's audio — the demo's clock
 *   omni-take.json                    interaction ids, segments, settings
 *
 * Usage:
 *   node scripts/omni-presenter.mjs                  # 720p take from the avatar still
 *   node scripts/omni-presenter.mjs --resolution 360p   # cheaper draft
 *   node scripts/omni-presenter.mjs --describe "a woman in her 30s, navy blazer, bright office"
 *                                                    # no image: Omni invents the presenter
 *   node scripts/omni-presenter.mjs --force          # replace an existing take
 *   node scripts/omni-presenter.mjs --dry-run        # print the segments and prompts, call nothing
 *   node scripts/omni-presenter.mjs --force --from-segment 3
 *                                                    # keep segments 1–2 of the last take, re-film from 3
 */
import fs from "fs";
import https from "https";
import path from "path";
import { execFileSync } from "child_process";
import { envValue, requireKey } from "./env.mjs";

const MODEL = envValue("OMNI_MODEL") || "gemini-omni-1.1-flash";
const API = "https://generativelanguage.googleapis.com/v1beta";
const MAX_SECONDS = 40;
/** Words one ~10 second clip can carry at a natural pace. */
const WORDS_PER_SEGMENT = 24;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const cwd = process.cwd();
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, p), "utf8"));
  } catch {
    return null;
  }
};
const plan = readJson("plan.json");
const intake = readJson("intake.json") ?? {};
const script = String(plan?.voiceover?.script ?? intake.story ?? "").trim().replace(/\s+/g, " ");
if (!script) throw new Error("No script — plan.json has no voiceover.script and intake.json has no story.");

const dryRun = argv.includes("--dry-run");
const take = path.join(cwd, "public/avatar/take.mp4");
if (fs.existsSync(take) && !argv.includes("--force") && !dryRun) {
  console.log("public/avatar/take.mp4 already exists — keeping it. Pass --force to film a new take.");
  process.exit(0);
}

let resolution = flag("resolution", "720p");
const describe = flag("describe", intake.presenter?.description ?? "");
const stillPath = path.join(cwd, "public", intake.avatar ?? "avatar/avatar.png");
const useImage = !argv.includes("--describe") && fs.existsSync(stillPath);

/* ── Segments: whole sentences, about ten seconds each ───────────────────── */

const sentences = script.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()) ?? [script];
const words = script.split(" ").length;
// One first clip plus extensions of ~10s each, up to MAX_SECONDS: that caps the
// segment count. Aim every segment at an even share of the words, closing a
// segment at the sentence end nearest its share, so none is left nearly empty.
const MAX_SEGMENTS = Math.floor(MAX_SECONDS / 10);
const count = Math.min(MAX_SEGMENTS, Math.max(1, Math.ceil(words / WORDS_PER_SEGMENT)));
const target = words / count;
const segments = [];
let current = [];
let done = 0;
for (const [k, s] of sentences.entries()) {
  current.push(s);
  done += s.split(" ").length;
  const left = sentences.length - k - 1;
  const segmentsLeft = count - segments.length - 1;
  const boundary = target * (segments.length + 1);
  const next = sentences[k + 1]?.split(" ").length ?? 0;
  // Close here if we are past the share, or closer to it than we would be after the next sentence.
  const close = segmentsLeft > 0 && left >= segmentsLeft && (done >= boundary || boundary - done < done + next - boundary);
  if (close) {
    segments.push(current.join(" "));
    current = [];
  }
}
if (current.length) segments.push(current.join(" "));
const estimate = Math.round(words / 2.4);
if (estimate > MAX_SECONDS - 2) {
  console.error(`The script is ${words} words (~${estimate}s). One Omni take tops out near ${MAX_SECONDS}s — shorten it for the proof of concept.`);
  process.exit(1);
}

/* ── HTTP without fetch's five-minute header timeout ─────────────────────── */

// A video generation can hold the connection open for several minutes, which is
// past undici's default headersTimeout; plain https has no such limit.
const request = (method, url, body) =>
  new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          "x-goog-api-key": key,
          ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}),
        },
        timeout: 20 * 60 * 1000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("Omni request timed out after 20 minutes")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

const json = (r) => {
  try {
    return JSON.parse(r.body.toString());
  } catch {
    return {};
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for an interaction to finish, whether the POST blocked or returned early. */
const settle = async (interaction) => {
  let it = interaction;
  const started = Date.now();
  while (it.status && !["completed", "failed", "cancelled"].includes(it.status)) {
    if (Date.now() - started > 20 * 60 * 1000) throw new Error("Omni did not finish within 20 minutes.");
    process.stdout.write(`  … ${it.status} (${Math.round((Date.now() - started) / 1000)}s)\r`);
    await sleep(10000);
    it = json(await request("GET", `${API}/interactions/${it.id}`));
  }
  if (it.status && it.status !== "completed") throw new Error(`Omni interaction ${it.status}: ${JSON.stringify(it.error ?? it).slice(0, 400)}`);
  return it;
};

/** The video part of a finished interaction: inline bytes or a file URI. */
const videoOf = (it) => {
  for (const step of it.steps ?? []) {
    for (const c of step.content ?? []) if (c.type === "video") return c;
  }
  for (const c of it.outputs ?? []) if (c.type === "video") return c;
  return null;
};

const download = async (video, dest) => {
  if (video.data) return fs.writeFileSync(dest, Buffer.from(video.data, "base64"));
  const fileId = video.uri.match(/files\/([^/:?]+)/)?.[1];
  for (let i = 0; i < 60; i++) {
    const r = await request("GET", video.uri);
    if (r.status === 200 && r.body.length > 1000) return fs.writeFileSync(dest, r.body);
    if (r.status === 302 || r.status === 301) {
      const r2 = await request("GET", r.headers.location);
      if (r2.status === 200) return fs.writeFileSync(dest, r2.body);
    }
    // Not ready yet: the file is still processing.
    if (fileId) {
      const f = json(await request("GET", `${API}/files/${fileId}`));
      if (f.state === "FAILED") throw new Error(`Omni's output file failed to process.`);
    }
    await sleep(5000);
  }
  throw new Error(`Could not download ${video.uri}`);
};

const seconds = (p) =>
  Number(
    execFileSync("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], {
      encoding: "utf8",
    }).trim(),
  );

/* ── Prompts ─────────────────────────────────────────────────────────────── */

const who = useImage
  ? "The person in the reference image"
  : `A presenter${describe ? ` — ${describe} —` : ""}`;
// A founder on camera, not a portrait that talks: gestures, weight shifts and a
// camera operator's gentle drift are what stop a generated take reading as AI.
const frame =
  "in a medium shot from the waist up, centred with headroom, framed exactly as in the reference image, looking into the camera. " +
  "The camera is on a gimbal: a gentle, natural handheld drift, no cuts, no zoom. " +
  "They speak like a confident founder explaining their product to a peer: an expressive face, natural hand gestures at chest height while explaining, " +
  "small shifts of weight, the occasional nod and smile. " +
  "Soft studio key light, a real photographic look, natural skin texture, shot on a cinema camera at 24fps with a shallow depth of field.";
const sound = "Audio: only their voice, clear and close, like a good lavalier mic. No music, no sound effects, no other voices. No captions or on-screen text.";
const tone = plan?.voiceover?.toneNotes ? ` Delivery: ${plan.voiceover.toneNotes}` : " Delivery: warm, confident, even pace, like a founder talking to a peer.";

const firstPrompt = (text) =>
  `${who}, ${frame} They speak directly to camera and say exactly, word for word, every word and nothing else: "${text}"${tone} ${sound}`;
// Extensions tend to replay the previous line before the new one; say plainly not to.
const nextPrompt = (text) =>
  `Continue this exact shot without a cut: the same person, same framing, same background, same voice and energy, still gesturing naturally as they talk. ` +
  `Do not repeat anything they have already said. They go on to say exactly, word for word, and nothing after it: "${text}"${tone} ${sound}`;

/* ── Film it ─────────────────────────────────────────────────────────────── */

console.log(`\nFilming the presenter with ${MODEL} at ${resolution}: ${words} words, ~${estimate}s, ${segments.length} segment(s).`);
console.log(useImage ? `  from the still ${path.relative(cwd, stillPath)}` : "  with an invented presenter (no image)");
segments.forEach((s, i) => console.log(`  ${i + 1}. "${s}"`));

if (dryRun) {
  console.log("\nPrompts that would be sent:\n");
  segments.forEach((s, i) => console.log(`  [${i + 1}] ${i === 0 ? firstPrompt(s) : nextPrompt(s)}\n`));
  process.exit(0);
}
const key = requireKey(cwd);

fs.mkdirSync(path.join(cwd, "assets/avatar/raw"), { recursive: true });
const parts = [];
const record = { model: MODEL, resolution, useImage, segments: [], at: new Date().toISOString() };
let previous = null;

// Resume: keep the good segments of the last take and extend from the last of them.
const fromSegment = Number(flag("from-segment", 1));
if (fromSegment > 1) {
  const last = readJson("omni-take.json");
  const keep = last?.segments?.slice(0, fromSegment - 1) ?? [];
  const same = keep.length === fromSegment - 1 && keep.every((s, k) => s.text === segments[k]);
  if (!same) {
    console.error(`Cannot resume from segment ${fromSegment}: the last take's segments do not match this script.`);
    process.exit(1);
  }
  const tail = keep[keep.length - 1];
  // Extensions come back as the whole take so far, so the last kept file is everything up to here.
  parts.push({ file: path.join(cwd, tail.file), dur: seconds(path.join(cwd, tail.file)) });
  record.segments.push(...keep);
  record.resolution = resolution = last.resolution ?? resolution;
  previous = tail.interaction;
  console.log(`Keeping segments 1–${fromSegment - 1} (${parts[0].dur.toFixed(1)}s); re-filming from ${fromSegment}.`);
}

for (const [i, text] of segments.entries()) {
  if (i < fromSegment - 1) continue;
  const input = [];
  if (i === 0 && useImage) {
    const mime = stillPath.endsWith(".png") ? "image/png" : stillPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
    input.push({ type: "image", data: fs.readFileSync(stillPath).toString("base64"), mime_type: mime });
  }
  input.push({ type: "text", text: i === 0 ? firstPrompt(text) : nextPrompt(text) });

  const body = {
    model: MODEL,
    input,
    response_format: { type: "video", aspect_ratio: "16:9", resolution, delivery: "uri" },
    ...(i === 0 && useImage ? { generation_config: { video_config: { task: "image_to_video" } } } : {}),
    ...(previous ? { previous_interaction_id: previous } : {}),
  };

  console.log(`\nSegment ${i + 1}/${segments.length}…`);
  let res = await request("POST", `${API}/interactions`, body);
  let first = json(res);
  // 4K is an upscale Omni may not offer for every request; fall back rather than stop.
  if ((res.status >= 400 || first.error) && resolution === "4k" && /resolution|4k|unsupported|invalid/i.test(JSON.stringify(first))) {
    console.log("  4K not accepted here; filming at 1080p instead.");
    resolution = "1080p";
    record.resolution = resolution;
    body.response_format.resolution = resolution;
    res = await request("POST", `${API}/interactions`, body);
    first = json(res);
  }
  if (res.status >= 400 || first.error) {
    const msg = JSON.stringify(first.error ?? first).slice(0, 600);
    if (i === 0 && useImage && /person|people|face|safety|policy/i.test(msg)) {
      console.error(
        `\nOmni refused the avatar image — it declines some photos of real people.\n` +
          `Try an illustrated character as the avatar, or run with --describe "…" to let Omni invent a presenter.\n\n${msg}`,
      );
    } else console.error(`Omni returned ${res.status}: ${msg}`);
    process.exit(1);
  }
  const done = await settle(first);
  const video = videoOf(done);
  if (!video) throw new Error(`Omni finished without a video: ${JSON.stringify(done).slice(0, 400)}`);

  const file = path.join(cwd, `assets/avatar/raw/omni-part${i + 1}.mp4`);
  await download(video, file);
  const dur = seconds(file);
  const before = parts.reduce((a, p) => a + p.dur, 0);
  // An extension may come back as the whole video so far, or as the new part
  // only. A clip longer than what came before (plus a margin) is the whole take.
  const cumulative = i > 0 && dur > before + 2;
  if (cumulative) parts.length = 0;
  parts.push({ file, dur });
  record.segments.push({ text, interaction: done.id, file: path.relative(cwd, file), seconds: dur, cumulative });
  previous = done.id;
  console.log(`  got ${dur.toFixed(1)}s${cumulative ? " (the whole take so far)" : ""}`);
}

/* ── Assemble, split into picture and voice ──────────────────────────────── */

const raw = path.join(cwd, "assets/avatar/raw/omni-take.mp4");
if (parts.length === 1) fs.copyFileSync(parts[0].file, raw);
else {
  const list = path.join(cwd, "assets/avatar/raw/omni-concat.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p.file.replace(/'/g, "'\\''")}'`).join("\n"));
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "192k", raw], { stdio: "ignore" });
}

fs.mkdirSync(path.dirname(take), { recursive: true });
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-i", raw, "-an", "-r", "30",
  "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", take], { stdio: "ignore" });

const vo = path.join(cwd, "assets/audio/vo.mp3");
fs.mkdirSync(path.dirname(vo), { recursive: true });
if (fs.existsSync(vo)) fs.renameSync(vo, path.join(path.dirname(vo), "vo.prev.mp3"));
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-i", raw, "-vn", "-c:a", "libmp3lame", "-q:a", "2", vo], { stdio: "ignore" });

record.seconds = seconds(raw);
fs.writeFileSync(path.join(cwd, "omni-take.json"), JSON.stringify(record, null, 2));

console.log(`\nTake: ${record.seconds.toFixed(1)}s → public/avatar/take.mp4 (picture) + assets/audio/vo.mp3 (voice)`);
console.log("Next: node scripts/transcribe.mjs, then node scripts/demo-timing.mjs");
console.log("Watch the take once before building on it — if a line was paraphrased or cut off, re-film with --force.");
