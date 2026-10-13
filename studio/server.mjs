/**
 * Demo Studio — the local intake and review page for demo mode.
 *
 * It does no video work itself. It collects what a demo needs (the story, the
 * avatar image, the real product screenshots, optional music) into a project
 * folder, and shows what Claude Code has done with it since: the storyboard with
 * its focus boxes drawn over the screenshots, the lip-synced presenter clips,
 * the review stills and the finished renders. Approving the storyboard and
 * flagging a clip for a retake write small files the build reads.
 *
 * No dependencies, and it binds to localhost only — it writes into your disk.
 *
 * Usage: node studio/server.mjs [--root ~/Healthlytics/demos] [--port 4400]
 *        (or set DEMO_STUDIO_ROOT; the /demo commands read the same variable)
 */
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import {
  CHIRP_LOCALES,
  CHIRP_VOICES,
  DEFAULT_VOICE,
  PROVIDERS,
  providerProblem,
  synthesize,
} from "../skills/reel-studio/scripts/tts-providers.mjs";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const DEFAULT_ROOT = process.env.DEMO_STUDIO_ROOT || path.join(os.homedir(), "Healthlytics", "demos");
const ROOT = path.resolve(String(flag("root", DEFAULT_ROOT)).replace(/^~/, os.homedir()));
const PORT = Number(flag("port", 4400));
const STATIC = import.meta.dirname;
const MAX_UPLOAD = 200 * 1024 * 1024;
fs.mkdirSync(ROOT, { recursive: true });

