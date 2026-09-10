import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { GridBed, PaperTexture } from "../components/Texture";
import { CountUp, Deck, Eyebrow, Headline } from "../components/Type";
import { SAFE } from "../timing";

/**
 * EXAMPLE SCENE — replace this with the real scene 1 from PLAN.md.
 *
 * It is here so a fresh project compiles and renders immediately, and so there
 * is a working pattern to copy: frame anchors named after the words they land
 * on, sentence-case headlines with an animated mark for emphasis, texture last.
 *
 * Local frame anchors (replace with real ones from the transcript):
 *   0   "<opening sentence>"
 *   106 "<the number being quoted>"
 *   214 "<the supporting detail>"
 */
export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.slate100 }}>
      <GridBed opacity={0.5} />

      <div
        style={{
          position: "absolute",
          left: SAFE.x,
          right: SAFE.x,
          top: SAFE.top,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          // One slow continuous move per scene, so it never reads as a slideshow.
          translate: `0px ${interpolate(frame, [0, 342], [0, -24], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
        }}
      >
        <Eyebrow delay={0} color={COLORS.danger} border={`2px solid ${COLORS.danger}33`}>
          The problem
        </Eyebrow>

        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <CountUp to={2} delay={106} duration={22} size={170} color={COLORS.danger} />
          <Headline
            delay={110}
            size={96}
            segments={[
              {
                text: "hours lost",
                color: COLORS.danger,
                mark: { kind: "highlight", at: 132, color: COLORS.highlightWarn, rotate: -1.4 },
              },
            ]}
          />
        </div>

        <Headline delay={126} size={96} segments={[{ text: "every single day." }]} />

        <Deck delay={214} size={34} maxWidth={840}>
          Replace this with the deck line from the plan.
        </Deck>
      </div>

      <PaperTexture opacity={0.055} halftone={0.045} />
    </AbsoluteFill>
  );
};
