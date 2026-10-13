/**
 * The demo's timeline.
 *
 * `scripts/demo-timing.mjs` overwrites this file from plan.json and the
 * transcribed voiceover, anchoring every scene boundary and every focus action
 * to the frame its word is spoken. This placeholder is a single closing card so
 * a fresh project compiles and renders before any of that exists.
 */
import type { Cta, DemoScene, Presenter, SfxHit } from "./demoSpec";

export const FPS = 30;

/** The still the avatar clips are lip-synced from, under public/. Shown until a clip exists. */
export const AVATAR_STILL = "avatar/avatar.png";

/** False until assets/audio/vo.mp3 exists. */
export const HAS_VO = false;

/** False when no bg.mp3 was supplied — the demo then plays on voice alone. */
export const MUSIC = false;

export const SCENES: DemoScene[] = [
  {
    id: "cta",
    type: "cta",
    from: 0,
    duration: 150,
    says: "",
    avatar: { layout: "none", clipFrom: 0 },
    focus: [],
    headline: { text: "Your demo goes here.", emphasis: "demo", mark: "highlight", at: 10 },
    typeAnim: "punch",
  },
];

export const TOTAL = SCENES.reduce((sum, s) => sum + s.duration, 0);

/** Frame the narration stops, from the transcript's last word. */
export const VO_END = TOTAL - 45;

export const CTA: Cta = { headline: "Your demo goes here.", emphasis: "demo", button: "Book a demo", url: "" };

export const PRESENTER: Presenter = {};

export const SFX: SfxHit[] = [];
