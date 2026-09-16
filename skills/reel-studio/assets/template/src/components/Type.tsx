import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK, GRADIENT_TEXT, SPRING } from "../theme";

/**
 * Typography system for the reel.
 *
 * Headlines are set in sentence case — all-caps is reserved for the things that
 * are genuinely shouted: eyebrow labels, the rubber stamp, and EMR section
 * headers. Emphasis comes from animated marks (marker highlight, hand-drawn
 * underline, circle, strike) rather than from shouting.
 */

export type Mark =
  | { kind: "highlight"; at: number; color?: string; rotate?: number }
  | { kind: "underline"; at: number; color?: string; thickness?: number }
  | { kind: "circle"; at: number; color?: string }
  | { kind: "strike"; at: number; color?: string }
  | { kind: "box"; at: number; color?: string };

export type Segment = {
  text: string;
  /** Emphasis drawn on or behind this segment. */
  mark?: Mark;
  color?: string;
  gradient?: boolean;
  /** Renders this segment in caps — use sparingly. */
  caps?: boolean;
};

/** Marker-pen block that wipes in behind a phrase. */
const HighlightBlock: React.FC<{ at: number; color: string; rotate: number }> = ({
  at,
  color,
  rotate,
}) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame - at, [0, 11], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.9, 0.3, 1),
  });
  if (wipe <= 0) return null;

  return (
    <span
      style={{
        position: "absolute",
        left: "-3.5%",
        right: "-3.5%",
        top: "14%",
        bottom: "6%",
        rotate: `${rotate}deg`,
        overflow: "hidden",
        borderRadius: 8,
        zIndex: -1,
      }}
    >
      <span
        style={{
          display: "block",
          width: `${wipe * 100}%`,
          height: "100%",
          background: color,
        }}
      />
    </span>
  );
};

/** Hand-drawn underline that draws itself left to right. */
const Underline: React.FC<{ at: number; color: string; thickness: number }> = ({
  at,
  color,
  thickness,
}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - at, [0, 13], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0.9, 0.3, 1),
  });
  if (draw <= 0) return null;

  return (
    <svg
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: "-2%",
        width: "104%",
        bottom: "-9%",
        height: thickness * 2.6,
        overflow: "visible",
      }}
    >
      <path
        d="M3 15 C 70 5, 140 20, 210 9 S 285 14, 297 7"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

const Strike: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - at, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.6, 0, 0.2, 1),
  });
  if (draw <= 0) return null;

  return (
    <svg
      viewBox="0 0 300 20"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: "-3%",
        width: "106%",
        top: "48%",
        height: 26,
        translate: "0px -50%",
        overflow: "visible",
      }}
    >
      <path
        d="M2 13 C 80 6, 150 16, 230 8 S 290 12, 298 6"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

const CircleMark: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - at, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.35, 0, 0.2, 1),
  });
  if (draw <= 0) return null;

  return (
    <svg
      viewBox="0 0 220 120"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: "-24% -8%", width: "116%", height: "148%" }}
    >
      <path
        d="M112 8 C 176 6, 214 30, 212 60 C 210 92, 158 114, 104 112 C 48 110, 8 90, 9 58 C 10 28, 52 8, 118 10"
        stroke={color}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

const BoxMark: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - at, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (draw <= 0) return null;

  return (
    <svg
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: "-14% -5%", width: "110%", height: "128%" }}
    >
      <rect
        x={4}
        y={4}
        width={192}
        height={92}
        rx={10}
        stroke={color}
        strokeWidth={5}
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

const renderMark = (mark: Mark) => {
  switch (mark.kind) {
    case "highlight":
      return (
        <HighlightBlock at={mark.at} color={mark.color ?? "#FDE68A"} rotate={mark.rotate ?? -1.1} />
      );
    case "underline":
      return (
        <Underline at={mark.at} color={mark.color ?? COLORS.teal} thickness={mark.thickness ?? 9} />
      );
    case "circle":
      return <CircleMark at={mark.at} color={mark.color ?? COLORS.danger} />;
    case "strike":
      return <Strike at={mark.at} color={mark.color ?? COLORS.danger} />;
    case "box":
      return <BoxMark at={mark.at} color={mark.color ?? COLORS.primary} />;
  }
};

