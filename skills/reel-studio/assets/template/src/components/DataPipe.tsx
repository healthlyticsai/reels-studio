import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export type Dir = "forward" | "reverse";

/**
 * Glowing bezier pipeline between the two systems, with travelling packets.
 * `progress` draws the pipe; `flow` spawns the moving data packets.
 */
export const DataPipe: React.FC<{
  width: number;
  height: number;
  d: string;
  progress: number;
  flow: number;
  direction?: Dir;
  packets?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}> = ({
  width,
  height,
  d,
  progress,
  flow,
  direction = "forward",
  packets = 5,
  strokeWidth = 6,
  color = COLORS.primary,
}) => {
  const frame = useCurrentFrame();
  const gradId = `pipe-${direction}-${Math.round(width)}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={direction === "forward" ? COLORS.primary : COLORS.teal} />
          <stop offset="100%" stopColor={direction === "forward" ? COLORS.teal : COLORS.primary} />
        </linearGradient>
        <filter id={`glow-${gradId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path
        d={d}
        stroke={COLORS.slate200}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        opacity={progress > 0 ? 1 : 0}
      />

      {/* Drawn pipe */}
      <path
        d={d}
        stroke={color === COLORS.primary ? `url(#${gradId})` : color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        filter={`url(#glow-${gradId})`}
      />

      {/* Marching dashes */}
      <path
        d={d}
        stroke={COLORS.white}
        strokeWidth={strokeWidth * 0.42}
        fill="none"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="3 7"
        strokeDashoffset={direction === "forward" ? -frame * 1.4 : frame * 1.4}
        opacity={flow * 0.85}
      />

      {/* Travelling packets */}
      {new Array(packets).fill(0).map((_, i) => {
        const offset = (i / packets + (frame * 0.012)) % 1;
        const t = direction === "forward" ? offset : 1 - offset;
        return (
          <circle
            key={i}
            r={strokeWidth * 1.15}
            fill={direction === "forward" ? COLORS.primary : COLORS.teal}
            opacity={flow * interpolate(Math.sin(offset * Math.PI), [0, 1], [0.2, 1])}
            filter={`url(#glow-${gradId})`}
          >
            <animateMotion dur="0.001s" repeatCount="1" keyPoints={`${t};${t}`} keyTimes="0;1" path={d} />
          </circle>
        );
      })}
    </svg>
  );
};

/** Small floating label attached to a pipeline. */
export const PipeLabel: React.FC<{
  text: string;
  opacity: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, opacity, color = COLORS.primary, style }) => (
  <div style={{ position: "absolute", opacity, ...style }}>
    <div
      style={{
      padding: "10px 20px",
      borderRadius: 999,
      background: COLORS.white,
      border: `2px solid ${color}`,
      color,
      fontFamily: "Inter, sans-serif",
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: 0.3,
      whiteSpace: "nowrap",
      boxShadow: "0 12px 30px rgba(15,23,42,0.14)",
      }}
    >
      {text}
    </div>
  </div>
);
