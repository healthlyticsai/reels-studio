import React from "react";
import { COLORS, FONT_STACK } from "../theme";

const rand = (n: number) => {
  const x = Math.sin(n * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
};

/** A single faux clinical document — deliberately unreadable, purely textural. */
export const PaperSheet: React.FC<{
  seed: number;
  width?: number;
  title?: string;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ seed, width = 300, title, accent = COLORS.slate300, style }) => {
  const rows = 7 + Math.floor(rand(seed) * 4);

  return (
    <div
      style={{
        width,
        aspectRatio: "3 / 4",
        background: COLORS.white,
        borderRadius: 10,
        border: `1.5px solid ${COLORS.slate200}`,
        boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
        padding: width * 0.075,
        display: "flex",
        flexDirection: "column",
        gap: width * 0.035,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: width * 0.072,
          color: COLORS.slate500,
          letterSpacing: 0.8,
          marginBottom: width * 0.02,
        }}
      >
        {title ?? ["PROGRESS NOTE", "BILLING FORM", "REFERRAL", "LAB REQ", "CONSULT"][seed % 5]}
      </div>
      <div style={{ height: 3, background: accent, width: "38%", borderRadius: 99 }} />
      {new Array(rows).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            height: width * 0.026,
            borderRadius: 99,
            background: COLORS.slate200,
            width: `${45 + rand(seed * 13 + i) * 53}%`,
          }}
        />
      ))}
      <div style={{ flex: 1 }} />
      <div
        style={{
          height: width * 0.09,
          borderRadius: 6,
          background: COLORS.slate100,
          border: `1.5px dashed ${COLORS.slate300}`,
        }}
      />
    </div>
  );
};

/** Checkbox-grid form, adds visual variety to the paperwork avalanche. */
export const FormSheet: React.FC<{ seed: number; width?: number; style?: React.CSSProperties }> = ({
  seed,
  width = 300,
  style,
}) => (
  <div
    style={{
      width,
      aspectRatio: "3 / 4",
      background: "#FEFEFE",
      borderRadius: 10,
      border: `1.5px solid ${COLORS.slate200}`,
      boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
      padding: width * 0.08,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: width * 0.05,
      alignContent: "start",
      ...style,
    }}
  >
    {new Array(12).fill(0).map((_, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: width * 0.03 }}>
        <div
          style={{
            width: width * 0.06,
            height: width * 0.06,
            borderRadius: 3,
            border: `2px solid ${COLORS.slate300}`,
            background: rand(seed + i) > 0.62 ? COLORS.slate300 : "transparent",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            height: width * 0.024,
            borderRadius: 99,
            background: COLORS.slate200,
            flex: 1,
          }}
        />
      </div>
    ))}
  </div>
);

/** Analog clock whose hands can be spun fast to signal lost time. */
export const Clock: React.FC<{ size: number; hours: number; style?: React.CSSProperties }> = ({
  size,
  hours,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: COLORS.white,
      border: `${size * 0.045}px solid ${COLORS.slate}`,
      boxShadow: "0 24px 60px rgba(15,23,42,0.22)",
      position: "relative",
      ...style,
    }}
  >
    {new Array(12).fill(0).map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: "6%",
          width: size * 0.018,
          height: size * 0.07,
          background: COLORS.slate300,
          borderRadius: 99,
          transformOrigin: `50% ${size * 0.44}px`,
          rotate: `${i * 30}deg`,
          translate: "-50% 0px",
        }}
      />
    ))}
    {/* Hour hand */}
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "50%",
        width: size * 0.035,
        height: size * 0.27,
        background: COLORS.slate,
        borderRadius: 99,
        transformOrigin: "50% 100%",
        translate: "-50% 0px",
        rotate: `${hours * 30}deg`,
      }}
    />
    {/* Minute hand */}
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "50%",
        width: size * 0.024,
        height: size * 0.38,
        background: COLORS.danger,
        borderRadius: 99,
        transformOrigin: "50% 100%",
        translate: "-50% 0px",
        rotate: `${hours * 360}deg`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size * 0.07,
        height: size * 0.07,
        background: COLORS.slate,
        borderRadius: 999,
        translate: "-50% -50%",
      }}
    />
  </div>
);
