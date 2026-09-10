import React from "react";
import { interpolate } from "remotion";
import { COLORS, FONT_STACK } from "../theme";

const Row: React.FC<{ label: string; value: string; dim?: boolean }> = ({ label, value, dim }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "12px 0",
      borderBottom: `1px solid ${COLORS.slate200}`,
      fontFamily: FONT_STACK,
    }}
  >
    <span style={{ fontSize: 21, fontWeight: 600, color: COLORS.slate500, letterSpacing: 0.4 }}>
      {label}
    </span>
    <span
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: dim ? COLORS.slate500 : COLORS.slate,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * The incumbent system's screen — deliberately utilitarian so the contrast with
 * the product panel reads instantly. Written as an OSCAR EMR encounter view;
 * swap the header label, rows and body lines for a different integration story.
 */
export const LegacyChart: React.FC<{
  width: number;
  height: number;
  /** 0 → 1 fills the encounter note box with synced text. */
  noteFill?: number;
  highlightChart?: number;
  /** Trims the demographics block so the card fits a short stage. */
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({ width, height, noteFill = 0, highlightChart = 0, compact = false, style }) => {
  const noteLines = [
    "S: 54F, 3-week productive cough, low-grade fever.",
    "Denies chest pain. Non-smoker. No recent travel.",
    "O: T 37.8 BP 128/82 HR 88 SpO2 97% RA.",
    "Chest: scattered crackles RLL. No wheeze.",
    "A: Community-acquired pneumonia, RLL.",
    "P: Amoxicillin 500mg TID x7d. CXR ordered.",
    "   Reassess 48h. Return precautions given.",
  ];
  const shown = Math.round(interpolate(noteFill, [0, 1], [0, noteLines.length]));
  const lines = compact ? noteLines.slice(0, 4) : noteLines;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 22,
        background: COLORS.white,
        border: `2px solid ${COLORS.slate200}`,
        boxShadow: "0 40px 90px rgba(15,23,42,0.20)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* OSCAR header bar - the old-school clinical chrome */}
      <div
        style={{
          background: "#1F3A5F",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: 26,
            color: COLORS.white,
            letterSpacing: 1.6,
          }}
        >
          OSCAR EMR
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {["Chart", "Rx", "Labs", "Billing"].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: FONT_STACK,
                fontSize: 17,
                fontWeight: 600,
                color: "#B9CBE2",
                padding: "5px 12px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Demographics block, pulses when Waivs reads the chart */}
        <div
          style={{
            borderRadius: 12,
            padding: "10px 14px",
            background: interpolate(highlightChart, [0, 1], [0, 1]) > 0.02 ? "#ECFDF5" : "transparent",
            outline: `${highlightChart * 3}px solid ${COLORS.green}`,
            outlineOffset: 3,
            transition: "none",
          }}
        >
          <Row label="PATIENT" value="DOE, JANE  •  54F" />
          <Row label="ALLERGIES" value="Penicillin — rash" />
          {compact ? null : <Row label="HIN" value="8842 991 337" dim />}
          <Row label="ACTIVE RX" value="Metformin, Ramipril" dim />
          {compact ? null : <Row label="LAST VISIT" value="2026-07-14" dim />}
        </div>

        {/* Encounter note textarea */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <span
            style={{
              fontFamily: FONT_STACK,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1.6,
              color: COLORS.slate500,
              marginBottom: 8,
            }}
          >
            ENCOUNTER NOTE
          </span>
          <div
            style={{
              flex: 1,
              borderRadius: 10,
              border: `2px solid ${noteFill > 0 ? COLORS.teal : COLORS.slate200}`,
              background: "#FCFDFE",
              padding: "14px 16px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 18,
              lineHeight: 1.62,
              color: COLORS.slate700,
              overflow: "hidden",
              boxShadow: noteFill > 0 ? `0 0 0 6px rgba(56,178,172,0.14)` : "none",
            }}
          >
            {lines.slice(0, shown).map((l) => (
              <div key={l} style={{ whiteSpace: "pre" }}>
                {l}
              </div>
            ))}
            {shown === 0 ? (
              <span style={{ color: COLORS.slate300 }}>— empty —</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
