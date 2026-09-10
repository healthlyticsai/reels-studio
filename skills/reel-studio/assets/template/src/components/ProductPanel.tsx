import React from "react";
import { BRAND, COLORS, FONT_STACK, GRADIENT_DIAG } from "../theme";
import { BrandMark } from "./BrowserFrame";
import { SoundWave } from "./SoundWave";

export type PanelSection = { title: string; lines: string[] };

/**
 * A product-side panel: gradient brand header, live status pill, a context chip
 * pulled from the other system, and body sections that stream in character by
 * character. Written for the Waivs Scribe extension drawer — retitle the props
 * and the default `sections` for a different product.
 */
export const ProductPanel: React.FC<{
  width: number;
  height: number;
  /** 0 → 1 reveals note characters progressively. */
  typed?: number;
  listening?: number;
  contextLoaded?: number;
  sections?: PanelSection[];
  cursor?: boolean;
  style?: React.CSSProperties;
  templateLabel?: string;
}> = ({
  width,
  height,
  typed = 0,
  listening = 0,
  contextLoaded = 0,
  sections,
  cursor = true,
  style,
  templateLabel = "GENERAL SOAP",
}) => {
  const body: PanelSection[] =
    sections ?? [
      {
        title: "SUBJECTIVE",
        lines: [
          "54F presents with 3-week productive cough",
          "and intermittent low-grade fever. Denies",
          "chest pain, dyspnea or haemoptysis.",
        ],
      },
      {
        title: "OBJECTIVE",
        lines: ["T 37.8  BP 128/82  HR 88  SpO2 97% RA", "Crackles auscultated right lower lobe."],
      },
      {
        title: "ASSESSMENT",
        lines: ["Community-acquired pneumonia, RLL."],
      },
      {
        title: "PLAN",
        lines: ["Amoxicillin 500mg TID x 7 days.", "CXR ordered. Reassess in 48 hours."],
      },
    ];

  const allLines = body.flatMap((s) => s.lines);
  const totalChars = allLines.reduce((a, l) => a + l.length, 0);
  const budget = Math.round(totalChars * typed);

  let consumed = 0;
  const clip = (line: string) => {
    const remaining = budget - consumed;
    consumed += line.length;
    if (remaining <= 0) return null;
    return remaining >= line.length ? line : line.slice(0, remaining);
  };

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 24,
        overflow: "hidden",
        background: COLORS.white,
        border: `2px solid ${COLORS.slate200}`,
        boxShadow: "0 40px 90px rgba(15,23,42,0.22)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Gradient header */}
      <div
        style={{
          background: GRADIENT_DIAG,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BrandMark size={28} white />
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontFamily: FONT_STACK, fontWeight: 800, fontSize: 27, color: COLORS.white }}>
            {BRAND.product}
          </span>
          <span
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 600,
              fontSize: 16,
              color: "rgba(255,255,255,0.82)",
              letterSpacing: 1.2,
            }}
          >
            {templateLabel}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: listening > 0.3 ? "#FF6B6B" : "rgba(255,255,255,0.6)",
              boxShadow: listening > 0.3 ? "0 0 12px #FF6B6B" : "none",
            }}
          />
          <span style={{ fontFamily: FONT_STACK, fontWeight: 700, fontSize: 16, color: COLORS.white, letterSpacing: 1 }}>
            {listening > 0.3 ? "LISTENING" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Live waveform strip */}
      <div
        style={{
          padding: "11px 20px",
          borderBottom: `2px solid ${COLORS.slate200}`,
          background: "#F8FAFC",
          flexShrink: 0,
        }}
      >
        <SoundWave bars={30} width={width - 84} height={46} gap={5} active={listening} />
      </div>

      {/* Patient context chip pulled from OSCAR */}
      <div
        style={{
          margin: "11px 20px 0",
          padding: "10px 16px",
          borderRadius: 14,
          background: contextLoaded > 0.5 ? "#ECFDF5" : COLORS.slate100,
          border: `2px solid ${contextLoaded > 0.5 ? "#A7F3D0" : COLORS.slate200}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: 0.4 + contextLoaded * 0.6,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: contextLoaded > 0.5 ? COLORS.green : COLORS.slate300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.white,
            fontSize: 16,
            fontWeight: 800,
            fontFamily: FONT_STACK,
          }}
        >
          ✓
        </div>
        <span style={{ fontFamily: FONT_STACK, fontWeight: 700, fontSize: 19, color: COLORS.slate700 }}>
          {contextLoaded > 0.5 ? "Chart context loaded from OSCAR" : "Waiting for chart context…"}
        </span>
      </div>

      {/* Structured note body */}
      <div
        style={{
          flex: 1,
          padding: "13px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 11,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {body.map((section) => {
          const rendered = section.lines.map((l) => clip(l));
          const visible = rendered.some((r) => r !== null);

          return (
            <div key={section.title} style={{ opacity: visible ? 1 : 0.18 }}>
              <div
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 800,
                  fontSize: 17,
                  letterSpacing: 2,
                  color: COLORS.primary,
                  marginBottom: 6,
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 500,
                  fontSize: 21,
                  lineHeight: 1.45,
                  color: COLORS.slate700,
                }}
              >
                {rendered.map((line, i) =>
                  line === null ? null : (
                    <div key={i}>
                      {line}
                      {cursor && line.length < section.lines[i].length ? (
                        <span
                          style={{
                            display: "inline-block",
                            width: 3,
                            height: 22,
                            marginLeft: 2,
                            translate: "0px 4px",
                            background: COLORS.teal,
                          }}
                        />
                      ) : null}
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
