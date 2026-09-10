import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, COLORS, FONT_STACK, GRADIENT, SPRING } from "../theme";
import { Bloom, GridBed, PaperTexture } from "../components/Texture";
import { Deck, Eyebrow, Headline } from "../components/Type";
import { BrandLockup, BrandMark } from "../components/BrowserFrame";
import { Motes } from "../components/MotionGraphics";

/**
 * EXAMPLE SCENE — replace with the real closing scene from PLAN.md.
 *
 * Note the bottom band: the call to action stops at 240px from the bottom so it
 * clears the caption safe zone. Anything lower renders under a caption pill.
 */
export const SceneCta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaPop = spring({ frame: frame - 60, fps, config: SPRING.punch });
  const sweep = ((frame - 60) % 62) / 62;

  return (
    <AbsoluteFill style={{ background: COLORS.white }}>
      <GridBed color={COLORS.slate200} opacity={0.65} size={72} />
      <Bloom x={540} y={1080} size={1800} blur={50} opacity={1} />
      <Motes count={20} opacity={0.3} />

      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <BrandLockup width={470} />
        <Eyebrow delay={12} size={23} background="#ECFDF5" color="#047857" border="2px solid #A7F3D0">
          ✓ Replace with a trust badge
        </Eyebrow>

        <div style={{ height: 6 }} />

        <Headline
          delay={20}
          size={84}
          segments={[
            { text: "Reclaim" },
            {
              text: "2+ hours",
              gradient: true,
              mark: { kind: "highlight", at: 48, color: COLORS.highlight, rotate: -1.1 },
            },
          ]}
        />
        <Headline delay={36} size={84} segments={[{ text: "every single day." }]} />

        <Deck delay={58} size={33} maxWidth={800}>
          Replace with the closing line from the plan.
        </Deck>
      </div>

      {/* Bottom 240px clears the caption band. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 240,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 999,
            background: GRADIENT,
            padding: "27px 56px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            boxShadow: "0 26px 60px rgba(44,107,172,0.42)",
            opacity: Math.min(1, ctaPop * 1.6),
            scale: `${interpolate(ctaPop, [0, 1], [0.68, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              output: "perceptual-scale",
            })}`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 240,
              left: `${sweep * 160 - 30}%`,
              background:
                "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)",
              opacity: frame > 60 ? 1 : 0,
            }}
          />
          <BrandMark size={44} white />
          <span
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              fontSize: 45,
              color: COLORS.white,
              letterSpacing: -0.5,
            }}
          >
            Get {BRAND.product}
          </span>
          <span style={{ fontSize: 44, color: COLORS.white, translate: "0px -2px" }}>→</span>
        </div>

        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 700,
            fontSize: 33,
            color: COLORS.primary,
            opacity: interpolate(frame, [96, 116], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {BRAND.url}
        </div>
      </div>

      <PaperTexture opacity={0.045} halftone={0.03} />
    </AbsoluteFill>
  );
};
