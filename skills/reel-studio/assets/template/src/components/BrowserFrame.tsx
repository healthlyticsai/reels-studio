import React from "react";
import { Img, staticFile } from "remotion";
import { BRAND, COLORS, FONT_STACK } from "../theme";

/** macOS-style Chrome window used as the stage for the extension reveal. */
export const BrowserFrame: React.FC<{
  width: number;
  height: number;
  url?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  extensionGlow?: number;
}> = ({ width, height, url = "oscar.clinic.ca / encounter", children, style, extensionGlow = 0 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 26,
      overflow: "hidden",
      background: COLORS.white,
      border: `2px solid ${COLORS.slate200}`,
      boxShadow: "0 50px 110px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.08)",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {/* Title bar */}
    <div
      style={{
        height: 74,
        flexShrink: 0,
        background: "#F8FAFC",
        borderBottom: `2px solid ${COLORS.slate200}`,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 24px",
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 999, background: c }} />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          height: 42,
          borderRadius: 999,
          background: COLORS.white,
          border: `2px solid ${COLORS.slate200}`,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          fontFamily: FONT_STACK,
          fontSize: 22,
          fontWeight: 500,
          color: COLORS.slate500,
        }}
      >
        <div style={{ width: 16, height: 16, borderRadius: 4, background: COLORS.slate300 }} />
        {url}
      </div>

      {/* Extension toolbar slot */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {extensionGlow > 0 ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 190,
              height: 190,
              translate: "-50% -50%",
              opacity: extensionGlow,
              filter: "blur(18px)",
              background:
                "radial-gradient(circle, rgba(56,178,172,0.55) 0%, rgba(44,107,172,0.3) 45%, rgba(44,107,172,0) 70%)",
            }}
          />
        ) : null}
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, #2C6BAC 0%, #38B2AC 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 ${extensionGlow * 26}px rgba(56,178,172,${extensionGlow * 0.9})`,
            scale: `${1 + extensionGlow * 0.12}`,
            position: "relative",
          }}
        >
          <BrandMark size={30} white />
        </div>
      </div>
    </div>

    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
  </div>
);

/** The brand mark, resolved from brand.json so a re-skin needs no code change. */
export const BrandMark: React.FC<{ size?: number; white?: boolean; style?: React.CSSProperties }> = ({
  size = 40,
  white = false,
  style,
}) => (
  <Img
    src={staticFile(white ? BRAND.logo.markWhite : BRAND.logo.mark)}
    style={{ width: size, height: "auto", ...style }}
  />
);

/** Full horizontal brand lockup (mark plus wordmark). */
export const BrandLockup: React.FC<{ width?: number; white?: boolean; style?: React.CSSProperties }> = ({
  width = 520,
  white = false,
  style,
}) => (
  <Img
    src={staticFile(white ? BRAND.logo.lockupWhite : BRAND.logo.lockup)}
    style={{ width, height: "auto", ...style }}
  />
);
