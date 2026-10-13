import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * A laptop built in CSS 3D: a lid with the screenshot on its screen, hinged to a
 * keyboard deck, turned and tilted by a camera move. Nothing is rendered or
 * generated — the screen is the real PNG, so every pixel of the product stays
 * exact while the laptop swings, tilts and rises the way a product film does.
 *
 * Geometry is in units of the lid width, so the same laptop reads the same in
 * a 16:9 and a 9:16 frame. The hinge sits at the wrapper's `hingeY`; the lid
 * stands above it and the deck lies flat towards the camera, so a camera above
 * the desk (a positive `tilt`) sees the keyboard below the screen.
 */

export type LaptopMotion = "swingIn" | "tiltBack" | "riseUp" | "float" | "front";

export type LaptopPose = {
  /** Degrees the camera looks down on the desk. 10 is nearly straight on. */
  tilt: number;
  /** Degrees the laptop has turned on the desk; negative shows its left side. */
  turn: number;
  /** Degrees the lid leans back past vertical. */
  lid: number;
  /** Vertical offset, as a fraction of the lid height. */
  y: number;
  scale: number;
  opacity: number;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * The camera moves. Each settles into a pose that is close to straight on by
 * the time the scene's focus actions start, because zooms and clicks read best
 * on a screen that faces the viewer.
 */
export const useLaptopPose = (motion: LaptopMotion, duration: number, enterAt = 0): LaptopPose => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - enterAt;
  const settle = spring({ frame: f, fps, config: { damping: 22, stiffness: 70, mass: 1 } });
  const t = interpolate(f, [0, Math.max(1, duration)], [0, 1], clamp);
  const fadeIn = interpolate(f, [0, 8], [0, 1], clamp);

  switch (motion) {
    case "swingIn":
      // In from the left side, low and small, turning to face the camera.
      return {
        tilt: interpolate(settle, [0, 1], [30, 14]),
        turn: interpolate(settle, [0, 1], [-46, -7]) + t * 9,
        lid: 12,
        y: interpolate(settle, [0, 1], [0.45, 0]),
        scale: interpolate(settle, [0, 1], [0.72, 1]),
        opacity: fadeIn,
      };
    case "tiltBack":
      // Starts facing you, then leans away and turns, like the screen is being shown off.
      return {
        // A steeper camera grows the deck towards the lens, so the laptop shrinks
        // and rises as it tilts to stay inside the frame.
        tilt: interpolate(t, [0, 1], [14, 25], { easing: (x) => x * x * (3 - 2 * x) }),
        turn: interpolate(t, [0, 1], [-3, 16], { easing: (x) => x * x * (3 - 2 * x) }),
        lid: 12,
        y: interpolate(t, [0, 1], [0, -0.06]),
        scale: interpolate(t, [0, 1], [1, 0.86]),
        opacity: fadeIn,
      };
    case "riseUp":
      // Rises from below the frame and parks low, leaving the top for type.
      return {
        tilt: 20,
        turn: interpolate(t, [0, 1], [-4, 4]),
        lid: 10,
        y: interpolate(settle, [0, 1], [0.95, 0.24]),
        scale: 1,
        opacity: 1,
      };
    case "float":
      return {
        tilt: 15 + Math.sin(frame / 70) * 2,
        turn: Math.sin(frame / 55) * 6,
        lid: 12,
        y: Math.sin(frame / 45) * 0.012,
        scale: 1,
        opacity: fadeIn,
      };
    case "front":
    default:
      return { tilt: 10, turn: 0, lid: 8, y: 0, scale: 1, opacity: fadeIn };
  }
};

export type LaptopFinish = "spaceBlack" | "silver";

/** Anodised colours. Space black is the default: it frames a light UI best. */
const FINISH: Record<LaptopFinish, {
  deck: string; deckShadow: string; well: string; key: string; keyEdge: string;
  pad: string; padEdge: string; lidEdge: string; lip: string;
}> = {
  spaceBlack: {
    deck: "linear-gradient(180deg, #2E3034 0%, #222427 45%, #1A1B1E 100%)",
    deckShadow: "inset 0 2px 0 rgba(255,255,255,0.10), inset 0 -8px 16px rgba(0,0,0,0.35)",
    well: "#08090A",
    key: "linear-gradient(180deg, #17181B 0%, #111214 100%)",
    keyEdge: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 1px rgba(0,0,0,0.6)",
    pad: "linear-gradient(180deg, #26282C, #1F2124)",
    padEdge: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    lidEdge: "#3B3E44",
    lip: "#0E0F11",
  },
  silver: {
    deck: "linear-gradient(180deg, #E4E7EB 0%, #C9CDD3 55%, #B3B8BF 100%)",
    deckShadow: "inset 0 -6px 12px rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.6)",
    well: "#1E2126",
    key: "linear-gradient(180deg, #2B2F36 0%, #24272D 100%)",
    keyEdge: "inset 0 1px 0 rgba(255,255,255,0.06)",
    pad: "linear-gradient(180deg, #D5D9DE, #C3C8CE)",
    padEdge: "inset 0 0 0 1px rgba(0,0,0,0.08)",
    lidEdge: "#9EA4AC",
    lip: "#A9AEB5",
  },
};

/** Key widths per row, in key units; the first row is the half-height function row. */
const KEY_ROWS: number[][] = [
  Array(14).fill(1),
  [...Array(13).fill(1), 1.5],
  [1.5, ...Array(12).fill(1), 1],
  [1.8, ...Array(11).fill(1), 1.75],
  [2.3, ...Array(10).fill(1), 2.3],
  [1, 1, 1, 1.25, 5.1, 1.25, 1, 1, 1, 1],
];