/** The only paths an upload may write, relative to the project folder. */
const WRITABLE = [
  /^public\/screens\/[a-z0-9][a-z0-9._-]{0,80}\.(png|jpe?g|webp)$/,
  /^public\/avatar\/avatar\.(png|jpe?g|webp)$/,
  /^assets\/audio\/bg\.mp3$/,
  /^assets\/avatar\/raw\/[a-z0-9][a-z0-9-]{0,60}\.(mp4|mov|webm)$/,
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const SLUG = /^[a-z0-9][a-z0-9-]{1,59}$/;

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const fail = (res, status, message) => send(res, status, { error: message });

const readBody = (req, limit = MAX_UPLOAD) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

/** Resolve a path inside a project, refusing anything that climbs out of it. */
const inside = (dir, rel) => {
  const full = path.resolve(dir, rel);
  return full === dir || full.startsWith(dir + path.sep) ? full : null;
};

const projectDir = (slug) => (SLUG.test(slug) ? path.join(ROOT, slug) : null);

const list = (dir, re) => {
  try {
    return fs.readdirSync(dir).filter((f) => re.test(f)).sort();
  } catch {
    return [];
  }
};

/* ── Status: worked out from the files on disk, never stored ─────────────── */

const status = (slug) => {
  const dir = projectDir(slug);
  const has = (rel) => fs.existsSync(path.join(dir, rel));
  const intake = readJson(path.join(dir, "intake.json"));
  const plan = readJson(path.join(dir, "plan.json"));
  const approved = readJson(path.join(dir, "approved.json"));
  const timeline = readJson(path.join(dir, "timeline.json"));
  const jobs = readJson(path.join(dir, "avatar-jobs.json"))?.jobs ?? [];
  const stills = list(path.join(dir, "out", "stills"), /\.(png|jpe?g)$/).map((f) => `out/stills/${f}`);
  const renders = list(path.join(dir, "out"), /\.mp4$/).map((f) => {
    const st = fs.statSync(path.join(dir, "out", f));
    return { path: `out/${f}`, bytes: st.size, at: st.mtimeMs };
  });
  const clipsDone = jobs.filter((j) => j.status === "done").length;
  const omni = intake?.presenterEngine === "omni";
  const take = omni && has("public/avatar/take.mp4")
    ? { path: "public/avatar/take.mp4", at: fs.statSync(path.join(dir, "public/avatar/take.mp4")).mtimeMs, meta: readJson(path.join(dir, "omni-take.json")) }
    : null;

  const steps = [
    { id: "intake", label: "Intake", done: Boolean(intake?.story && intake?.screens?.length) },
    { id: "plan", label: "Storyboard", done: Boolean(plan), warn: Boolean(plan?.validationErrors?.length || plan?.phiCheck?.length) },
    { id: "approved", label: "Approved", done: Boolean(approved) },
    { id: "voice", label: "Voiceover", done: has("assets/audio/vo.mp3") },
    { id: "timing", label: "Timing", done: Boolean(timeline) },
    omni
      ? { id: "avatar", label: "Presenter take (Omni)", done: Boolean(take) }
      : { id: "avatar", label: `Presenter ${clipsDone}/${jobs.length || "–"}`, done: jobs.length > 0 && clipsDone === jobs.length, warn: jobs.some((j) => j.status === "retake") },
    { id: "stills", label: "Review stills", done: stills.length > 0 },
    { id: "render", label: "Rendered", done: renders.some((r) => !r.path.includes("-draft")) },
  ];

  const next = (() => {
    if (!steps[0].done) return "Finish the intake: a story and at least one screenshot.";
    if (!plan) return `In Claude Code, run:  /demo ${slug}`;
    if (!approved) return "Check the storyboard below, then approve it (or ask Claude for changes).";
    if (!steps[7].done) return `In Claude Code, run:  /demo-build ${slug}`;
    return "Done. Flag any presenter clip for a retake, or ask Claude for changes with /reel-revise.";
  })();

  const vo = has("assets/audio/vo.mp3") ? { path: "assets/audio/vo.mp3", at: fs.statSync(path.join(dir, "assets/audio/vo.mp3")).mtimeMs } : null;
  return { slug, dir, intake, plan, approved, timeline, jobs, stills, renders, steps, next, vo, take };
};

/* ── Routes ──────────────────────────────────────────────────────────────── */

const serveFile = (req, res, file) => {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return fail(res, 404, "not found");
  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const size = fs.statSync(file).size;
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  // Video elements seek with range requests; without them Safari will not play at all.
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Cache-Control": "no-store",
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

    // The page itself.
    if (req.method === "GET" && (url.pathname === "/" || ["app.js", "style.css"].includes(parts[0]))) {
      return serveFile(req, res, path.join(STATIC, parts[0] ?? "index.html"));
    }

    // Project files, read-only: /files/<slug>/<path>
    if (req.method === "GET" && parts[0] === "files") {
      const dir = projectDir(parts[1] ?? "");
      if (!dir) return fail(res, 400, "bad slug");
      return serveFile(req, res, inside(dir, parts.slice(2).join("/")));
    }

    if (parts[0] !== "api") return fail(res, 404, "not found");

    // GET /api/voices — the choices the voice picker offers, and which providers are set up.
    if (req.method === "GET" && parts[1] === "voices") {
      const ready = Object.fromEntries(PROVIDERS.map((p) => [p, providerProblem(p, ROOT)]));
      return send(res, 200, { providers: PROVIDERS, chirpVoices: CHIRP_VOICES, locales: CHIRP_LOCALES, default: DEFAULT_VOICE, problems: ready });
    }

    // POST /api/voice-preview { provider, voice, text } — a short sample through
    // the same code the build uses, so what you audition is what you get.
    if (req.method === "POST" && parts[1] === "voice-preview") {
      const { provider, voice, text } = JSON.parse((await readBody(req, 64 * 1024)).toString() || "{}");
      if (!PROVIDERS.includes(provider)) return fail(res, 400, "unknown provider");
      const sample = String(text || "").trim().slice(0, 280) || "Hi, this is how your demo will sound.";
      try {
        const audio = await synthesize({ provider, text: sample, voice, cwd: ROOT });
        return send(res, 200, audio, "audio/mpeg");
      } catch (err) {
        return fail(res, 502, err.message);
      }
    }

    // GET /api/projects
    if (req.method === "GET" && parts[1] === "projects") {
      const slugs = fs.readdirSync(ROOT).filter((d) => SLUG.test(d) && fs.existsSync(path.join(ROOT, d, "intake.json")));
      const projects = slugs.map((s) => {
        const st = status(s);
        return { slug: s, title: st.intake?.title ?? s, steps: st.steps, at: fs.statSync(path.join(ROOT, s, "intake.json")).mtimeMs };
      });
      return send(res, 200, { root: ROOT, projects: projects.sort((a, b) => b.at - a.at) });
    }

    // POST /api/projects { slug } — creates the folder and an empty intake.
    if (req.method === "POST" && parts[1] === "projects") {
      const { slug } = JSON.parse((await readBody(req, 64 * 1024)).toString() || "{}");
      const dir = projectDir(String(slug ?? ""));
      if (!dir) return fail(res, 400, "Slug must be lowercase letters, numbers and hyphens.");
      if (fs.existsSync(dir)) return fail(res, 409, `A project called "${slug}" already exists.`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "intake.json"), JSON.stringify({ slug, createdAt: new Date().toISOString() }, null, 2));
      return send(res, 201, { slug, dir });
    }

    // Everything below is /api/p/<slug>/…
    if (parts[1] !== "p") return fail(res, 404, "not found");
    const slug = parts[2] ?? "";
    const dir = projectDir(slug);
    if (!dir || !fs.existsSync(dir)) return fail(res, 404, "no such project");
    const action = parts[3];

    if (req.method === "GET" && action === "status") return send(res, 200, status(slug));

    // PUT /api/p/<slug>/file?path=… — raw body, whitelisted destinations only.
    if (req.method === "PUT" && action === "file") {
      const rel = url.searchParams.get("path") ?? "";
      if (!WRITABLE.some((re) => re.test(rel))) return fail(res, 400, `Uploads cannot write to "${rel}".`);
      const full = inside(dir, rel);
      if (!full) return fail(res, 400, "bad path");
      const body = await readBody(req);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, body);
      return send(res, 200, { path: rel, bytes: body.length });
    }

    // PUT /api/p/<slug>/intake — the form's fields, merged over what is there.
    if (req.method === "PUT" && action === "intake") {
      const incoming = JSON.parse((await readBody(req, 1024 * 1024)).toString());
      const current = readJson(path.join(dir, "intake.json")) ?? {};
      const fields = ["title", "product", "url", "audience", "notes", "story", "presenter", "avatar", "screens", "music", "formats", "voice", "soundEffects", "presenterEngine"];
      for (const k of fields) if (k in incoming) current[k] = incoming[k];
      current.slug = slug;
      current.updatedAt = new Date().toISOString();
      fs.writeFileSync(path.join(dir, "intake.json"), JSON.stringify(current, null, 2));
      return send(res, 200, current);
    }

    // POST /api/p/<slug>/approve { note, noPhi }
    if (req.method === "POST" && action === "approve") {
      if (!fs.existsSync(path.join(dir, "plan.json"))) return fail(res, 409, "There is no storyboard to approve yet.");
      const body = JSON.parse((await readBody(req, 64 * 1024)).toString() || "{}");
      const plan = readJson(path.join(dir, "plan.json"));
      if (plan?.phiCheck?.length && !body.noPhi) {
        return fail(res, 409, "Confirm the screenshots contain no real patient data before approving.");
      }
      const record = { approvedAt: new Date().toISOString(), note: String(body.note ?? "").slice(0, 2000), noPhiConfirmed: Boolean(body.noPhi) };
      fs.writeFileSync(path.join(dir, "approved.json"), JSON.stringify(record, null, 2));
      return send(res, 200, record);
    }

    // DELETE /api/p/<slug>/approve — withdraw, to ask for changes.
    if (req.method === "DELETE" && action === "approve") {
      fs.rmSync(path.join(dir, "approved.json"), { force: true });
      return send(res, 200, { ok: true });
    }

    // POST /api/p/<slug>/retake { scene, note }
    if (req.method === "POST" && action === "retake") {
      const { scene, note } = JSON.parse((await readBody(req, 64 * 1024)).toString() || "{}");
      const file = path.join(dir, "avatar-jobs.json");
      const jobs = readJson(file);
      const job = jobs?.jobs?.find((j) => j.scene === scene);
      if (!job) return fail(res, 404, "no such avatar job");
      job.status = "retake";
      job.note = String(note || "Flagged for a retake in the Studio.").slice(0, 1000);
      fs.writeFileSync(file, JSON.stringify(jobs, null, 2));
      return send(res, 200, job);
    }

    return fail(res, 404, "not found");
  } catch (err) {
    return fail(res, err.message === "too large" ? 413 : 500, err.message);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Demo Studio → http://localhost:${PORT}`);
  console.log(`Projects in ${ROOT}`);
});
