/**
 * Demo Studio front end. Three views on the hash: the project list, the intake
 * form, and a project's review page. Plain DOM, no build step.
 */
const app = document.getElementById("app");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slugify = (s) =>
  String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

const toast = (msg, ms = 2600) => {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), ms);
};

const api = async (method, url, body, raw = false) => {
  const res = await fetch(url, {
    method,
    headers: raw ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status}`);
  return data;
};

let pollTimer = null;
const stopPolling = () => {
  clearInterval(pollTimer);
  pollTimer = null;
};

/* ── Voice picker ────────────────────────────────────────────────────────── */

let voiceMeta = null;
const loadVoices = async () => (voiceMeta ??= await api("GET", "/api/voices"));

/** Splits "en-US-Chirp3-HD-Charon" into its locale and voice. */
const parseChirp = (name) => {
  const m = String(name ?? "").match(/^([a-z]{2}-[A-Z]{2})-Chirp3-HD-(\w+)$/);
  return m ? { locale: m[1], voice: m[2] } : null;
};

function voicePickerHtml(v, meta) {
  const voice = { ...meta.default, ...(v ?? {}) };
  const chirp = parseChirp(voice.voiceName) ?? parseChirp(meta.default.voiceName);
  const opt = (value, label, sel) => `<option value="${esc(value)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
  const group = (g, label) =>
    `<optgroup label="${label}">${meta.chirpVoices.filter(([, sex]) => sex === g).map(([n]) => opt(n, n, n === chirp.voice)).join("")}</optgroup>`;
  return `<div class="voice-picker">
    <div class="grid2">
      <div class="field">
        <label>Voice provider</label>
        <select data-v="provider">
          ${opt("google", "Google Chirp 3 HD", voice.provider === "google")}
          ${opt("elevenlabs", "ElevenLabs (your cloned voice)", voice.provider === "elevenlabs")}
        </select>
        <div class="hint" data-v="status"></div>
      </div>
      <div class="field">
        <label>Speed <span class="muted" data-v="speedVal">${Number(voice.speed || 1).toFixed(2)}×</span></label>
        <input type="range" min="0.8" max="1.2" step="0.05" value="${Number(voice.speed || 1)}" data-v="speed" style="width:100%" />
      </div>
      <div class="field" data-for="google">
        <label>Accent</label>
        <select data-v="locale">${meta.locales.map((l) => opt(l, l, l === chirp.locale)).join("")}</select>
      </div>
      <div class="field" data-for="google">
        <label>Voice</label>
        <select data-v="voice">${group("F", "Female")}${group("M", "Male")}</select>
      </div>
      <div class="field" data-for="elevenlabs">
        <label>ElevenLabs voice ID</label>
        <input type="text" data-v="voiceId" value="${esc(voice.voiceId ?? "")}" placeholder="Empty = ELEVENLABS_VOICE_ID from .env" />
      </div>
    </div>
    <button type="button" class="btn small" data-v="preview">▶ Preview voice</button>
    <audio data-v="audio" controls hidden style="vertical-align:middle;margin-left:10px;height:34px"></audio>
  </div>`;
}

/** Wires a rendered picker; returns a function that reads the current choice. */
function wireVoicePicker(root, meta, sampleText) {
  const q = (k) => root.querySelector(`[data-v="${k}"]`);
  const read = () => {
    const provider = q("provider").value;
    return {
      provider,
      languageCode: q("locale").value,
      voiceName: `${q("locale").value}-Chirp3-HD-${q("voice").value}`,
      ...(q("voiceId").value.trim() ? { voiceId: q("voiceId").value.trim() } : {}),
      speed: Number(q("speed").value),
    };
  };
  const sync = () => {
    const provider = q("provider").value;
    root.querySelectorAll("[data-for]").forEach((el) => (el.hidden = el.dataset.for !== provider));
    const problem = meta.problems[provider];
    q("status").innerHTML = problem
      ? `<span style="color:var(--warn)">Not set up yet: ${esc(problem)}.</span>`
      : `<span style="color:var(--ok)">Ready.</span>`;
    q("speedVal").textContent = `${Number(q("speed").value).toFixed(2)}×`;
  };
  ["provider", "speed", "locale", "voice"].forEach((k) => q(k).addEventListener("input", sync));
  q("preview").addEventListener("click", async () => {
    const btn = q("preview");
    btn.disabled = true;
    btn.textContent = "Voicing…";
    try {
      const v = read();
      const res = await fetch("/api/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: v.provider, voice: v, text: sampleText() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `${res.status}`);
      const audio = q("audio");
      audio.src = URL.createObjectURL(await res.blob());
      audio.hidden = false;
      audio.play();
    } catch (err) {
      toast(err.message, 6000);
    } finally {
      btn.disabled = false;
      btn.textContent = "▶ Preview voice";
    }
  });
  sync();
  return read;
}

const ENGINES = [
  ["higgsfield", "Higgsfield lip-sync — your chosen voice, best sync (needs a paid Higgsfield plan)"],
  ["omni", "Gemini Omni Flash — Omni films and voices the presenter in one take (proof of concept)"],
];
const engineSelectHtml = (id, value) =>
  `<select id="${id}">${ENGINES.map(([v, l]) => `<option value="${v}"${v === (value || "higgsfield") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const OMNI_NOTE =
  "Omni generates the voice and the lip movement together, as one continuous take of up to about 40 seconds. " +
  "The voice is Omni's own rather than a Chirp or ElevenLabs voice. It may decline a photo of a real person, in which case use an illustrated character.";

/** The first sentence or two of a story, for a cheap preview. */
const previewSample = (story) =>
  (String(story || "").match(/[^.!?]+[.!?]+/g) ?? [story || ""]).slice(0, 2).join(" ").trim().slice(0, 280);

/* ── Router ──────────────────────────────────────────────────────────────── */

const route = () => {
  stopPolling();
  const hash = location.hash.replace(/^#\/?/, "");
  if (hash === "new") return viewNew();
  if (hash.startsWith("p/")) return viewProject(decodeURIComponent(hash.slice(2)));
  return viewHome();
};
window.addEventListener("hashchange", route);
route();

/* ── Home ────────────────────────────────────────────────────────────────── */

async function viewHome() {
  app.innerHTML = `<p class="muted">Loading…</p>`;
  const { root, projects } = await api("GET", "/api/projects");
  const done = (p) => p.steps.filter((s) => s.done).length;
  app.innerHTML = `
    <h1>Product demos</h1>
    <p class="muted">A presenter speaking your story over your real product screens, rendered for LinkedIn (16:9) and the feeds (9:16). Projects live in <code>${esc(root)}</code>.</p>
    <div class="card">
      ${
        projects.length
          ? `<div class="list">${projects
              .map(
                (p) => `<a class="row" href="#/p/${encodeURIComponent(p.slug)}">
                  <span><strong>${esc(p.title)}</strong><br><span class="muted small">${esc(p.slug)}</span></span>
                  <span class="muted small">${done(p)}/${p.steps.length} steps · ${esc(p.steps.filter((s) => s.done).at(-1)?.label ?? "New")}</span>
                </a>`,
              )
              .join("")}</div>`
          : `<p>No demos yet.</p><a class="btn primary" href="#/new">Create your first demo</a>`
      }
    </div>`;
}

/* ── New demo ────────────────────────────────────────────────────────────── */

function viewNew() {
  const state = { avatar: null, screens: [], music: null };

  app.innerHTML = `
    <h1>New demo</h1>
    <p class="muted">Everything the build needs. Nothing is generated yet: after this, Claude Code stages a storyboard for you to approve.</p>

    <div class="card">
      <h2>About the demo</h2>
      <div class="grid2">
        <div class="field"><label for="title">Title</label><input id="title" type="text" placeholder="Care Connect in 60 seconds" /></div>
        <div class="field"><label for="slug">Folder name</label><input id="slug" type="text" placeholder="care-connect-60s" /><div class="hint">Lowercase, hyphens. Used for the command you run next.</div></div>
        <div class="field"><label for="product">Product</label><input id="product" type="text" placeholder="Care Connect" /></div>
        <div class="field"><label for="url">Product URL</label><input id="url" type="text" placeholder="careconnect.ai" /><div class="hint">Shown in the browser bar and on the closing card.</div></div>
        <div class="field"><label for="audience">Audience</label><input id="audience" type="text" placeholder="Clinic owners and family physicians" /></div>
        <div class="field"><label for="notes">Anything else</label><input id="notes" type="text" placeholder="Tone, what to stress, what to avoid" /></div>
      </div>
    </div>

    <div class="card">
      <h2>The story</h2>
      <div class="field">
        <label for="story">What the presenter says, word for word</label>
        <textarea id="story" placeholder="Hi, I'm Abdullah. Clinics lose hours every day answering the same patient messages…"></textarea>
        <div class="hint" id="storyStats">0 words</div>
      </div>
    </div>

    <div class="card">
      <h2>The presenter</h2>
      <div class="field">
        <label for="engine">How the presenter is made</label>
        ${engineSelectHtml("engine", "higgsfield")}
        <div class="hint" id="engineNote"></div>
      </div>
      <div class="grid2">
        <div class="field"><label for="pname">Name</label><input id="pname" type="text" placeholder="Abdullah Kazmi" /></div>
        <div class="field"><label for="prole">Role</label><input id="prole" type="text" placeholder="Founder, Care Connect" /></div>
      </div>
      <div class="avatar-row">
        <img id="avatarPreview" class="avatar-preview" alt="" hidden />
        <div class="drop" id="avatarDrop" style="flex:1">
          <strong>Drop the avatar image</strong> or click to choose<br>
          <span class="small">Shoulders up, facing the camera, plain background, mouth closed, at least 1024px. This still is what Higgsfield animates.</span>
        </div>
        <input id="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" hidden />
      </div>
      <div class="hint" id="avatarNote"></div>
    </div>

    <div class="card" id="voiceCard">
      <h2>The voice</h2>
      <p class="muted small" style="margin-top:-6px">The whole story is voiced once, and the presenter is lip-synced to that recording.</p>
      <div id="voicePicker"><p class="muted small">Loading voices…</p></div>
    </div>

    <div class="card">
      <h2>Product screenshots</h2>
      <div class="drop" id="screensDrop"><strong>Drop screenshots</strong> or click to choose. They are shown exactly as captured; drag to reorder.</div>
      <input id="screensFile" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden />
      <div class="alert warn small" style="margin-top:12px">Use a demo account. Real patient names, dates of birth, health card numbers or clinical notes must not appear in any screenshot.</div>
      <div class="screens" id="screens"></div>
    </div>

    <div class="card">
      <h2>Sound and formats</h2>
      <div class="grid2">
        <div class="field">
          <label>Background music (optional)</label>
          <div class="drop" id="musicDrop">Drop an instrumental mp3, or leave empty for voice only</div>
          <input id="musicFile" type="file" accept="audio/mpeg" hidden />
        </div>
        <div class="field">
          <label>Formats</label>
          <label style="font-weight:500"><input type="checkbox" id="f169" checked> 16:9 landscape (LinkedIn, YouTube, website)</label>
          <label style="font-weight:500"><input type="checkbox" id="f916" checked> 9:16 vertical (Reels, Shorts, TikTok)</label>
          <label style="margin-top:12px">Sound effects</label>
          <label style="font-weight:500"><input type="checkbox" id="sfxOn" checked> Whoosh on cuts, click on buttons, ding on the closing card</label>
        </div>
      </div>
    </div>

    <div class="card">
      <button class="btn primary" id="create">Create demo</button>
      <div class="progress" hidden><div></div></div>
      <div class="hint" id="createNote"></div>
    </div>`;

  const $ = (id) => document.getElementById(id);
  let readVoice = () => undefined;
  loadVoices()
    .then((meta) => {
      $("voicePicker").innerHTML = voicePickerHtml(null, meta);
      readVoice = wireVoicePicker($("voicePicker"), meta, () => previewSample($("story").value));
    })
    .catch((err) => ($("voicePicker").innerHTML = `<div class="alert warn">${esc(err.message)}</div>`));
  const syncEngine = () => {
    const omni = $("engine").value === "omni";
    $("voiceCard").hidden = omni;
    $("engineNote").textContent = omni ? OMNI_NOTE : "Your avatar still is lip-synced to the voiceover you pick below.";
  };
  $("engine").addEventListener("change", syncEngine);
  syncEngine();
  let slugEdited = false;
  $("title").addEventListener("input", () => {
    if (!slugEdited) $("slug").value = slugify($("title").value);
  });
  $("slug").addEventListener("input", () => (slugEdited = true));

  const stats = () => {
    const words = $("story").value.trim().split(/\s+/).filter(Boolean).length;
    const sec = Math.round(words / 2.5);
    $("storyStats").textContent = `${words} words · about ${sec}s spoken${sec > 120 ? " — long for a social demo; 45–90s works best" : ""}`;
  };
  $("story").addEventListener("input", stats);

  const wireDrop = (drop, input, onFiles) => {
    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => onFiles([...input.files]));
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("over");
      onFiles([...e.dataTransfer.files]);
    });
  };

  const loadImage = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });

  wireDrop($("avatarDrop"), $("avatarFile"), async ([file]) => {
    if (!file) return;
    const img = await loadImage(file);
    state.avatar = { file, ...img };
    $("avatarPreview").src = img.url;
    $("avatarPreview").hidden = false;
    const small = Math.min(img.width, img.height) < 1024;
    $("avatarNote").textContent = `${img.width}×${img.height}${small ? " — below 1024px; the lip-sync will look soft." : ""}`;
  });

  const renderScreens = () => {
    $("screens").innerHTML = state.screens
      .map(
        (s, i) => `<div class="screen-item" draggable="true" data-i="${i}">
          <div class="order" title="Drag to reorder">${i + 1}</div>
          <img src="${s.url}" alt="" />
          <div>
            <input type="text" data-caption="${i}" value="${esc(s.caption)}" placeholder="What this shows, e.g. Clinic dashboard with AI summary" />
            <div class="hint">${s.width}×${s.height} · ${esc(s.file.name)}</div>
          </div>
          <div class="controls">
            <select data-device="${i}"><option value="desktop"${s.device === "desktop" ? " selected" : ""}>Desktop</option><option value="mobile"${s.device === "mobile" ? " selected" : ""}>Mobile</option></select>
            <button class="btn small danger" data-remove="${i}">Remove</button>
          </div>
        </div>`,
      )
      .join("");
    $("screens").querySelectorAll("[data-caption]").forEach((el) =>
      el.addEventListener("input", () => (state.screens[el.dataset.caption].caption = el.value)),
    );
    $("screens").querySelectorAll("[data-device]").forEach((el) =>
      el.addEventListener("change", () => (state.screens[el.dataset.device].device = el.value)),
    );
    $("screens").querySelectorAll("[data-remove]").forEach((el) =>
      el.addEventListener("click", () => {
        state.screens.splice(Number(el.dataset.remove), 1);
        renderScreens();
      }),
    );
    let from = null;
    $("screens").querySelectorAll(".screen-item").forEach((el) => {
      el.addEventListener("dragstart", () => {
        from = Number(el.dataset.i);
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
      el.addEventListener("dragover", (e) => e.preventDefault());
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const to = Number(el.dataset.i);
        if (from === null || from === to) return;
        const [moved] = state.screens.splice(from, 1);
        state.screens.splice(to, 0, moved);
        renderScreens();
      });
    });
  };

  wireDrop($("screensDrop"), $("screensFile"), async (files) => {
    for (const file of files.filter((f) => /^image\//.test(f.type))) {
      const img = await loadImage(file);
      state.screens.push({ file, ...img, caption: "", device: img.height > img.width ? "mobile" : "desktop" });
    }
    renderScreens();
  });

  wireDrop($("musicDrop"), $("musicFile"), ([file]) => {
    if (!file) return;
    state.music = file;
    $("musicDrop").textContent = `♪ ${file.name}`;
  });

  $("create").addEventListener("click", async () => {
    const slug = $("slug").value.trim();
    const story = $("story").value.trim();
    const problems = [];
    if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)) problems.push("a folder name (lowercase letters, numbers, hyphens)");
    if (!story) problems.push("the story");
    if (!state.avatar) problems.push("an avatar image");
    if (!state.screens.length) problems.push("at least one screenshot");
    if (problems.length) return toast(`Still needed: ${problems.join(", ")}.`, 4000);

    const btn = $("create");
    const bar = document.querySelector(".progress");
    btn.disabled = true;
    bar.hidden = false;
    const total = 2 + state.screens.length + (state.music ? 1 : 0);
    let done = 0;
    const tick = (label) => {
      done++;
      bar.firstElementChild.style.width = `${(done / total) * 100}%`;
      $("createNote").textContent = label;
    };
    const ext = (f) => (f.type === "image/jpeg" ? "jpg" : f.type === "image/webp" ? "webp" : "png");
    const put = (rel, file) => api("PUT", `/api/p/${slug}/file?path=${encodeURIComponent(rel)}`, file, true);

    try {
      await api("POST", "/api/projects", { slug });
      const avatarPath = `avatar/avatar.${ext(state.avatar.file)}`;
      await put(`public/${avatarPath}`, state.avatar.file);
      tick("Uploaded the avatar");

      const screens = [];
      for (const [i, s] of state.screens.entries()) {
        const name = `${String(i + 1).padStart(2, "0")}-${slugify(s.caption || s.file.name.replace(/\.[^.]+$/, "")) || "screen"}.${ext(s.file)}`;
        await put(`public/screens/${name}`, s.file);
        screens.push({ id: `s${i + 1}`, src: `screens/${name}`, caption: s.caption, device: s.device, width: s.width, height: s.height });
        tick(`Uploaded screenshot ${i + 1}`);
      }
      if (state.music) {
        await put("assets/audio/bg.mp3", state.music);
        tick("Uploaded the music");
      }

      await api("PUT", `/api/p/${slug}/intake`, {
        title: $("title").value.trim() || slug,
        product: $("product").value.trim(),
        url: $("url").value.trim(),
        audience: $("audience").value.trim(),
        notes: $("notes").value.trim(),
        story,
        presenter: { name: $("pname").value.trim(), role: $("prole").value.trim() },
        avatar: avatarPath,
        screens,
        music: Boolean(state.music),
        formats: [$("f169").checked && "16x9", $("f916").checked && "9x16"].filter(Boolean),
        voice: readVoice(),
        soundEffects: $("sfxOn").checked,
        presenterEngine: $("engine").value,
      });
      tick("Saved");
      location.hash = `#/p/${slug}`;
    } catch (err) {
      toast(err.message, 5000);
      btn.disabled = false;
    }
  });
}

