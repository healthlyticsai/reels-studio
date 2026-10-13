/**
 * The shape of a demo's timeline, as `scripts/demo-timing.mjs` writes it into
 * src/demoTimeline.ts. Every frame number here is anchored to the transcribed
 * voiceover; nothing is estimated.
 */
import type { HeadlineAnim, Mark } from "./components/Type";
import type { LaptopMotion } from "./components/LaptopFrame";

/** A rectangle in the screenshot's own coordinates, each value 0–1. */
export type Box = [x: number, y: number, w: number, h: number];

export type FocusAction = "zoom" | "highlight" | "click";

export type Focus = {
  /** Scene-local frame the action starts — the frame its anchor word is spoken. */
  at: number;
  /** Scene-local frame it lets go. Defaults to the next focus, or the scene end. */
  until?: number;
  box: Box;
  action: FocusAction;
  /** Optional callout pill beside the box. Sentence case, a few words. */
  label?: string;
  /** The word this is pinned to, kept for the person reading the file. */
  onWords?: string;
};

export type Screen = {
  /** Path under public/, e.g. "screens/01-dashboard.png". */
  src: string;
  /** A laptop is the product-film look: a 3D laptop that turns and tilts. */
  device: "desktop" | "mobile" | "laptop";
  /** Pixel size of the screenshot, so zoom boxes land exactly. */
  width: number;
  height: number;
  /** Shown in the browser bar for desktop screens. */
  url?: string;
};

export type AvatarLayout = "full" | "bubble" | "split" | "none";

export type Avatar = {
  layout: AvatarLayout;
  /** Path under public/, e.g. "avatar/intro.mp4". Absent until the clip exists. */
  clip?: string;
  /**
   * Scene-local frame the clip's first frame belongs to. Usually a little
   * negative: the audio slice sent to Higgsfield starts with some padding
   * before the scene does.
   */
  clipFrom: number;
  /** Bubble corner; picked away from the focus boxes when absent. */
  corner?: "left" | "right";
  /**
   * Scene-local frames where a full-frame presenter shot jump-cuts between a wide
   * and a close framing — one per new sentence, the way founder videos are cut.
   */
  cuts?: number[];
};

export type Headline = {
  text: string;
  /** Words inside `text` that take the gradient and the mark. */
  emphasis?: string;
  mark?: Mark["kind"] | "none";
  /** Scene-local frame the first word lands. */
  at: number;
  /** "glow" is the product-film look (default on laptop scenes); "marker" the reel headline. */
  style?: "glow" | "marker";
};

export type SceneType = "avatar" | "screen" | "split" | "cta";

export type DemoScene = {
  id: string;
  type: SceneType;
  /** Absolute frame this scene's narration starts. */
  from: number;
  /** Frames of narration it covers (not counting the transition after it). */
  duration: number;
  /** The sentences this scene covers, verbatim. */
  says: string;
  avatar: Avatar;
  screen?: Screen;
  focus: Focus[];
  headline?: Headline;
  eyebrow?: string;
  typeAnim: HeadlineAnim;
  /** Laptop camera move for this scene. */
  motion?: LaptopMotion;
  /** Cross-fade the screen to a second screenshot at a scene-local frame. */
  nextScreen?: { screen: Screen; at: number };
  /** A checklist that builds line by line, each item on its own frame. */
  list?: { items: { text: string; at: number }[] };
  /** Transition into the next scene. Absent on the last scene. */
  transition?: { style: TransitionStyle; frames: number };
};

export type TransitionStyle =
  | "cut"
  | "fade"
  | "slide"
  | "tornPaper"
  | "inkSplatter"
  | "cardPush"
  | "stackShuffle"
  | "halftoneDissolve"
  | "whipPan"
  | "barWipe"
  | "zoomPunch"
  | "glitchSlice"
  | "irisWipe"
  | "shutterSlats"
  | "filmBurn"
  | "colorFlash"
  | "pathWipe";

export type Cta = {
  headline: string;
  emphasis?: string;
  button: string;
  url: string;
  badge?: string;
};

export type SfxHit = { at: number; file: string; volume: number; rate?: number };

export type Presenter = { name?: string; role?: string };
