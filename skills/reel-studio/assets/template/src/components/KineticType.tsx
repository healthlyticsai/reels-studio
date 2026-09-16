import React from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK, GRADIENT_TEXT } from "../theme";

/**
 * Kinetic type systems.
 *
 * `Headline` in Type.tsx is the workhorse, but a reel where every line arrives
 * the same way is the loudest possible tell that it came off a template. So
 * direction.json draws four of these per reel and the plan assigns one to each
 * scene, never the same one twice in a row.
 *
 * They share a shape: `delay` is the frame the line starts, pinned to the word
 * in the transcript it belongs to, and everything else has a sensible default.
 */

const base = (size: number, weight: number, color: string): React.CSSProperties => ({
  fontFamily: FONT_STACK,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.06,
  letterSpacing: -size * 0.028,
  color,
});

const gradientText = {
  background: GRADIENT_TEXT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

export type KineticProps = {
  text: string;
  delay?: number;
  size?: number;
  weight?: number;
  color?: string;
  gradient?: boolean;
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
};

/* ── Mask rise ───────────────────────────────────────────────────────────── */

/**
 * Lines push up from behind a hard mask edge. The mask is what sells it — a
 * plain fade-up reads as a slideshow, a clipped rise reads as type in a slot.
 */
export const MaskReveal: React.FC<
  KineticProps & { lines?: string[]; stagger?: number; duration?: number }
> = ({
  text,
  lines,
  delay = 0,
  stagger = 6,
  duration = 18,
  size = 92,
  weight = 800,
  color = COLORS.slate,
  gradient,
  align = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const rows = lines ?? [text];

  return (
    <div style={{ textAlign: align, ...style }}>
      {rows.map((line, i) => {
        const t = interpolate(frame - delay - i * stagger, [0, duration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: size * 0.06 }}>
            <div
              style={{
                ...base(size, weight, color),
                ...(gradient ? gradientText : null),
                translate: `0px ${(1 - t) * size * 1.15}px`,
                opacity: t > 0 ? 1 : 0,
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Typewriter ──────────────────────────────────────────────────────────── */

/** Characters type in with a caret. `cps` is characters per second. */
export const Typewriter: React.FC<KineticProps & { cps?: number; caret?: boolean; mono?: boolean }> = ({
  text,
  delay = 0,
  cps = 26,
  caret = true,
  mono = true,
  size = 64,
  weight = 600,
  color = COLORS.slate,
  align = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = Math.max(0, Math.min(text.length, Math.floor(((frame - delay) / fps) * cps)));
  const done = shown >= text.length;

  return (
    <div
      style={{
        ...base(size, weight, color),
        fontFamily: mono ? `ui-monospace, "SF Mono", Menlo, monospace` : FONT_STACK,
        letterSpacing: mono ? -size * 0.01 : -size * 0.028,
        textAlign: align,
        whiteSpace: "pre-wrap",
        ...style,
      }}
    >
      {text.slice(0, shown)}
      {caret && !done ? (
        <span
          style={{
            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0.15,
            color: COLORS.teal,
          }}
        >
          ▍
        </span>
      ) : null}
    </div>
  );
};

/* ── Character cascade ───────────────────────────────────────────────────── */

/** Every character enters on its own stagger, with a small rotation. */
export const CharCascade: React.FC<KineticProps & { stagger?: number; from?: "below" | "above" }> = ({
  text,
  delay = 0,
  stagger = 1.6,
  from = "below",
  size = 96,
  weight = 800,
  color = COLORS.slate,
  gradient,
  align = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dir = from === "below" ? 1 : -1;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        ...base(size, weight, color),
        ...style,
      }}
    >
      {text.split("").map((ch, i) => {
        const enter = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 14, stiffness: 180, mass: 0.5 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: enter,
              translate: `0px ${(1 - enter) * size * 0.5 * dir}px`,
              rotate: `${(1 - enter) * 9 * dir}deg`,
              ...(gradient ? gradientText : null),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/* ── Vertical roll ───────────────────────────────────────────────────────── */

/** Words roll up through a clipped window, the previous one rolling out. */
export const VerticalRoll: React.FC<
  Omit<KineticProps, "text"> & { words: string[]; hold?: number; duration?: number }
> = ({
  words,
  delay = 0,
  hold = 26,
  duration = 12,
  size = 120,
  weight = 800,
  color = COLORS.primary,
  gradient,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = frame - delay;
  const step = hold + duration;
  const index = Math.max(0, Math.min(words.length - 1, Math.floor(t / step)));
  const local = t - index * step;

  // Roll happens at the top of each step, so each word gets a clean hold.
  const roll = interpolate(local, [0, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.9, 0.25, 1),
  });

  return (
    <div style={{ overflow: "hidden", height: size * 1.2, ...style }}>
      <div
        style={{
          ...base(size, weight, color),
          ...(gradient ? gradientText : null),
          translate: `0px ${roll * size * 1.2}px`,
          opacity: t < 0 ? 0 : 1,
        }}
      >
        {words[index]}
      </div>
    </div>
  );
};

/* ── Blur to focus ───────────────────────────────────────────────────────── */

/** Type resolves out of heavy blur, like a lens finding focus. */
export const BlurFocus: React.FC<KineticProps & { duration?: number; blur?: number }> = ({
  text,
  delay = 0,
  duration = 20,
  blur = 26,
  size = 104,
  weight = 800,
  color = COLORS.slate,
  gradient,
  align = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        ...base(size, weight, color),
        ...(gradient ? gradientText : null),
        textAlign: align,
        filter: `blur(${(1 - t) * blur}px)`,
        opacity: t,
        scale: `${interpolate(t, [0, 1], [1.14, 1], { output: "perceptual-scale" })}`,
        letterSpacing: interpolate(t, [0, 1], [size * 0.06, -size * 0.028]),
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/* ── Karaoke fill ────────────────────────────────────────────────────────── */

/**
 * The whole line is present in a dimmed colour and fills with the accent colour
 * word by word. Pass one `at` frame per word, taken from the transcript, and the
 * fill tracks the narration exactly.
 */
export const KaraokeLine: React.FC<
  Omit<KineticProps, "text"> & {
    words: { text: string; at: number }[];
    dim?: string;
    accent?: string;
  }
> = ({
  words,
  dim = COLORS.slate300,
  accent = COLORS.slate,
  size = 84,
  weight = 800,
  align = "center",
  style,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${size * 0.1}px ${size * 0.26}px`,
        justifyContent: align === "center" ? "center" : "flex-start",
        ...base(size, weight, dim),
        ...style,
      }}
    >
      {words.map((w, i) => {
        const lit = interpolate(frame - w.at, [0, 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              color: lit > 0.5 ? accent : dim,
              scale: `${interpolate(lit, [0, 0.5, 1], [1, 1.07, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              })}`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

/* ── Word swap ───────────────────────────────────────────────────────────── */

/** A fixed sentence with one slot, and the word in that slot is replaced. */
export const WordSwap: React.FC<
  Omit<KineticProps, "text"> & {
    before?: string;
    after?: string;
    words: string[];
    at: number[];
    accent?: string;
    strikeAllBut?: boolean;
  }
> = ({
  before = "",
  after = "",
  words,
  at,
  accent = COLORS.primary,
  size = 80,
  weight = 800,
  color = COLORS.slate,
  align = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let index = -1;
  at.forEach((f, i) => {
    if (frame >= f) index = i;
  });
  const current = index < 0 ? 0 : index;
  const enter = spring({
    frame: frame - (at[current] ?? 0),
    fps,
    config: { damping: 13, stiffness: 190, mass: 0.5 },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: size * 0.24,
        ...base(size, weight, color),
        ...style,
      }}
    >
      {before ? <span>{before}</span> : null}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          overflow: "hidden",
          color: accent,
        }}
      >
        <span
          style={{
            display: "inline-block",
            translate: `0px ${(1 - enter) * size * 0.9}px`,
            opacity: index < 0 ? 0 : 1,
          }}
        >
          {words[current]}
        </span>
      </span>
      {after ? <span>{after}</span> : null}
    </div>
  );
};

/* ── Split flap ──────────────────────────────────────────────────────────── */

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";

/** Departures-board flip: each character cycles then settles, left to right. */
export const SplitFlap: React.FC<KineticProps & { stagger?: number; flips?: number }> = ({
  text,
  delay = 0,
  stagger = 2.2,
  flips = 8,
  size = 72,
  weight = 800,
  color = COLORS.white,
  style,
}) => {
  const frame = useCurrentFrame();
  const upper = text.toUpperCase();

  return (
    <div style={{ display: "flex", gap: size * 0.08, ...style }}>
      {upper.split("").map((ch, i) => {
        const t = frame - delay - i * stagger;
        const settled = t > flips * 2;
        const shown = settled
          ? ch
          : t < 0
            ? " "
            : FLAP_CHARS[Math.floor(random(`f${i}${Math.floor(t / 2)}`) * FLAP_CHARS.length)];

        return (
          <span
            key={i}
            style={{
              ...base(size, weight, color),
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: size * 0.66,
              padding: `${size * 0.1}px 0`,
              background: COLORS.slate,
              borderRadius: 6,
              borderTop: `1px solid rgba(255,255,255,0.12)`,
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5)",
              opacity: t < 0 ? 0.25 : 1,
            }}
          >
            {shown}
          </span>
        );
      })}
    </div>
  );
};

/* ── Elastic slam ────────────────────────────────────────────────────────── */

/** Oversized slam with overshoot, plus a short frame shake on impact. */
export const ElasticSlam: React.FC<KineticProps & { shake?: number }> = ({
  text,
  delay = 0,
  shake = 10,
  size = 176,
  weight = 800,
  color = COLORS.slate,
  gradient,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - delay;
  const enter = spring({ frame: t, fps, config: { damping: 9, stiffness: 240, mass: 0.7 } });

  // Shake decays fast; anything longer than ~10 frames reads as a broken render.
  const decay = interpolate(t, [0, shake], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const jitter = t < 0 ? 0 : (random(`s${Math.floor(t)}`) - 0.5) * 22 * decay;

  return (
    <div
      style={{
        ...base(size, weight, color),
        ...(gradient ? gradientText : null),
        textAlign: "center",
        opacity: interpolate(t, [0, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        scale: `${interpolate(enter, [0, 1], [1.8, 1], { output: "perceptual-scale" })}`,
        translate: `${jitter}px ${jitter * 0.5}px`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/* ── Scramble settle ─────────────────────────────────────────────────────── */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@*+=/\\";

/** Glyphs cycle and resolve left to right into the real word. */
export const ScrambleText: React.FC<KineticProps & { duration?: number }> = ({
  text,
  delay = 0,
  duration = 26,
  size = 88,
  weight = 800,
  color = COLORS.teal,
  align = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const t = frame - delay;
  const settledCount = interpolate(t, [0, duration], [0, text.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <div
      style={{
        ...base(size, weight, color),
        fontFamily: `ui-monospace, "SF Mono", Menlo, monospace`,
        letterSpacing: size * 0.02,
        textAlign: align,
        opacity: t < 0 ? 0 : 1,
        ...style,
      }}
    >
      {text.split("").map((ch, i) => {
        if (i < settledCount || ch === " ") return <span key={i}>{ch}</span>;
        const g = GLYPHS[Math.floor(random(`g${i}${Math.floor(t / 2)}`) * GLYPHS.length)];
        return (
          <span key={i} style={{ opacity: 0.55 }}>
            {g}
          </span>
        );
      })}
    </div>
  );
};

/* ── Stacked lines ───────────────────────────────────────────────────────── */

/** Lines land one under another, each knocking the stack slightly. */
export const StackedLines: React.FC<
  Omit<KineticProps, "text"> & {
    lines: { text: string; at: number; color?: string; background?: string }[];
    align?: React.CSSProperties["alignItems"];
  }
> = ({ lines, size = 96, weight = 800, color = COLORS.slate, align = "flex-start", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: size * 0.1, ...style }}>
      {lines.map((line, i) => {
        const enter = spring({
          frame: frame - line.at,
          fps,
          config: { damping: 15, stiffness: 210, mass: 0.6 },
        });
        // Every line already down gets nudged by the one landing on top of it.
        const knock = lines
          .slice(i + 1)
          .reduce(
            (acc, later) =>
              acc +
              interpolate(frame - later.at, [0, 4, 12], [0, 6, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            0,
          );

        return (
          <div
            key={i}
            style={{
              ...base(size, weight, line.color ?? color),
              background: line.background,
              padding: line.background ? `${size * 0.06}px ${size * 0.18}px` : undefined,
              opacity: enter,
              translate: `0px ${(1 - enter) * -size * 0.7 + knock}px`,
              scale: `${interpolate(enter, [0, 1], [1.1, 1], { output: "perceptual-scale" })}`,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};

/* ── Pull quote ──────────────────────────────────────────────────────────── */

/** A quotation with drawn quote marks, for an objection or a real user line. */
export const PullQuote: React.FC<KineticProps & { attribution?: string; duration?: number }> = ({
  text,
  attribution,
  delay = 0,
  duration = 22,
  size = 62,
  weight = 700,
  color = COLORS.slate,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{ position: "relative", maxWidth: 880, opacity: t, ...style }}>
      <div
        style={{
          ...base(size * 2.6, 800, COLORS.teal),
          position: "absolute",
          left: -size * 0.9,
          top: -size * 0.9,
          opacity: 0.35 * t,
          scale: `${interpolate(t, [0, 1], [0.6, 1], { output: "perceptual-scale" })}`,
        }}
      >
        “
      </div>
      <div
        style={{
          ...base(size, weight, color),
          lineHeight: 1.26,
          translate: `0px ${(1 - t) * 18}px`,
        }}
      >
        {text}
      </div>
      {attribution ? (
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 600,
            fontSize: size * 0.44,
            color: COLORS.slate500,
            marginTop: size * 0.34,
          }}
        >
          — {attribution}
        </div>
      ) : null}
    </div>
  );
};

/* ── Odometer number ─────────────────────────────────────────────────────── */

/**
 * Digits roll independently like a mechanical counter. Reads differently from
 * `CountUp`, which interpolates the value — this one moves the glyphs.
 */
export const OdometerNumber: React.FC<{
  value: number;
  delay?: number;
  duration?: number;
  digits?: number;
  size?: number;
  color?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({
  value,
  delay = 0,
  duration = 30,
  digits,
  size = 150,
  color = COLORS.slate,
  suffix = "",
  style,
}) => {
  const frame = useCurrentFrame();
  const target = String(Math.round(value)).padStart(digits ?? String(Math.round(value)).length, "0");

  return (
    <div style={{ display: "flex", alignItems: "baseline", ...style }}>
      {target.split("").map((d, i) => {
        // Later digits settle first, so the number reads as it lands.
        const t = interpolate(frame - delay - (target.length - i) * 2, [0, duration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const offset = (1 - t) * (Number(d) + 10);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              height: size * 1.12,
              width: size * 0.62,
            }}
          >
            <span
              style={{
                ...base(size, 800, color),
                display: "block",
                fontVariantNumeric: "tabular-nums",
                translate: `0px ${-offset * size * 1.12}px`,
              }}
            >
              {new Array(24).fill(0).map((_, k) => (
                <span key={k} style={{ display: "block", height: size * 1.12, textAlign: "center" }}>
                  {(Number(d) + 10 - k + 100) % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      {suffix ? <span style={{ ...base(size, 800, color) }}>{suffix}</span> : null}
    </div>
  );
};
