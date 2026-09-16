/**
 * The creative direction for this reel, in one place.
 *
 * `scripts/direction.mjs` draws a look for every new reel and writes it to
 * direction.json at the project root. Copy the relevant ids here once, at the
 * start of the build, and every scene reads them from this file — so restyling
 * a whole reel is a one-line change rather than an edit per scene.
 *
 * Read direction.json for the full description of each pick: what the art
 * direction means, how the edit is meant to cut, what the three motion motifs
 * are for. This file only carries the values the code needs.
 */
import type { BackdropVariant } from "./components/Backdrop";
import type { HeadlineAnim } from "./components/Type";

/** From direction.json → artDirection.backdrop */
export const BACKDROP: BackdropVariant = "paperCollage";

/** From direction.json → cameraLanguage. Passed to <CameraMove mode={...} />. */
export const CAMERA: "locked" | "pushIn" | "drift" | "parallax" | "sideDolly" = "pushIn";

/**
 * One entry per scene, in scene order, from each scene's `typeSystem` in the
 * plan. Adjacent entries must differ — that is the rule the whole variation
 * system exists to enforce, and it is easiest to check when they are listed
 * together like this.
 */
export const SCENE_TYPE_ANIM: Record<string, HeadlineAnim> = {
  problem: "punch",
  cta: "riseMask",
};
