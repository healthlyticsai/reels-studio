import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK } from "../theme";

/**
 * Reusable Vox-style motion devices: the small animated diagrams that carry
 * an explainer between its headline moments.
 */

/** Concentric rings pulsing outward — ambient capture, radiating from a point. */
export const RippleRings: React.FC<{
  size: number;
  rings?: number;
  period?: number;
  color?: string;
  strength?: number;
  strokeWidth?: number;
}> = ({ size, rings = 4, period = 34, color = COLORS.teal, strength = 1, strokeWidth = 3 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {new Array(rings).fill(0).map((_, i) => {
        const phase = ((frame + (i * period) / rings) % period) / period;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              border: `${strokeWidth}px solid ${color}`,
              scale: `${interpolate(phase, [0, 1], [0.18, 1])}`,
              opacity: interpolate(phase, [0, 0.12, 1], [0, 0.7, 0]) * strength,
            }}
          />
        );
      })}
    </div>
  );
};

/** A scanning beam sweeping down a card — "reading" a chart. */
export const ScanBeam: React.FC<{
  at: number;
  duration?: number;
  color?: string;
  radius?: number;
}> = ({ at, duration = 42, color = COLORS.primary, radius = 22 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > duration + 10) return null;

  const y = interpolate(t, [0, duration], [-12, 112], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.5, 1),
  });
  const fade = interpolate(t, [0, 6, duration - 6, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${y}%`,
          height: 120,
          translate: "0px -60px",
          opacity: fade,
          background: `linear-gradient(180deg, ${color}00 0%, ${color}55 46%, ${color}ee 50%, ${color}55 54%, ${color}00 100%)`,
        }}
      />
    </div>
  );
};

/** Scrolling marquee band — the editorial "chapter rule". */
export const TickerStrip: React.FC<{
  text: string;
  speed?: number;
  background?: string;
  color?: string;
  size?: number;
  rotate?: number;
  repeats?: number;
  caps?: boolean;
}> = ({
  text,
  speed = 2.4,
  background = COLORS.slate,
  color = COLORS.white,
  size = 30,
  rotate = 0,
  repeats = 8,
  caps = false,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: "128%",
        marginLeft: "-14%",
        background,
        rotate: `${rotate}deg`,
        padding: `${size * 0.42}px 0`,
        overflow: "hidden",
        display: "flex",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: size * 1.4,
          whiteSpace: "nowrap",
          translate: `${-((frame * speed) % 600)}px 0px`,
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: caps ? 2.4 : 0.6,
          textTransform: caps ? "uppercase" : "none",
          color,
        }}
      >
        {new Array(repeats).fill(0).map((_, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: size * 1.4 }}>
            {text}
            <span style={{ opacity: 0.45 }}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
};

/** Before/after bar comparison — the stat that lands the argument. */
export type Bar = { label: string; value: number; color: string; caption: string };

export const BarCompare: React.FC<{
  bars: Bar[];
  max: number;
  at: number;
  width: number;
  stagger?: number;
  barHeight?: number;
}> = ({ bars, max, at, width, stagger = 12, barHeight = 62 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 22 }}>
      {bars.map((bar, i) => {
        const grow = spring({
          frame: frame - at - i * stagger,
          fps,
          config: { damping: 17, stiffness: 90, mass: 0.8 },
        });

        return (
          <div key={bar.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontFamily: FONT_STACK,
                opacity: interpolate(grow, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 27, color: COLORS.slate700 }}>
                {bar.label}
              </span>
              <span style={{ fontWeight: 800, fontSize: 27, color: bar.color }}>{bar.caption}</span>
            </div>
            <div
              style={{
                height: barHeight,
                borderRadius: 14,
                background: COLORS.slate200,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(bar.value / max) * 100 * Math.min(1, grow)}%`,
                  borderRadius: 14,
                  background: bar.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Hand-drawn arrow that draws itself toward a target. */
export const ArrowScribble: React.FC<{
  at: number;
  duration?: number;
  color?: string;
  width?: number;
  rotate?: number;
  flip?: boolean;
}> = ({ at, duration = 14, color = COLORS.danger, width = 150, rotate = 0, flip = false }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - at, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0.9, 0.3, 1),
  });
  const head = interpolate(frame - at, [duration * 0.7, duration + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (draw <= 0) return null;

  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 100 100"
      style={{ rotate: `${rotate}deg`, scale: flip ? "-1 1" : "1 1", overflow: "visible" }}
    >
      <path
        d="M12 82 C 34 76, 58 62, 72 36"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      <path
        d="M58 26 L 78 24 L 76 46"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - head}
      />
    </svg>
  );
};

/** Floating brand-tinted particles — quiet depth behind hero cards. */
export const Motes: React.FC<{ count?: number; color?: string; opacity?: number }> = ({
  count = 22,
  color = COLORS.teal,
  opacity = 0.35,
}) => {
  const frame = useCurrentFrame();

  return (
    <>
      {new Array(count).fill(0).map((_, i) => {
        const drift = (frame * (0.22 + random(`v${i}`) * 0.5)) % 2100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${random(`px${i}`) * 100}%`,
              top: 2000 - drift,
              width: 5 + random(`s${i}`) * 9,
              height: 5 + random(`s${i}`) * 9,
              borderRadius: 999,
              background: color,
              opacity: opacity * interpolate(drift, [0, 200, 1800, 2100], [0, 1, 1, 0]),
              translate: `${Math.sin(drift * 0.012 + i) * 26}px 0px`,
            }}
          />
        );
      })}
    </>
  );
};

/** Counting chip that ticks up beside a bar or icon. */
export const StatChip: React.FC<{
  at: number;
  label: string;
  value: string;
  color?: string;
  background?: string;
}> = ({ at, label, value, color = COLORS.white, background = COLORS.slate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 160, mass: 0.6 } });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "14px 26px",
        borderRadius: 20,
        background,
        opacity: Math.min(1, enter * 1.5),
        scale: `${interpolate(enter, [0, 1], [0.6, 1], {
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        })}`,
      }}
    >
      <span style={{ fontFamily: FONT_STACK, fontWeight: 800, fontSize: 44, color, lineHeight: 1.1 }}>
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: 0.3,
          color,
          opacity: 0.72,
        }}
      >
        {label}
      </span>
    </div>
  );
};