const gradientText = {
  background: GRADIENT_TEXT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

/**
 * How the words arrive. The direction drawn for the reel picks one, and adjacent
 * scenes must not share it — a reel where every line enters the same way is the
 * clearest sign it came off a template.
 */
export type HeadlineAnim =
  | "punch"
  | "riseMask"
  | "blurIn"
  | "cascade"
  | "elastic"
  | "rollUp"
  | "flip"
  | "drift";

/** Per-word entrance, given the word's local frame and its spring value. */
const wordEntrance = (
  anim: HeadlineAnim,
  local: number,
  enter: number,
  size: number,
): React.CSSProperties => {
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const fade = interpolate(local, [0, 5], [0, 1], clamp);

  switch (anim) {
    case "riseMask":
      // The clip is on the wrapper; the word just travels up through it.
      return {
        opacity: local >= 0 ? 1 : 0,
        translate: `0px ${interpolate(enter, [0, 1], [size * 1.1, 0], clamp)}px`,
      };
    case "blurIn":
      return {
        opacity: fade,
        filter: `blur(${interpolate(local, [0, 9], [16, 0], { ...clamp, easing: Easing.out(Easing.quad) })}px)`,
        scale: interpolate(enter, [0, 1], [1.12, 1], { ...clamp, output: "perceptual-scale" }),
      };
    case "cascade":
      return {
        opacity: fade,
        translate: `0px ${interpolate(enter, [0, 1], [-size * 0.5, 0], clamp)}px`,
        rotate: `${interpolate(enter, [0, 1], [-7, 0], clamp)}deg`,
      };
    case "elastic":
      return {
        opacity: interpolate(local, [0, 2], [0, 1], clamp),
        scale: interpolate(enter, [0, 1], [1.7, 1], { ...clamp, output: "perceptual-scale" }),
      };
    case "rollUp":
      return {
        opacity: local >= 0 ? 1 : 0,
        translate: `0px ${interpolate(enter, [0, 1], [size * 0.95, 0], clamp)}px`,
        rotate: `${interpolate(enter, [0, 1], [8, 0], clamp)}deg`,
      };
    case "flip":
      return {
        opacity: fade,
        transform: `perspective(900px) rotateX(${interpolate(enter, [0, 1], [-88, 0], clamp)}deg)`,
        transformOrigin: "50% 100%",
      };
    case "drift":
      return {
        opacity: interpolate(local, [0, 14], [0, 1], clamp),
        translate: `${interpolate(enter, [0, 1], [-26, 0], clamp)}px 0px`,
        filter: `blur(${interpolate(local, [0, 12], [6, 0], clamp)}px)`,
      };
    case "punch":
    default:
      return {
        opacity: fade,
        scale: interpolate(enter, [0, 1], [0.6, 1], { ...clamp, output: "perceptual-scale" }),
        translate: `0px ${interpolate(enter, [0, 1], [30, 0], clamp)}px`,
      };
  }
};

/**
 * A headline line. Words arrive one at a time in whichever manner `anim` names;
 * each segment can carry its own animated emphasis mark.
 */
export const Headline: React.FC<{
  segments: Segment[];
  delay?: number;
  stagger?: number;
  size?: number;
  weight?: number;
  color?: string;
  align?: React.CSSProperties["justifyContent"];
  nowrap?: boolean;
  anim?: HeadlineAnim;
  style?: React.CSSProperties;
}> = ({
  segments,
  delay = 0,
  stagger = 3,
  size = 96,
  weight = 800,
  color = COLORS.slate,
  align = "center",
  nowrap = true,
  anim = "punch",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let wordIndex = 0;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: nowrap ? "nowrap" : "wrap",
        justifyContent: align,
        alignItems: "baseline",
        gap: `${size * 0.1}px ${size * 0.26}px`,
        fontFamily: FONT_STACK,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.028,
        ...style,
      }}
    >
      {segments.map((segment, si) => (
        <span
          key={si}
          style={{
            position: "relative",
            display: "inline-flex",
            gap: `${size * 0.26}px`,
            whiteSpace: "nowrap",
          }}
        >
          {segment.mark ? renderMark(segment.mark) : null}
          {segment.text.split(" ").map((word) => {
            const local = frame - delay - wordIndex++ * stagger;
            const enter = spring({ frame: local, fps, config: SPRING.punch });

            const clipped = anim === "riseMask" || anim === "rollUp";

            return (
              <span
                key={`${word}-${wordIndex}`}
                style={{
                  display: "inline-block",
                  // Only the masked entrances need a clip, and clipping the rest
                  // would cut the descenders off every headline in the reel.
                  overflow: clipped ? "hidden" : "visible",
                  paddingBottom: clipped ? size * 0.16 : 0,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    ...wordEntrance(anim, local, enter, size),
                    textTransform: segment.caps ? "uppercase" : "none",
                    ...(segment.gradient ? gradientText : { color: segment.color ?? color }),
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

/**
 * Small label pill. Defaults to all-caps because a kicker above a headline is
 * the one place caps genuinely help; pass `caps={false}` for pills that sit in
 * a row with body copy, where three caps blocks in a line just shout.
 */
export const Eyebrow: React.FC<{
  children: React.ReactNode;
  color?: string;
  background?: string;
  border?: string;
  size?: number;
  delay?: number;
  caps?: boolean;
  style?: React.CSSProperties;
}> = ({
  children,
  color = COLORS.primary,
  background = COLORS.white,
  border,
  size = 27,
  delay = 0,
  caps = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: SPRING.snap });

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: caps ? 2 : 0.2,
        textTransform: caps ? "uppercase" : "none",
        padding: `${size * 0.44}px ${size * 0.86}px`,
        borderRadius: 999,
        background,
        color,
        border: border ?? `2px solid ${COLORS.slate200}`,
        whiteSpace: "nowrap",
        opacity: interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        scale: `${interpolate(enter, [0, 1], [0.7, 1], {
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        })}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Supporting sentence under a headline. */
export const Deck: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  maxWidth?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, size = 36, color = COLORS.slate500, maxWidth = 880, style }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.34,
        color,
        textAlign: "center",
        maxWidth,
        opacity: interpolate(frame - delay, [0, 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: `0px ${interpolate(frame - delay, [0, 16], [20, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Big single-word climax hit. Sentence case, with a drawn accent rule. */
export const SlamWord: React.FC<{
  text: string;
  color?: string;
  size?: number;
  gradient?: boolean;
  rule?: boolean;
}> = ({ text, color = COLORS.slate, size = 200, gradient = false, rule = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 200, mass: 0.5 } });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.1 }}>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: -size * 0.045,
          lineHeight: 1,
          padding: "0 40px",
          opacity: interpolate(frame, [0, 3], [0, 1], { extrapolateRight: "clamp" }),
          scale: interpolate(enter, [0, 1], [1.5, 1], {
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
          filter: `blur(${interpolate(frame, [0, 6], [14, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.quad),
          })}px)`,
          ...(gradient ? gradientText : { color }),
        }}
      >
        {text}
      </div>
      {rule ? (
        <div
          style={{
            height: 10,
            borderRadius: 99,
            background: gradient ? GRADIENT_TEXT : color,
            width: interpolate(frame, [2, 14], [0, size * 2.1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 0.9, 0.3, 1),
            }),
          }}
        />
      ) : null}
    </div>
  );
};

/**
 * Numeric counter that rolls up — used for the "2 hours" and "2+ hours" stats.
 */
export const CountUp: React.FC<{
  to: number;
  from?: number;
  delay?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  size?: number;
  color?: string;
  gradient?: boolean;
}> = ({
  to,
  from = 0,
  delay = 0,
  duration = 26,
  decimals = 0,
  suffix = "",
  size = 180,
  color = COLORS.danger,
  gradient = false,
}) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame - delay, [0, duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <span
      style={{
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: -size * 0.04,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        ...(gradient ? gradientText : { color }),
      }}
    >
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/** Scattered confetti burst for the sync-complete moment. */
export const Confetti: React.FC<{ at: number; count?: number; spread?: number }> = ({
  at,
  count = 26,
  spread = 460,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 70) return null;

  const palette = [COLORS.teal, COLORS.primary, COLORS.green, "#FDE68A", COLORS.white];

  return (
    <>
      {new Array(count).fill(0).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + random(`a${i}`) * 0.6;
        const dist = interpolate(t, [0, 34], [0, spread * (0.5 + random(`d${i}`))], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 12 + random(`w${i}`) * 12,
              height: 6 + random(`h${i}`) * 8,
              borderRadius: 3,
              background: palette[i % palette.length],
              translate: `${Math.cos(angle) * dist}px ${Math.sin(angle) * dist + t * t * 0.16}px`,
              rotate: `${t * (6 + random(`r${i}`) * 10)}deg`,
              opacity: interpolate(t, [0, 6, 46, 66], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />
        );
      })}
    </>
  );
};
