/**
 * Text-to-speech providers for demo mode. `tts.mjs` voices the approved script
 * with these; the Studio uses the same function for its voice preview, so what
 * you audition is exactly what the build produces.
 *
 *   google      Google Cloud Text-to-Speech, Chirp 3 HD voices. The default.
 *               Auth: GOOGLE_TTS_API_KEY if set, otherwise a token from the
 *               gcloud CLI — application-default credentials first, then the
 *               user login — billed to GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID
 *               when set (otherwise to the credentials' own quota project).
 *   elevenlabs  ElevenLabs, usually with a cloned voice.
 *               Auth: ELEVENLABS_API_KEY; voice from the intake or ELEVENLABS_VOICE_ID.
 *
 * Both return MP3 bytes.
 */
import { execFileSync } from "child_process";
import { envValue } from "./env.mjs";

export const PROVIDERS = ["google", "elevenlabs"];

/** Chirp 3 HD voices (the part after `<locale>-Chirp3-HD-`), with gender. */
export const CHIRP_VOICES = [
  ["Achernar", "F"], ["Achird", "M"], ["Algenib", "M"], ["Algieba", "M"], ["Alnilam", "M"],
  ["Aoede", "F"], ["Autonoe", "F"], ["Callirrhoe", "F"], ["Charon", "M"], ["Despina", "F"],
  ["Enceladus", "M"], ["Erinome", "F"], ["Fenrir", "M"], ["Gacrux", "F"], ["Iapetus", "M"],
  ["Kore", "F"], ["Laomedeia", "F"], ["Leda", "F"], ["Orus", "M"], ["Pulcherrima", "F"],
  ["Puck", "M"], ["Rasalgethi", "M"], ["Sadachbia", "M"], ["Sadaltager", "M"], ["Schedar", "M"],
  ["Sulafat", "F"], ["Umbriel", "M"], ["Vindemiatrix", "F"], ["Zephyr", "F"], ["Zubenelgenubi", "M"],
];

export const CHIRP_LOCALES = ["en-US", "en-GB", "en-AU", "en-IN"];

export const DEFAULT_VOICE = {
  provider: "google",
  languageCode: "en-US",
  voiceName: "en-US-Chirp3-HD-Charon",
  speed: 1,
};

/** Which provider a project uses: explicit choice, then the intake, then TTS_PROVIDER, then Google. */
export const resolveProvider = (explicit, intake, cwd) => {
  const p = explicit || intake?.voice?.provider || envValue("TTS_PROVIDER", cwd) || "google";
  if (!PROVIDERS.includes(p)) throw new Error(`Unknown TTS provider "${p}" — use ${PROVIDERS.join(" or ")}.`);
  return p;
};

/** An OAuth token from gcloud: application-default credentials, then the user login. */
const gcloudToken = () => {
  for (const args of [["auth", "application-default", "print-access-token"], ["auth", "print-access-token"]]) {
    try {
      const token = execFileSync("gcloud", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (token) return token;
    } catch {
      /* try the next one */
    }
  }
  return null;
};

/** Human-readable "what is missing" for a provider, or null when it is ready. */
export const providerProblem = (provider, cwd) => {
  if (provider === "elevenlabs") {
    const missing = ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"].filter((k) => !envValue(k, cwd));
    return missing.length ? `${missing.join(" and ")} not set` : null;
  }
  if (envValue("GOOGLE_TTS_API_KEY", cwd) || gcloudToken()) return null;
  return "no GOOGLE_TTS_API_KEY, and gcloud has no credentials (run `gcloud auth application-default login`, or set the key)";
};

/* ── Google Cloud TTS ────────────────────────────────────────────────────── */

// A synchronous request takes at most 5,000 bytes of input. Longer scripts are
// voiced sentence-group by sentence-group and the MP3s joined, which MP3's
// frame format allows without re-encoding.
const MAX_BYTES = 4500;

const chunk = (text) => {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const out = [];
  let cur = "";
  for (const s of sentences) {
    if (Buffer.byteLength(cur + s) > MAX_BYTES && cur) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

const google = async ({ text, voice, cwd }) => {
  const languageCode = voice?.languageCode || DEFAULT_VOICE.languageCode;
  const name = voice?.voiceName || `${languageCode}-Chirp3-HD-Charon`;
  const key = envValue("GOOGLE_TTS_API_KEY", cwd);
  const headers = { "Content-Type": "application/json" };
  let url = "https://texttospeech.googleapis.com/v1/text:synthesize";
  if (key) {
    url += `?key=${encodeURIComponent(key)}`;
  } else {
    const token = gcloudToken();
    if (!token) throw new Error("Google TTS: no GOOGLE_TTS_API_KEY and no gcloud credentials.");
    headers.Authorization = `Bearer ${token}`;
    const project = envValue("GOOGLE_CLOUD_PROJECT", cwd) || envValue("GCP_PROJECT_ID", cwd);
    if (project) headers["x-goog-user-project"] = project;
  }

  const parts = [];
  for (const piece of chunk(text)) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: { text: piece },
        voice: { languageCode, name },
        audioConfig: { audioEncoding: "MP3", speakingRate: Number(voice?.speed) || 1 },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.audioContent) {
      throw new Error(`Google TTS returned ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 400)}`);
    }
    parts.push(Buffer.from(body.audioContent, "base64"));
  }
  return Buffer.concat(parts);
};

/* ── ElevenLabs ──────────────────────────────────────────────────────────── */

const elevenlabs = async ({ text, voice, cwd }) => {
  const key = envValue("ELEVENLABS_API_KEY", cwd);
  const voiceId = voice?.voiceId || envValue("ELEVENLABS_VOICE_ID", cwd);
  if (!key || !voiceId) throw new Error("ElevenLabs needs ELEVENLABS_API_KEY and a voice ID (intake or ELEVENLABS_VOICE_ID).");
  const model = voice?.model || envValue("ELEVENLABS_MODEL_ID", cwd) || "eleven_multilingual_v2";

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_192`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: model,
      // Steadier than the defaults: a product demo wants the same even read
      // from the first sentence to the last, not a performance.
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.1,
        use_speaker_boost: true,
        speed: Number(voice?.speed) || 1,
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return Buffer.from(await res.arrayBuffer());
};

/** Voice `text` with `provider`; returns MP3 bytes. */
export const synthesize = ({ provider, text, voice, cwd = process.cwd() }) =>
  (provider === "elevenlabs" ? elevenlabs : google)({ text, voice, cwd });

/** One line describing the voice, for logs. */
export const describeVoice = (provider, voice, cwd) =>
  provider === "elevenlabs"
    ? `ElevenLabs voice ${(voice?.voiceId || envValue("ELEVENLABS_VOICE_ID", cwd) || "?").slice(0, 8)}…`
    : `Google ${voice?.voiceName || DEFAULT_VOICE.voiceName}`;
