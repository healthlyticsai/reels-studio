import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/** Deterministic pseudo-random so the waveform is stable across renders. */
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Ambient listening visualiser: bars driven by layered sine waves so the
 * motion reads as a live voice rather than a looping animation.
 */
export const SoundWave: React.FC<{
  bars?: number;
  width: number;
  height: number;
  color?: string;
  gap?: number;
  amplitude?: number;
  active?: number;
}> = ({ bars = 34, width, height, color, gap = 7, amplitude = 1, active = 1 }) => {
  const frame = useCurrentFrame();
  const barWidth = (width - gap * (bars - 1)) / bars;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        width,
        height,
      }}
    >
      {new Array(bars).fill(0).map((_, i) => {
        const seed = rand(i);
        const envelope = Math.sin((i / (bars - 1)) * Math.PI) ** 0.65;
        const wave =
          Math.sin(frame * 0.24 + i * 0.55) * 0.5 +
          Math.sin(frame * 0.41 + seed * 9) * 0.32 +
          Math.sin(frame * 0.13 + i * 0.22) * 0.18;
        const h = Math.max(
          barWidth,
          (0.16 + Math.abs(wave) * 0.84) * envelope * height * amplitude * active,
        );

        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height: h,
              borderRadius: 999,
              background:
                color ??
                `linear-gradient(180deg, ${COLORS.teal} 0%, ${COLORS.primary} 100%)`,
              opacity: interpolate(active, [0, 1], [0.25, 1]),
            }}
          />
        );
      })}
    </div>
  );
};

/** Continuous sine ribbon — used as the ambient "always listening" line. */
export const WaveRibbon: React.FC<{
  width: number;
  height: number;
  strokeWidth?: number;
  opacity?: number;
  speed?: number;
  amplitude?: number;
}> = ({ width, height, strokeWidth = 6, opacity = 1, speed = 0.09, amplitude = 1 }) => {
  const frame = useCurrentFrame();
  const points: string[] = [];
  const steps = 90;

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const t = i / steps;
    const env = Math.sin(t * Math.PI);
    const y =
      height / 2 +
      (Math.sin(t * 9 - frame * speed) * 0.6 + Math.sin(t * 21 + frame * speed * 1.7) * 0.4) *
        (height / 2.4) *
        env *
        amplitude;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return (
    <svg width={width} height={height} style={{ opacity, overflow: "visible" }}>
      <defs>
        <linearGradient id="ribbon-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0} />
          <stop offset="25%" stopColor={COLORS.primary} />
          <stop offset="75%" stopColor={COLORS.teal} />
          <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={points.join(" ")}
        fill="none"
        stroke="url(#ribbon-grad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};
