/**
 * Master timeline.
 *
 * Every boundary here is anchored to the actual voiceover, transcribed to
 * word-level timestamps in src/captions.json by scripts/transcribe.mjs. The
 * numbers below are a two-scene placeholder matching the example scenes —
 * replace them with the real frame ranges the transcript prints, and leave a
 * comment naming the sentence each one covers so the next person knows what it
 * is pinned to.
 *
 * Do not use plan.json's second estimates. They were written before the
 * voiceover existed and real delivery drifts by seconds; a reel cut to the
 * estimate feels laid over the narration rather than cut to it.
 */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Seconds to frames. */
export const s = (sec: number) => Math.round(sec * FPS);

/**
 * Transition lengths, in frames. One entry per adjacent scene pair — a five
 * scene reel has four. 16 to 22 frames is the useful range: shorter reads as a
 * glitch, longer starts to feel like a transition for its own sake.
 */
export const TRANSITIONS = {
  problemToCta: 18,
} as const;

/**
 * Voiceover spans. `from` is where each scene's local frame 0 lands, taken
 * straight from the transcript's sentence table.
 *
 * A real reel is usually four to six scenes. Extend like this:
 *
 *   problem:  { from: 0,    duration: 342 },   // "For every single hour…"
 *   solution: { from: 342,  duration: 454 },   // "But what if…"
 *   proof:    { from: 796,  duration: 492 },   // "Here is where it changes…"
 *   cta:      { from: 1288, duration: 388 },   // "Listen. Structure. Sync…"
 */
export const SCENES = {
  /** "<the sentence this scene covers>" */
  problem: { from: 0, duration: 342 },
  /** "<the sentence this scene covers>" */
  cta: { from: 342, duration: 388 },
} as const;

/**
 * Rendered length of each scene: its voiceover span plus the transition that
 * follows it. `TransitionSeries` overlaps scenes, drawing a transition of
 * length `t` during the outgoing scene's last `t` frames — so this addition is
 * what keeps every scene's local frame 0 exactly on its voiceover boundary.
 * The final scene gets no addition.
 */
export const SCENE_DURATION = {
  problem: SCENES.problem.duration + TRANSITIONS.problemToCta,
  cta: SCENES.cta.duration,
} as const;

/**
 * Derived rather than written down, so it cannot drift out of sync when the
 * scene boundaries are re-cut. TransitionSeries subtracts the overlaps back
 * out, so the total is just the sum of the voiceover spans.
 */
export const TOTAL =
  Object.values(SCENE_DURATION).reduce((a, b) => a + b, 0) -
  Object.values(TRANSITIONS).reduce((a, b) => a + b, 0);

/**
 * Frame the narration stops, so the music can lift and the reel can settle.
 * Take this from the transcript's last word, not by guessing.
 */
export const VO_END = TOTAL - 43;

/**
 * Safe margins for a 9:16 feed post. The bottom band is reserved for burned-in
 * captions — keep all scene content above y=1620 or it renders under a caption
 * pill. This is the most common layout bug in the format.
 */
export const SAFE = { x: 84, top: 150, bottom: 300 } as const;
