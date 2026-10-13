import React from "react";

/** Bezel thickness on every side, so a caller can size the screen area exactly. */
export const PHONE_PAD = 18;

/**
 * A plain modern phone around a mobile screenshot: dark bezel, rounded screen,
 * a small camera island. Deliberately brandless — the screenshot is the subject.
 */
export const PhoneFrame: React.FC<{
  width: number;
  height: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ width, height, children, style }) => {
  const radius = Math.min(width, height) * 0.13;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        padding: PHONE_PAD,
        borderRadius: radius,
        background: "linear-gradient(160deg, #1F2937 0%, #0B1220 100%)",
        boxShadow:
          "0 50px 110px rgba(15,23,42,0.3), 0 8px 24px rgba(15,23,42,0.12), inset 0 0 0 2px rgba(255,255,255,0.08)",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: radius - PHONE_PAD,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {children}
        <div
          style={{
            position: "absolute",
            top: PHONE_PAD * 0.6,
            left: "50%",
            translate: "-50% 0",
            width: width * 0.26,
            height: PHONE_PAD * 1.5,
            borderRadius: 999,
            background: "#05070C",
          }}
        />
      </div>
    </div>
  );
};
