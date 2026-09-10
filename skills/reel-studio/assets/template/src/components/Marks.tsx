import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT_STACK } from "../theme";

/**
 * Hand-drawn marker highlight that sweeps in behind text.
 * `progress` is driven by strokeDashoffset so the ink appears to be laid down.
 */
export const MarkerHighlight: React.FC<{
  delay?: number;
  duration?: number;
  color?: string;
  height?: number;
  rotate?: number;
  opacity?: number;
}> = ({ delay = 0, duration = 12, color = COLORS.amber, height = 0.62, rotate = -1, opacity = 0.45 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: "-3%",
        right: "-3%",
        bottom: `${(1 - height) * 6}%`,
        height: `${height * 100}%`,
        rotate: `${rotate}deg`,
        transformOrigin: "left center",
        overflow: "hidden",
        zIndex: -1,
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: color,
          opacity,
          borderRadius: 6,
        }}
      />
    </div>
  );
};

/** Rough strike-through drawn across a phrase. */
export const StrikeThrough: React.FC<{
  delay?: number;
  duration?: number;
  color?: string;
  thickness?: number;
}> = ({ delay = 0, duration = 10, color = COLORS.danger, thickness = 12 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.6, 0, 0.2, 1),
  });

  return (
    <svg
      viewBox="0 0 400 40"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: "-4%",
        right: "-4%",
        top: "50%",
        width: "108%",
        height: thickness * 3,
        translate: "0px -50%",
        overflow: "visible",
      }}
    >
      <path
        d="M2 26 C 90 12, 160 32, 250 16 S 370 22, 398 12"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};

/** Circled annotation that scribbles around an element. */
export const CircleAnnotation: React.FC<{
  delay?: number;
  duration?: number;
  color?: string;
  thickness?: number;
}> = ({ delay = 0, duration = 16, color = COLORS.danger, thickness = 8 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: "-14%", width: "128%", height: "128%" }}
    >
      <ellipse
        cx={100}
        cy={100}
        rx={92}
        ry={86}
        stroke={color}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        transform="rotate(-8 100 100)"
      />
    </svg>
  );
};

/** Distressed rubber stamp that slams onto the frame. */
export const RubberStamp: React.FC<{
  label: string;
  sub?: string;
  color?: string;
  rotate?: number;
  width?: number;
  progress: number;
}> = ({ label, sub, color = COLORS.danger, rotate = -9, width = 760, progress }) => (
  <div
    style={{
      width,
      padding: "34px 46px",
      border: `10px solid ${color}`,
      borderRadius: 20,
      rotate: `${rotate}deg`,
      opacity: progress * 0.92,
      scale: interpolate(progress, [0, 1], [3.2, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        output: "perceptual-scale",
      }),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      mixBlendMode: "multiply",
      boxShadow: `inset 0 0 0 5px ${color}22`,
    }}
  >
    <div
      style={{
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: 96,
        letterSpacing: 2,
        color,
        lineHeight: 1,
        textAlign: "center",
      }}
    >
      {label}
    </div>
    {sub ? (
      <div
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 8,
          color,
          opacity: 0.85,
        }}
      >
        {sub}
      </div>
    ) : null}
  </div>
);
