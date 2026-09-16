import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { COLORS, GRADIENT_DIAG } from "../theme";

/**
 * The frame's dressing — the layer that makes one reel look nothing like the
 * next one.
 *
 * `direction.json` names a variant for the whole reel (drawn by
 * scripts/direction.mjs), and `src/look.ts` holds that name in one place. Every
 * scene puts a `<Backdrop />` first and builds on top of it, so re-skinning a
 * reel is a one-line change rather than fourteen scene edits.
 *
 * Variants are deliberately built from CSS rather than images: they have to
 * animate, tint to the brand, and stay crisp at 1080x1920.
 */

export type BackdropVariant =
  | "paperCollage"
  | "risograph"
  | "swissGrid"
  | "nightData"
  | "blueprint"
  | "archiveFilm"
  | "gallery"
  | "chalkboard"
  | "neonGradient"
  | "newsprint"
  | "cleanStudio"
  | "duotoneSplit"
  | "scrapbook"
  | "terminalMono";

/** True for the variants whose type has to be light, so scenes can branch once. */
export const isDarkBackdrop = (v: BackdropVariant) =>
  v === "nightData" || v === "chalkboard" || v === "neonGradient" || v === "terminalMono";

const grain = (opacity: number) => (
  <Img
    src={staticFile("art/paper-grain.png")}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      opacity,
      mixBlendMode: "multiply",
      pointerEvents: "none",
    }}
  />
);

/** Halftone dot field, as a repeating radial gradient. */
const dots = (color: string, size: number, opacity: number) => ({
  backgroundImage: `radial-gradient(${color} 1.1px, transparent 1.2px)`,
  backgroundSize: `${size}px ${size}px`,
  opacity,
});

/** Line grid, as two crossed repeating gradients. */
const grid = (color: string, size: number, weight = 1) => ({
  backgroundImage:
    `repeating-linear-gradient(0deg, ${color} 0 ${weight}px, transparent ${weight}px ${size}px),` +
    `repeating-linear-gradient(90deg, ${color} 0 ${weight}px, transparent ${weight}px ${size}px)`,
});