/* ── Project ─────────────────────────────────────────────────────────────── */

async function viewProject(slug) {
  app.innerHTML = `<p class="muted">Loading…</p>`;
  let last = "";
  let draftNote = "";
  let draftVoice = null;
  let readVoice = null;
  const meta = await loadVoices().catch(() => null);

  const render = async () => {
    let st;
    try {
      st = await api("GET", `/api/p/${encodeURIComponent(slug)}/status`);
    } catch (err) {
      app.innerHTML = `<div class="alert danger">${esc(err.message)}</div>`;
      stopPolling();
      return;
    }
    const key = JSON.stringify(st);
    if (key === last) return;
    last = key;
    const noteEl = document.getElementById("approveNote");
    if (noteEl) draftNote = noteEl.value;
    if (readVoice) draftVoice = readVoice();
    const y = scrollY;
    app.innerHTML = projectHtml(st, draftNote);
    const vp = document.getElementById("voicePicker");
    if (vp && meta) {
      vp.innerHTML = voicePickerHtml(draftVoice ?? st.intake?.voice, meta);
      readVoice = wireVoicePicker(vp, meta, () => previewSample(st.intake?.story));
    } else readVoice = null;
    scrollTo(0, y);
    wireProject(st);
  };

  const wireProject = (st) => {
    document.getElementById("saveVoice")?.addEventListener("click", async () => {
      await api("PUT", `/api/p/${slug}/intake`, { voice: readVoice() });
      draftVoice = null;
      toast(st.vo ? "Saved. Ask Claude to re-voice (tts.mjs --force), then re-time and re-slice." : "Voice saved.", 5000);
      render();
    });
    document.getElementById("saveEngine")?.addEventListener("click", async () => {
      await api("PUT", `/api/p/${slug}/intake`, { presenterEngine: document.getElementById("engineSel").value });
      toast(st.vo ? "Saved. The voiceover and presenter must be regenerated for this to take effect." : "Saved.", 5000);
      render();
    });
    document.getElementById("sfxToggle")?.addEventListener("change", async (e) => {
      await api("PUT", `/api/p/${slug}/intake`, { soundEffects: e.target.checked });
      toast(st.timeline ? "Saved. Takes effect when Claude re-runs demo-timing.mjs." : "Saved.");
      render();
    });
    document.getElementById("copyNext")?.addEventListener("click", () => {
      const cmd = st.next.match(/run:\s+(.+)$/)?.[1];
      navigator.clipboard.writeText(cmd ?? st.next).then(() => toast("Copied"));
    });
    document.getElementById("approve")?.addEventListener("click", async () => {
      try {
        await api("POST", `/api/p/${slug}/approve`, {
          note: document.getElementById("approveNote")?.value ?? "",
          noPhi: document.getElementById("noPhi")?.checked ?? false,
        });
        toast("Approved. Run /demo-build in Claude Code.");
        render();
      } catch (err) {
        toast(err.message, 4500);
      }
    });
    document.getElementById("unapprove")?.addEventListener("click", async () => {
      await api("DELETE", `/api/p/${slug}/approve`);
      toast("Approval withdrawn. Tell Claude what to change.");
      render();
    });
    document.querySelectorAll("[data-retake]").forEach((el) =>
      el.addEventListener("click", async () => {
        const note = prompt("What is wrong with this clip? (Claude reads this before regenerating it)", "Mouth out of sync");
        if (note === null) return;
        await api("POST", `/api/p/${slug}/retake`, { scene: el.dataset.retake, note });
        toast("Flagged. Ask Claude to regenerate flagged clips.");
        render();
      }),
    );
    document.querySelectorAll("[data-upload]").forEach((el) =>
      el.addEventListener("change", async () => {
        const file = el.files[0];
        if (!file) return;
        const extn = file.name.split(".").pop().toLowerCase();
        const rel = `assets/avatar/raw/${el.dataset.upload}.${["mov", "webm"].includes(extn) ? extn : "mp4"}`;
        try {
          await api("PUT", `/api/p/${slug}/file?path=${encodeURIComponent(rel)}`, file, true);
          toast("Clip uploaded. Claude normalises it on the next build step.");
        } catch (err) {
          toast(err.message, 4500);
        }
      }),
    );
  };

  await render();
  pollTimer = setInterval(render, 3000);
}

