/**
 * The look of this demo, in one place.
 *
 * `scripts/direction.mjs` draws a look for every project and writes it to
 * direction.json. Copy the backdrop and camera ids here once, at the start of
 * the build. Demos keep the camera gentle — the screenshot zooms already move
 * the frame, and a strong push on top of them reads as seasick.
 */
import type { BackdropVariant } from "./components/Backdrop";
import type { LaptopFinish } from "./components/LaptopFrame";

/** From direction.json → artDirection.backdrop. `cleanStudio` suits most product demos. */
export const BACKDROP: BackdropVariant = "cleanStudio";

/** From direction.json → cameraLanguage. Prefer `locked` or `drift` for demos. */
export const CAMERA: "locked" | "pushIn" | "drift" | "parallax" | "sideDolly" = "locked";

/** The 3D laptop's finish. Space black frames a light product UI most elegantly. */
export const LAPTOP_FINISH: LaptopFinish = "spaceBlack";
