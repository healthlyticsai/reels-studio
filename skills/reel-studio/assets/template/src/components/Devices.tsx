import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { getLength, getPointAtLength } from "@remotion/paths";
import { COLORS, FONT_STACK, GRADIENT, cardSurface } from "../theme";

/**
 * Signature motion devices.
 *
 * direction.json draws three of these per reel and the plan assigns them to
 * scenes, so the recurring visual idea differs from one reel to the next
 * instead of every reel reaching for the same ripple rings and bar chart.
 *
 * Everything here is pure SVG or CSS — nothing is an image — so it stays crisp
 * at 1080x1920 and can be pinned frame-accurately to a spoken word.
 */

const label = (size: number): React.CSSProperties => ({
  fontFamily: FONT_STACK,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: 0.4,
});

/* ── Dot matrix ──────────────────────────────────────────────────────────── */

/**
 * A grid of dots where a counted number fills in — hours, forms, patients.
 * Turns an abstract quantity into something the eye can actually count.
 */
export const DotMatrix: React.FC<{
  total?: number;
  filled: number;
  at: number;
  columns?: number;
  dot?: number;
  gap?: number;
  color?: string;
  empty?: string;
  duration?: number;
}> = ({
  total = 100,
  filled,
  at,
  columns = 10,
  dot = 26,
  gap = 14,
  color = COLORS.danger,
  empty = COLORS.slate200,
  duration = 40,
}) => {
  const frame = useCurrentFrame();
  const shown = interpolate(frame - at, [0, duration], [0, filled], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, ${dot}px)`,
        gap,
      }}
    >
      {new Array(total).fill(0).map((_, i) => {
        const on = i < shown;
        return (
          <div
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              background: on ? color : empty,
              scale: `${on ? interpolate(shown - i, [0, 1], [0.4, 1], { extrapolateRight: "clamp" }) : 1}`,
            }}
          />
        );
      })}
    </div>
  );
};

/* ── Timeline rail ───────────────────────────────────────────────────────── */

/** A horizontal rail with markers filling in as the narration walks a sequence. */
export const TimelineRail: React.FC<{
  points: { label: string; at: number; color?: string }[];
  width?: number;
  color?: string;
}> = ({ points, width = 880, color = COLORS.primary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const last = points[points.length - 1]?.at ?? 0;
  const first = points[0]?.at ?? 0;
  const progress = interpolate(frame, [first, last + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width, position: "relative", height: 150 }}>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          height: 6,
          borderRadius: 3,
          background: COLORS.slate200,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          width: `${progress * 100}%`,
          height: 6,
          borderRadius: 3,
          background: GRADIENT,
        }}
      />
      {points.map((p, i) => {
        const x = points.length === 1 ? 0 : (i / (points.length - 1)) * 100;
        const enter = spring({ frame: frame - p.at, fps, config: { damping: 15, stiffness: 220, mass: 0.5 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: 0,
              translate: "-50% 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: enter,
            }}
          >
            <div style={{ ...label(24), color: COLORS.slate500, whiteSpace: "nowrap" }}>{p.label}</div>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                background: p.color ?? color,
                border: `4px solid ${COLORS.white}`,
                scale: `${interpolate(enter, [0, 1], [0.2, 1], { output: "perceptual-scale" })}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ── Path trace ──────────────────────────────────────────────────────────── */

/** A line drawing itself between points, with a dot travelling the path. */
export const PathTrace: React.FC<{
  d?: string;
  at: number;
  duration?: number;
  width?: number;
  height?: number;
  stroke?: string;
  thickness?: number;
  dashed?: boolean;
}> = ({
  d = "M40 320 C 220 320, 220 120, 400 120 S 600 300, 780 180",
  at,
  duration = 40,
  width = 820,
  height = 400,
  stroke = COLORS.teal,
  thickness = 8,
  dashed = false,
}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame - at, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  // The dot has to be positioned from the path itself — SVG's own <animateMotion>
  // is a SMIL clock and never advances under a frame-by-frame renderer.
  const head = draw > 0 && draw < 1 ? getPointAtLength(d, getLength(d) * draw) : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <path
        d={d}
        stroke={stroke}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={dashed ? "0.02 0.02" : 1}
        strokeDashoffset={dashed ? -draw : 1 - draw}
        opacity={dashed ? 0.9 : 1}
      />
      {head ? <circle cx={head.x} cy={head.y} r={thickness * 1.5} fill={stroke} /> : null}
    </svg>
  );
};

