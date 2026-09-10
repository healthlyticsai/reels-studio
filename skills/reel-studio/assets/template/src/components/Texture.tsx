import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/**
 * Vox-style tactile layer: fine paper grain + halftone dots, kept at a
 * low opacity so it reads as texture rather than noise.
 */
export const PaperTexture: React.FC<{
  opacity?: number;
  halftone?: number;
}> = ({ opacity = 0.05, halftone = 0.05 }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="paper-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves={3}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern
            id="halftone"
            width={14}
            height={14}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(28)"
          >
            <circle cx={3} cy={3} r={1.9} fill={COLORS.slate} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" filter="url(#paper-grain)" opacity={opacity} />
        <rect width="100%" height="100%" fill="url(#halftone)" opacity={halftone} />
      </svg>
    </AbsoluteFill>
  );
};

/** Slowly drifting technical grid — the "editorial graph paper" bed. */
export const GridBed: React.FC<{
  color?: string;
  size?: number;
  opacity?: number;
  drift?: number;
}> = ({ color = COLORS.slate300, size = 60, opacity = 0.5, drift = 40 }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${interpolate(frame, [0, 600], [0, drift])}px ${interpolate(
          frame,
          [0, 600],
          [0, drift],
        )}px`,
        maskImage:
          "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.15) 78%)",
      }}
    />
  );
};

/** Soft brand-coloured bloom used behind hero elements. */
export const Bloom: React.FC<{
  x: number;
  y: number;
  size: number;
  opacity?: number;
  blur?: number;
}> = ({ x, y, size, opacity = 1, blur = 20 }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      opacity,
      filter: `blur(${blur}px)`,
      background:
        "radial-gradient(circle, rgba(56,178,172,0.35) 0%, rgba(44,107,172,0.2) 45%, rgba(44,107,172,0) 70%)",
      pointerEvents: "none",
    }}
  />
);