export const Backdrop: React.FC<{
  variant: BackdropVariant;
  /** Slow ambient movement. Off for variants meant to sit dead still. */
  drift?: boolean;
  /** Extra layers on top of the backdrop but under the scene. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ variant, drift = true, children, style }) => {
  const frame = useCurrentFrame();
  const wander = drift ? Math.sin(frame / 190) * 14 : 0;
  const breathe = drift ? 1 + Math.sin(frame / 240) * 0.02 : 1;

  const layers: React.ReactNode[] = [];
  let base: React.CSSProperties = { background: COLORS.white };

  switch (variant) {
    case "paperCollage":
      base = { background: "#F7F4EE" };
      layers.push(
        <AbsoluteFill key="d" style={dots(COLORS.slate500, 13, 0.5)} />,
        <AbsoluteFill
          key="w"
          style={{
            background: `radial-gradient(1200px 900px at 50% ${28 + wander * 0.3}%, rgba(255,255,255,0.9), rgba(0,0,0,0) 70%)`,
          }}
        />,
      );
      layers.push(<React.Fragment key="g">{grain(0.16)}</React.Fragment>);
      break;

    case "risograph":
      base = { background: "#F2EDE2" };
      layers.push(
        <AbsoluteFill
          key="ink1"
          style={{
            background: `radial-gradient(760px 760px at ${22 + wander * 0.5}% 24%, ${COLORS.teal}, transparent 62%)`,
            opacity: 0.68,
            mixBlendMode: "multiply",
          }}
        />,
        <AbsoluteFill
          key="ink2"
          style={{
            background: `radial-gradient(900px 900px at ${78 - wander * 0.5}% 74%, ${COLORS.primary}, transparent 60%)`,
            opacity: 0.58,
            mixBlendMode: "multiply",
          }}
        />,
        <AbsoluteFill key="d" style={dots(COLORS.slate700, 8, 0.62)} />,
      );
      layers.push(<React.Fragment key="g">{grain(0.2)}</React.Fragment>);
      break;

    case "swissGrid":
      base = { background: COLORS.slate100 };
      layers.push(
        <AbsoluteFill key="g" style={{ ...grid(`${COLORS.slate300}`, 90), opacity: 0.95 }} />,
        <AbsoluteFill
          key="rule"
          style={{
            borderLeft: `3px solid ${COLORS.primary}`,
            marginLeft: 84,
            opacity: 0.5,
          }}
        />,
      );
      break;

    case "nightData":
      base = { background: "#060A14" };
      layers.push(
        <AbsoluteFill
          key="glow"
          style={{
            background: `radial-gradient(900px 900px at 50% ${34 + wander * 0.4}%, ${COLORS.primary}33, transparent 68%)`,
          }}
        />,
        <AbsoluteFill key="g" style={{ ...grid(`${COLORS.teal}18`, 72), opacity: 0.8 }} />,
        <AbsoluteFill
          key="scan"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 4px)`,
          }}
        />,
      );
      break;

    case "blueprint":
      base = { background: "#0E2E52" };
      layers.push(
        <AbsoluteFill key="fine" style={{ ...grid("rgba(255,255,255,0.10)", 36), opacity: 1 }} />,
        <AbsoluteFill key="coarse" style={{ ...grid("rgba(255,255,255,0.22)", 180, 1.6) }} />,
        <AbsoluteFill
          key="v"
          style={{
            background: "radial-gradient(1100px 1400px at 50% 40%, rgba(255,255,255,0.10), rgba(0,0,0,0.30) 85%)",
          }}
        />,
      );
      break;

    case "archiveFilm":
      base = { background: "#CFC9BA" };
      layers.push(
        <AbsoluteFill
          key="warm"
          style={{ background: "linear-gradient(180deg, #E6DFCF 0%, #BDB6A6 100%)" }}
        />,
        <AbsoluteFill
          key="scan"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 5px)",
          }}
        />,
        <AbsoluteFill
          key="chroma"
          style={{
            background: "linear-gradient(90deg, rgba(255,0,60,0.07), rgba(0,180,255,0.07))",
            mixBlendMode: "screen",
          }}
        />,
        <AbsoluteFill
          key="v"
          style={{ background: "radial-gradient(1000px 1300px at 50% 45%, transparent 45%, rgba(0,0,0,0.45))" }}
        />,
      );
      layers.push(<React.Fragment key="g">{grain(0.22)}</React.Fragment>);
      break;

    case "gallery":
      base = { background: "#FBFAF8" };
      layers.push(
        <AbsoluteFill
          key="wash"
          style={{
            background: `radial-gradient(1300px 1000px at 50% ${30 + wander * 0.2}%, #FFFFFF, #EFECE6 85%)`,
          }}
        />,
      );
      break;

    case "chalkboard":
      base = { background: "#1D2A26" };
      layers.push(
        <AbsoluteFill
          key="wash"
          style={{
            background: "radial-gradient(1200px 1000px at 46% 38%, rgba(255,255,255,0.09), transparent 70%)",
          }}
        />,
        <AbsoluteFill key="d" style={dots("rgba(255,255,255,0.10)", 5, 0.8)} />,
      );
      layers.push(<React.Fragment key="g">{grain(0.12)}</React.Fragment>);
      break;

    case "neonGradient":
      base = { background: "#0B1220" };
      layers.push(
        <AbsoluteFill
          key="grad"
          style={{
            background: GRADIENT_DIAG,
            opacity: 0.55,
            scale: `${breathe}`,
            filter: "blur(2px)",
          }}
        />,
        <AbsoluteFill
          key="bloom"
          style={{
            background: `radial-gradient(760px 760px at ${62 + wander * 0.6}% 28%, ${COLORS.tealLight}55, transparent 65%)`,
          }}
        />,
        <AbsoluteFill
          key="dark"
          style={{ background: "radial-gradient(1200px 1500px at 50% 55%, transparent 35%, rgba(3,7,18,0.72))" }}
        />,
      );
      break;

    case "newsprint":
      base = { background: "#EFEAE0" };
      layers.push(
        <AbsoluteFill key="d" style={dots(COLORS.slate700, 6, 0.5)} />,
        <AbsoluteFill
          key="cols"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 340px, ${COLORS.slate500} 340px 343px)`,
            opacity: 0.55,
          }}
        />,
      );
      layers.push(<React.Fragment key="g">{grain(0.18)}</React.Fragment>);
      break;

    case "cleanStudio":
      base = { background: COLORS.white };
      layers.push(
        <AbsoluteFill
          key="floor"
          style={{
            background: `linear-gradient(180deg, #FFFFFF 0%, #FCFDFE 46%, ${COLORS.slate200} 100%)`,
          }}
        />,
        <AbsoluteFill
          key="bloom"
          style={{
            background: `radial-gradient(900px 760px at 50% ${26 + wander * 0.2}%, ${COLORS.highlight}, transparent 72%)`,
            opacity: 0.85,
          }}
        />,
      );
      break;

    case "duotoneSplit":
      base = { background: COLORS.slate100 };
      layers.push(
        <AbsoluteFill
          key="split"
          style={{
            background: `linear-gradient(103deg, ${COLORS.slate} 0%, ${COLORS.slate} 49.6%, ${COLORS.highlight} 50.4%, ${COLORS.highlight} 100%)`,
          }}
        />,
        <AbsoluteFill key="d" style={dots("rgba(255,255,255,0.18)", 10, 0.5)} />,
      );
      break;

    case "scrapbook":
      base = { background: "#F4EFE6" };
      layers.push(
        <AbsoluteFill key="d" style={dots(COLORS.slate300, 16, 0.35)} />,
        // Faint taped-down rectangles, seeded so they never move between renders.
        <AbsoluteFill key="tape">
          {new Array(5).fill(0).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${random(`sx${i}`) * 78}%`,
                top: `${random(`sy${i}`) * 82}%`,
                width: 220 + random(`sw${i}`) * 260,
                height: 150 + random(`sh${i}`) * 220,
                background: COLORS.white,
                rotate: `${(random(`sr${i}`) - 0.5) * 9}deg`,
                boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
                opacity: 0.5,
              }}
            />
          ))}
        </AbsoluteFill>,
      );
      layers.push(<React.Fragment key="g">{grain(0.14)}</React.Fragment>);
      break;

    case "terminalMono":
      base = { background: "#0A0E12" };
      layers.push(
        <AbsoluteFill key="g" style={{ ...grid("rgba(56,178,172,0.10)", 44), opacity: 0.9 }} />,
        <AbsoluteFill
          key="scan"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(56,178,172,0.05) 0 1px, transparent 1px 3px)",
          }}
        />,
        <AbsoluteFill
          key="v"
          style={{ background: "radial-gradient(1000px 1300px at 50% 50%, transparent 40%, rgba(0,0,0,0.6))" }}
        />,
      );
      break;
  }

  return (
    <AbsoluteFill style={{ ...base, ...style }}>
      {layers}
      {children}
    </AbsoluteFill>
  );
};

/**
 * Frame move, wrapped around a scene's content. The camera language from
 * direction.json picks the mode; everything inside animates as normal.
 */
export const CameraMove: React.FC<{
  mode: "locked" | "pushIn" | "drift" | "parallax" | "sideDolly";
  /** Scene length in frames, so a push can complete exactly on the cut. */
  duration: number;
  strength?: number;
  children: React.ReactNode;
}> = ({ mode, duration, strength = 1, children }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let scale = 1;
  let x = 0;
  let y = 0;

  if (mode === "pushIn") scale = 1 + t * 0.06 * strength;
  if (mode === "drift") {
    // Two out-of-phase sines read as an operator holding a camera, where a
    // single sine reads as a loop.
    x = (Math.sin(frame / 41) + Math.sin(frame / 17) * 0.4) * 5 * strength;
    y = (Math.cos(frame / 53) + Math.cos(frame / 23) * 0.4) * 5 * strength;
    scale = 1.02;
  }
  if (mode === "parallax") {
    y = -t * 26 * strength;
    scale = 1 + t * 0.03 * strength;
  }
  if (mode === "sideDolly") {
    x = interpolate(t, [0, 1], [34 * strength, -34 * strength]);
    scale = 1.05;
  }

  return (
    <AbsoluteFill style={{ scale: `${scale}`, translate: `${x}px ${y}px` }}>{children}</AbsoluteFill>
  );
};