/* ── Orbit dots ──────────────────────────────────────────────────────────── */

/** Satellites circling a centre — the product, and everything it touches. */
export const OrbitDots: React.FC<{
  size?: number;
  count?: number;
  period?: number;
  color?: string;
  ringColor?: string;
  children?: React.ReactNode;
}> = ({ size = 520, count = 6, period = 220, color = COLORS.teal, ringColor = COLORS.slate200, children }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {[0.55, 0.78, 1].map((r, ri) => (
        <div
          key={ri}
          style={{
            position: "absolute",
            inset: `${((1 - r) / 2) * 100}%`,
            borderRadius: "50%",
            border: `2px dashed ${ringColor}`,
            opacity: 0.6,
          }}
        />
      ))}
      {new Array(count).fill(0).map((_, i) => {
        const ring = [0.55, 0.78, 1][i % 3];
        const dir = i % 2 === 0 ? 1 : -1;
        const angle = ((frame / period) * Math.PI * 2 * dir) + (i / count) * Math.PI * 2;
        const radius = (size / 2) * ring;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 22,
              height: 22,
              borderRadius: 11,
              background: color,
              translate: `${Math.cos(angle) * radius - 11}px ${Math.sin(angle) * radius - 11}px`,
              boxShadow: `0 0 22px ${color}88`,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ── Floating cards ──────────────────────────────────────────────────────── */

/** A parallax stack that fans out — a set of things becoming one thing. */
export const FloatingCards: React.FC<{
  cards: { title: string; body?: string }[];
  at: number;
  width?: number;
  height?: number;
  spread?: number;
}> = ({ cards, at, width = 520, height = 320, spread = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Step far enough down that each card's title clears the one stacked on top
  // of it — a smaller step buries every title but the last.
  const step = Math.max(96, height * 0.36) * spread;

  return (
    <div style={{ position: "relative", width, height: height + (cards.length - 1) * step }}>
      {cards.map((card, i) => {
        const enter = spring({
          frame: frame - at - i * 5,
          fps,
          config: { damping: 16, stiffness: 120, mass: 0.8 },
        });
        const drift = Math.sin((frame + i * 40) / 70) * 6;
        return (
          <div
            key={i}
            style={{
              ...cardSurface(26),
              position: "absolute",
              left: (i - (cards.length - 1) / 2) * 26 * spread,
              top: i * step,
              width,
              height,
              padding: 34,
              opacity: enter,
              translate: `0px ${(1 - enter) * 60 + drift}px`,
              rotate: `${(i - (cards.length - 1) / 2) * 2.2 * spread}deg`,
              zIndex: i,
            }}
          >
            <div style={{ ...label(34), color: COLORS.slate }}>{card.title}</div>
            {card.body ? (
              <div style={{ ...label(24), fontWeight: 500, color: COLORS.slate500, marginTop: 14, lineHeight: 1.4 }}>
                {card.body}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

/* ── Split compare ───────────────────────────────────────────────────────── */

/** A moving divider between two states. The wipe itself carries the argument. */
export const SplitCompare: React.FC<{
  at: number;
  duration?: number;
  to?: number;
  left: React.ReactNode;
  right: React.ReactNode;
  divider?: string;
}> = ({ at, duration = 34, to = 0.78, left, right, divider = COLORS.white }) => {
  const frame = useCurrentFrame();
  const split = interpolate(frame - at, [0, duration], [0.5, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}>{left}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${split * 100}%)` }}>{right}</AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${split * 100}%`,
          width: 6,
          translate: "-50% 0",
          background: divider,
          boxShadow: "0 0 34px rgba(0,0,0,0.35)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ── Pulse map ───────────────────────────────────────────────────────────── */

/** A field of nodes with pings travelling between them — reach, adoption. */
export const PulseMap: React.FC<{
  nodes?: number;
  width?: number;
  height?: number;
  color?: string;
  period?: number;
}> = ({ nodes = 22, width = 900, height = 620, color = COLORS.teal, period = 90 }) => {
  const frame = useCurrentFrame();

  const points = new Array(nodes).fill(0).map((_, i) => ({
    x: random(`px${i}`) * width,
    y: random(`py${i}`) * height,
    phase: random(`pp${i}`) * period,
  }));

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {points.slice(1).map((p, i) => (
        <line
          key={`l${i}`}
          x1={points[0].x}
          y1={points[0].y}
          x2={p.x}
          y2={p.y}
          stroke={color}
          strokeWidth={1.4}
          opacity={0.18}
        />
      ))}
      {points.map((p, i) => {
        const t = ((frame + p.phase) % period) / period;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill={color} opacity={0.85} />
            <circle
              cx={p.x}
              cy={p.y}
              r={5 + t * 44}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={(1 - t) * 0.6}
            />
          </g>
        );
      })}
    </svg>
  );
};

/* ── Radial burst ────────────────────────────────────────────────────────── */

/** Speed lines firing out on a stressed syllable. */
export const RadialBurst: React.FC<{
  at: number;
  count?: number;
  color?: string;
  length?: number;
  duration?: number;
}> = ({ at, count = 22, color = COLORS.slate, length = 320, duration = 16 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - at, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  if (t <= 0 || t >= 1) return null;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      {new Array(count).fill(0).map((_, i) => {
        const angle = (i / count) * 360 + random(`b${i}`) * 6;
        const inner = 90 + t * length * 0.8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 4,
              height: 40 + random(`bl${i}`) * 60,
              background: color,
              borderRadius: 2,
              opacity: (1 - t) * 0.65,
              rotate: `${angle}deg`,
              translate: `0px ${-inner}px`,
              transformOrigin: "center",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ── Halftone wave ───────────────────────────────────────────────────────── */

/** A field of dots swelling in a wave — listening, signal, breathing. */
export const HalftoneWave: React.FC<{
  columns?: number;
  rows?: number;
  spacing?: number;
  color?: string;
  speed?: number;
  maxDot?: number;
}> = ({ columns = 24, rows = 14, spacing = 42, color = COLORS.primary, speed = 0.06, maxDot = 15 }) => {
  const frame = useCurrentFrame();

  return (
    <svg width={columns * spacing} height={rows * spacing} style={{ overflow: "visible" }}>
      {new Array(rows).fill(0).map((_, r) =>
        new Array(columns).fill(0).map((__, c) => {
          const d = Math.hypot(c - columns / 2, (r - rows / 2) * 1.6);
          const wave = Math.sin(frame * speed - d * 0.55);
          const radius = 2 + ((wave + 1) / 2) * maxDot;
          return (
            <circle
              key={`${r}-${c}`}
              cx={c * spacing + spacing / 2}
              cy={r * spacing + spacing / 2}
              r={radius}
              fill={color}
              opacity={0.16 + ((wave + 1) / 2) * 0.5}
            />
          );
        }),
      )}
    </svg>
  );
};

/* ── Progress arc ────────────────────────────────────────────────────────── */

/** Circular gauge filling to a number — time saved, coverage, completion. */
export const ProgressArc: React.FC<{
  to: number;
  at: number;
  duration?: number;
  size?: number;
  thickness?: number;
  color?: string;
  track?: string;
  caption?: string;
  suffix?: string;
}> = ({
  to,
  at,
  duration = 38,
  size = 380,
  thickness = 26,
  color = COLORS.teal,
  track = COLORS.slate200,
  caption,
  suffix = "%",
}) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame - at, [0, duration], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ rotate: "-90deg" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div style={{ ...label(size * 0.26), fontWeight: 800, color: COLORS.slate, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)}
          {suffix}
        </div>
        {caption ? <div style={{ ...label(size * 0.07), color: COLORS.slate500 }}>{caption}</div> : null}
      </div>
    </div>
  );
};

/* ── Isometric grid ──────────────────────────────────────────────────────── */

/** Isometric tiles rising out of a plane in sequence — building, scaling. */
export const IsoGrid: React.FC<{
  at: number;
  cols?: number;
  rows?: number;
  tile?: number;
  color?: string;
  accent?: string;
  stagger?: number;
}> = ({ at, cols = 6, rows = 6, tile = 96, color = COLORS.slate200, accent = COLORS.primary, stagger = 2.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: cols * tile,
        height: rows * tile * 0.6,
        position: "relative",
        transform: "rotateX(56deg) rotateZ(45deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {new Array(rows).fill(0).map((_, r) =>
        new Array(cols).fill(0).map((__, c) => {
          const order = r + c;
          const enter = spring({
            frame: frame - at - order * stagger,
            fps,
            config: { damping: 14, stiffness: 160, mass: 0.6 },
          });
          const hot = random(`h${r}${c}`) > 0.72;
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * tile,
                top: r * tile * 0.6,
                width: tile * 0.86,
                height: tile * 0.52,
                background: hot ? accent : color,
                opacity: enter * (hot ? 0.95 : 0.7),
                translate: `0px ${(1 - enter) * -70}px`,
                borderRadius: 6,
              }}
            />
          );
        }),
      )}
    </div>
  );
};

/* ── Film strip ──────────────────────────────────────────────────────────── */

/** A strip of frames scrolling past, each one a moment in the story. */
export const FilmStrip: React.FC<{
  frames: React.ReactNode[];
  speed?: number;
  frameWidth?: number;
  frameHeight?: number;
  rotate?: number;
}> = ({ frames, speed = 1.6, frameWidth = 300, frameHeight = 200, rotate = -3 }) => {
  const frame = useCurrentFrame();
  const unit = frameWidth + 22;
  const offset = (frame * speed) % unit;
  const repeated = [...frames, ...frames, ...frames];

  return (
    <div
      style={{
        display: "flex",
        gap: 22,
        padding: "22px 0",
        background: COLORS.slate,
        rotate: `${rotate}deg`,
        translate: `${-offset}px 0px`,
        borderTop: `6px dashed ${COLORS.slate700}`,
        borderBottom: `6px dashed ${COLORS.slate700}`,
      }}
    >
      {repeated.map((node, i) => (
        <div
          key={i}
          style={{
            width: frameWidth,
            height: frameHeight,
            flex: "0 0 auto",
            background: COLORS.slate100,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {node}
        </div>
      ))}
    </div>
  );
};

/* ── Tape strip ──────────────────────────────────────────────────────────── */

/** Masking-tape label, stuck down at an angle. */
export const TapeStrip: React.FC<{
  children: React.ReactNode;
  at?: number;
  rotate?: number;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, at = 0, rotate = -2.5, color = "#F3E6C4", size = 30, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - at, fps, config: { damping: 17, stiffness: 240, mass: 0.5 } });

  return (
    <div
      style={{
        ...label(size),
        color: COLORS.slate700,
        background: color,
        padding: `${size * 0.4}px ${size * 1.3}px`,
        rotate: `${rotate}deg`,
        opacity: enter,
        scale: `${interpolate(enter, [0, 1], [0.86, 1], { output: "perceptual-scale" })}`,
        boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
        // Torn tape ends, cut straight out of the box rather than drawn.
        clipPath: "polygon(2% 0, 98% 3%, 100% 100%, 1% 97%)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ── Spotlight mask ──────────────────────────────────────────────────────── */

/** Everything dims but one region — the cheapest way to direct the eye. */
export const SpotlightMask: React.FC<{
  at: number;
  x: number;
  y: number;
  radius?: number;
  duration?: number;
  dim?: number;
}> = ({ at, x, y, radius = 340, duration = 14, dim = 0.62 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - at, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  if (t <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle ${radius}px at ${x}px ${y}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 72%, rgba(0,0,0,${dim}) 100%)`,
        opacity: t,
        pointerEvents: "none",
      }}
    />
  );
};
