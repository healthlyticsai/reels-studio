import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_STACK } from "../theme";

/**
 * Product-film type: big, bold, lit from within. Each word resolves out of a
 * soft blur and rises into place, with a glow behind it that reads on the
 * brand gradient and over a presenter shot alike. Emphasised words take the
 * accent colour.
 *
 * The glow is a stack of text-shadows rather than a filter, so it stays crisp
 * at 4K and costs nothing to render.
 */

export const GLOW = {
  /** Warm pale lime — the highlight colour of the reference style. */
  accent: "#E6F9A6",
  text: "#FFFFFF",
  glow: "rgba(230,249,166,0.55)",
};

const shadow = (glow: string, size: number) =>
  `0 0 ${size * 0.18}px ${glow}, 0 0 ${size * 0.45}px ${glow}, 0 ${size * 0.04}px ${size * 0.12}px rgba(3,10,25,0.35)`;

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

export const GlowText: React.FC<{
  text: string;
  /** Frame the first word lands. */
  at: number;
  /** Frames between words. */
  stagger?: number;
  size?: number;
  /** Words (from `text`) drawn in the accent colour. */
  emphasis?: string;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  color?: string;
  accent?: string;
  glow?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  at,
  stagger = 4,
  size = 72,
  emphasis,
  align = "center",
  maxWidth,
  color = GLOW.text,
  accent = GLOW.accent,
  glow = GLOW.glow,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const hot = new Set((emphasis ?? "").split(/\s+/).map(norm).filter(Boolean));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        gap: `${size * 0.08}px ${size * 0.26}px`,
        maxWidth,
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -size * 0.012,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const local = frame - (at + i * stagger);
        const e = spring({ frame: local, fps, config: { damping: 20, stiffness: 140, mass: 0.7 } });
        const isHot = hot.has(norm(w));
        return (
          <span
            key={`${w}-${i}`}
            style={{
              display: "inline-block",
              color: isHot ? accent : color,
              opacity: interpolate(local, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              filter: `blur(${interpolate(e, [0, 1], [size * 0.12, 0])}px)`,
              translate: `0px ${interpolate(e, [0, 1], [size * 0.3, 0])}px`,
              textShadow: shadow(isHot ? glow : "rgba(255,255,255,0.35)", size),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/**
 * A checklist that builds line by line — the "pulls out the requirements / the
 * decisions / action items" beat. Each item lands on its own frame.
 */
export const GlowList: React.FC<{
  items: { text: string; at: number }[];
  size?: number;
  icon?: string;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ items, size = 56, icon = "✱", gap, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: gap ?? size * 0.42, ...style }}>
      {items.map((item, i) => {
        const local = frame - item.at;
        const e = spring({ frame: local, fps, config: { damping: 18, stiffness: 150, mass: 0.6 } });
        if (local < 0) return <div key={i} style={{ height: size * 1.08 }} />;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: size * 0.4,
              opacity: Math.min(1, e * 1.4),
              translate: `${interpolate(e, [0, 1], [-size * 0.8, 0])}px 0px`,
              fontFamily: FONT_STACK,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.08,
              color: GLOW.text,
              textShadow: shadow("rgba(255,255,255,0.3)", size),
            }}
          >
            <span
              style={{
                color: GLOW.accent,
                fontSize: size * 1.05,
                textShadow: shadow(GLOW.glow, size),
                scale: `${interpolate(e, [0, 1], [0.3, 1])}`,
                display: "inline-block",
              }}
            >
              {icon}
            </span>
            {item.text}
          </div>
        );
      })}
    </div>
  );
};