const Keyboard: React.FC<{ finish: LaptopFinish; unit: number }> = ({ finish, unit }) => {
  const c = FINISH[finish];
  const gap = unit * 0.14;
  return (
    <div style={{ position: "absolute", inset: 0, padding: gap * 1.4, display: "flex", flexDirection: "column", gap }}>
      {KEY_ROWS.map((row, r) => (
        <div key={r} style={{ display: "flex", gap, flex: r === 0 ? 0.62 : 1 }}>
          {row.map((w, k) => (
            <div
              key={k}
              style={{
                flex: w,
                borderRadius: unit * 0.12,
                background: c.key,
                boxShadow: c.keyEdge,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Proportions, as fractions of the lid width. */
const BEZEL = 0.022;
const CHIN = 0.03;
const DECK_DEPTH = 0.66;
const DECK_WIDER = 1.06;

/** Lid width that fits a stage, leaving room for the deck below the hinge. */
export const laptopWidthFor = (maxW: number, maxH: number, screenAspect: number) => {
  // Height ≈ lid (screen + bezels) + the deck below the hinge. Perspective
  // enlarges the deck's near edge well past its flat foreshortening, so both
  // allowances are generous — measured on renders, not derived.
  const perW = (1 - 2 * BEZEL) / screenAspect + BEZEL + CHIN + DECK_DEPTH * 0.62;
  return Math.min(maxW / (DECK_WIDER * 1.28), maxH / perW);
};

/** Screen area inside the lid, for a caller sizing its content exactly. */
export const laptopScreenSize = (width: number, screenAspect: number) => {
  const w = width * (1 - 2 * BEZEL);
  return { w, h: w / screenAspect };
};

export const LaptopFrame: React.FC<{
  /** Lid width in px. */
  width: number;
  /** Width over height of the screen area — the screenshot's own aspect. */
  screenAspect: number;
  pose: LaptopPose;
  /** Wrapper height; the laptop is centred in it. */
  height: number;
  finish?: LaptopFinish;
  children?: React.ReactNode;
}> = ({ width: W, screenAspect, pose, height, finish = "spaceBlack", children }) => {
  const c = FINISH[finish];
  const screen = laptopScreenSize(W, screenAspect);
  const bezel = W * BEZEL;
  const lidH = screen.h + bezel + W * CHIN;
  const deckW = W * DECK_WIDER;
  const deckD = W * DECK_DEPTH;
  // Visual centre sits a little below the hinge once the deck is foreshortened.
  const hingeY = height / 2 + lidH * 0.42;


  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        perspective: W * 2.6,
        perspectiveOrigin: "50% 38%",
        opacity: pose.opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: hingeY + pose.y * lidH,
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `scale(${pose.scale}) rotateX(${-pose.tilt}deg) rotateY(${pose.turn}deg)`,
        }}
      >
        {/* Shadow on the desk, under the deck. */}
        <div
          style={{
            position: "absolute",
            left: -deckW * 0.56,
            top: 0,
            width: deckW * 1.12,
            height: deckD * 1.1,
            transformOrigin: "50% 0%",
            transform: "rotateX(90deg) translateZ(-2px)",
            background: "radial-gradient(50% 50% at 50% 50%, rgba(3,10,25,0.55), transparent 72%)",
            filter: `blur(${W * 0.03}px)`,
          }}
        />

        {/* Keyboard deck, lying flat towards the camera. */}
        <div
          style={{
            position: "absolute",
            left: -deckW / 2,
            top: 0,
            width: deckW,
            height: deckD,
            transformOrigin: "50% 0%",
            transform: "rotateX(90deg)",
            borderRadius: `${W * 0.012}px ${W * 0.012}px ${W * 0.035}px ${W * 0.035}px`,
            background: c.deck,
            boxShadow: c.deckShadow,
            overflow: "hidden",
          }}
        >
          {/* Keyboard well, with real keycaps. */}
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: "6%",
              height: "47%",
              borderRadius: W * 0.008,
              background: c.well,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7)",
            }}
          >
            <Keyboard finish={finish} unit={(deckW * 0.84) / 15.5} />
          </div>
          {/* Trackpad. */}
          <div
            style={{
              position: "absolute",
              left: "33%",
              right: "33%",
              top: "60%",
              height: "32%",
              borderRadius: W * 0.012,
              background: c.pad,
              boxShadow: c.padEdge,
            }}
          />
        </div>

        {/* Lid, standing on the hinge and leaning back. */}
        <div
          style={{
            position: "absolute",
            left: -W / 2,
            top: -lidH,
            width: W,
            height: lidH,
            transformOrigin: "50% 100%",
            transform: `rotateX(${pose.lid}deg)`,
            borderRadius: `${W * 0.03}px ${W * 0.03}px ${W * 0.008}px ${W * 0.008}px`,
            background: "#0C0E12",
            boxShadow: `0 0 0 2px ${c.lidEdge}, 0 30px 80px rgba(3,10,25,0.35)`,
            padding: `${bezel}px ${bezel}px ${W * CHIN}px`,
          }}
        >
          <div
            style={{
              position: "relative",
              width: screen.w,
              height: screen.h,
              overflow: "hidden",
              borderRadius: W * 0.006,
              background: "#fff",
            }}
          >
            {children}
            {/* A faint diagonal glare, so the screen reads as glass. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 38%, transparent 40%)",
              }}
            />
          </div>
          {/* Camera notch. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              translate: "-50% 0",
              width: W * 0.11,
              height: bezel * 1.15,
              borderRadius: `0 0 ${W * 0.008}px ${W * 0.008}px`,
              background: "#0C0E12",
            }}
          />
        </div>
      </div>
    </div>
  );
};