const file = (slug, rel) => `/files/${encodeURIComponent(slug)}/${rel.split("/").map(encodeURIComponent).join("/")}`;

function projectHtml(st, draftNote) {
  const { slug, intake, plan, approved, jobs, stills, renders, steps, next } = st;
  const screens = new Map((intake?.screens ?? []).map((s) => [s.id, s]));
  const cmd = next.match(/run:\s+(.+)$/)?.[1];

  const stepHtml = steps
    .map((s) => `<span class="step ${s.done ? "done" : ""} ${s.warn ? "warn" : ""}"><span class="ico">${s.warn ? "!" : s.done ? "✓" : ""}</span>${esc(s.label)}</span>`)
    .join("");

  const shot = (scene) => {
    const scr = scene.screen ? screens.get(scene.screen) : null;
    if (!scr) {
      const what = scene.type === "cta" ? "Closing card" : "Presenter on camera";
      return `<div class="nopic">${what}${scene.avatar && scene.avatar !== "none" ? `<br><img src="${file(slug, "public/" + (intake.avatar ?? ""))}" alt="" style="width:80px;height:80px;border-radius:999px;object-fit:cover;margin-top:10px">` : ""}</div>`;
    }
    const boxes = (scene.focus ?? [])
      .map(
        (f) => `<div class="box ${esc(f.action)}" style="left:${Number(f.box[0]) * 100}%;top:${Number(f.box[1]) * 100}%;width:${Number(f.box[2]) * 100}%;height:${Number(f.box[3]) * 100}%">
          <span>${esc(f.action)} · "${esc(f.onWords)}"</span></div>`,
      )
      .join("");
    return `<div class="shot ${scr.device === "mobile" ? "mobile" : ""}"><img src="${file(slug, "public/" + scr.src)}" alt="${esc(scr.caption)}" />${boxes}</div>`;
  };

  const issues = [];
  if (plan?.validationErrors?.length) issues.push(["danger", "Problems in the plan — ask Claude to fix these before approving", plan.validationErrors]);
  if (plan?.phiCheck?.length) issues.push(["danger", "Possible real patient data in the screenshots", plan.phiCheck.map((p) => `${p.screen}: ${p.concern}`)]);
  if (plan?.risks?.length) issues.push(["warn", "Flagged for review", plan.risks]);
  if (plan?.suggestedEdits?.length) issues.push(["warn", "Suggested edits to the story (not applied — tell Claude which to take)", plan.suggestedEdits]);

  const planHtml = plan
    ? `<div class="card">
        <h2>Storyboard</h2>
        ${issues.map(([k, t, l]) => `<div class="alert ${k}"><strong>${esc(t)}</strong><ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
        ${plan.scenes
          .map(
            (s, i) => `<div class="scene">
              <div>
                <h3>${i + 1}. ${esc(s.id)}</h3>
                <div class="badges"><span class="badge">${esc(s.type)}</span><span class="badge">presenter: ${esc(s.avatar)}</span>${s.screen ? `<span class="badge">${esc(s.screen)}</span>` : ""}</div>
                <p class="says">“${esc((s.voiceoverSentences ?? []).join(" "))}”</p>
                ${s.headline?.text ? `<p class="small"><strong>On screen:</strong> ${esc(s.headline.text)}</p>` : ""}
                ${(s.focus ?? []).map((f) => `<p class="small muted">${esc(f.action)} on “${esc(f.onWords)}”${f.label ? ` — label “${esc(f.label)}”` : ""}</p>`).join("")}
                ${(() => {
                  const t = (plan.transitions ?? []).find((x) => x.from === s.id);
                  return t ? `<p class="small muted">↓ ${esc(t.style)}</p>` : "";
                })()}
              </div>
              <div>${shot(s)}</div>
            </div>`,
          )
          .join("")}
        <p class="small"><strong>Closing card:</strong> ${esc(plan.cta?.headline)} · [${esc(plan.cta?.button)}] · ${esc(plan.cta?.url)}</p>
        <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
        ${
          approved
            ? `<p>✓ Approved ${esc(new Date(approved.approvedAt).toLocaleString())}${approved.note ? ` — “${esc(approved.note)}”` : ""}</p>
               <button class="btn small" id="unapprove">Withdraw approval</button>`
            : `<div class="field"><label for="approveNote">Notes for Claude (optional)</label><input id="approveNote" type="text" value="${esc(draftNote)}" placeholder="e.g. slow the zoom on the summary panel" /></div>
               ${plan.phiCheck?.length ? `<label style="font-weight:500"><input type="checkbox" id="noPhi"> I have checked: these screenshots contain no real patient data</label><br>` : ""}
               <button class="btn primary" id="approve">Approve storyboard</button>
               <span class="hint">&nbsp;Want changes instead? Tell Claude in chat — the storyboard here updates by itself.</span>`
        }
      </div>`
    : "";

  const omni = intake?.presenterEngine === "omni";
  const voiceHtml = `<div class="card"><h2>Presenter, voice and sound</h2>
      <div class="field">
        <label for="engineSel">How the presenter is made</label>
        <div style="display:flex;gap:10px;align-items:center">${engineSelectHtml("engineSel", intake?.presenterEngine)}<button class="btn small" id="saveEngine">Save</button></div>
        ${omni ? `<div class="hint">${esc(OMNI_NOTE)}</div>` : ""}
      </div>
      ${
        omni
          ? `<p class="hint">The voice comes from the Omni take, so there is no voice to pick. Claude films it with <code>omni-presenter.mjs</code> during <code>/demo-build</code>.</p>`
          : `${
        st.vo
          ? `<p class="small"><strong>Voiceover</strong></p><audio src="${file(slug, st.vo.path)}?t=${st.vo.at}" controls preload="none" style="width:100%"></audio>
             <p class="hint">Already voiced. Changing the voice below means re-voicing, which re-times the demo and regenerates every presenter clip.</p>`
          : ""
      }
      <div id="voicePicker"><p class="muted small">Voice options unavailable.</p></div>
      <div style="margin-top:12px"><button class="btn small primary" id="saveVoice">Save voice</button></div>`
      }
      <label style="font-weight:500;margin-top:14px"><input type="checkbox" id="sfxToggle"${intake?.soundEffects === false ? "" : " checked"}> Sound effects (whoosh on cuts, click on buttons, ding on the closing card)</label>
    </div>`;

  const takeHtml = st.take
    ? `<div class="card"><h2>Presenter take (Gemini Omni Flash)</h2>
        <video src="${file(slug, st.take.path)}?t=${st.take.at}" controls playsinline preload="metadata" style="width:100%;max-width:720px;border-radius:10px;background:#000"></video>
        <p class="hint">The picture plays muted in the demo; its sound is the voiceover. ${st.take.meta ? `${esc(st.take.meta.resolution ?? "")} · ${Number(st.take.meta.seconds ?? 0).toFixed(1)}s.` : ""}
        Not right? Ask Claude to re-film it (<code>omni-presenter.mjs --force</code>).</p></div>`
    : "";

  const jobsHtml = !omni && jobs.length
    ? `<div class="card"><h2>Presenter clips</h2>
        <p class="muted small">Lip-synced by Higgsfield to slices of the one voiceover. Flag any that look wrong.</p>
        <div class="jobs">${jobs
          .map(
            (j) => `<div class="job">
              <p><strong>${esc(j.scene)}</strong> <span class="pill ${esc(j.status)}">${esc(j.status)}</span> <span class="muted small">${Number(j.seconds)}s · ${esc(j.layout)}</span></p>
              ${j.status === "done" || j.status === "retake" ? `<video src="${file(slug, j.clip)}?v=${encodeURIComponent(j.status + (j.note ?? ""))}" controls muted playsinline preload="metadata"></video>` : ""}
              <audio src="${file(slug, j.audio)}" controls preload="none"></audio>
              ${j.note ? `<p class="small muted">${esc(j.note)}</p>` : ""}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${j.status === "done" ? `<button class="btn small" data-retake="${esc(j.scene)}">Flag retake</button>` : ""}
                <label class="btn small">Upload clip<input type="file" accept="video/*" data-upload="${esc(j.scene)}" hidden></label>
              </div>
            </div>`,
          )
          .join("")}</div></div>`
    : "";

  const stillsHtml = stills.length
    ? `<div class="card"><h2>Review stills</h2><div class="stills">${stills.map((s) => `<a href="${file(slug, s)}" target="_blank"><img src="${file(slug, s)}" alt="${esc(s)}" loading="lazy"></a>`).join("")}</div></div>`
    : "";

  const finals = renders.filter((r) => !r.path.includes("-draft"));
  const shown = finals.length ? finals : renders;
  const rendersHtml = shown.length
    ? `<div class="card"><h2>${finals.length ? "Renders" : "Draft renders"}</h2><div class="renders">${shown
        .map(
          (r) => `<div><video src="${file(slug, r.path)}?t=${r.at}" controls playsinline preload="metadata"></video>
            <p class="small"><a href="${file(slug, r.path)}" download>${esc(r.path.split("/").pop())}</a> · ${(r.bytes / 1024 / 1024).toFixed(1)} MB</p></div>`,
        )
        .join("")}</div></div>`
    : "";

  return `
    <h1>${esc(intake?.title ?? slug)}</h1>
    <p class="muted small">${esc(st.dir)}</p>
    <div class="steps">${stepHtml}</div>
    <div class="next card" style="padding:14px 16px">
      <span>${cmd ? `Next — in Claude Code, run <code>${esc(cmd)}</code>` : esc(next)}</span>
      ${cmd ? `<button class="btn small" id="copyNext">Copy</button>` : ""}
    </div>
    ${rendersHtml}
    ${planHtml}
    ${intake?.story ? voiceHtml : ""}
    ${takeHtml}
    ${jobsHtml}
    ${stillsHtml}
    ${
      !plan && intake?.story
        ? `<div class="card"><h2>Intake</h2><p class="says">“${esc(intake.story)}”</p><div class="stills">${(intake.screens ?? [])
            .map((s) => `<img src="${file(slug, "public/" + s.src)}" alt="${esc(s.caption)}" title="${esc(s.caption)}">`)
            .join("")}</div></div>`
        : ""
    }`;
}
