import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";
import { Backdrop, CameraMove } from "../components/Backdrop";
import { PaperTexture } from "../components/Texture";
import { CountUp, Deck, Eyebrow, Headline } from "../components/Type";
import { DotMatrix } from "../components/Devices";
import { BACKDROP, CAMERA, SCENE_TYPE_ANIM } from "../look";
import { SAFE, SCENES } from "../timing";

/**
 * EXAMPLE SCENE — replace this with the real scene 1 from PLAN.md.
 *
 * It is here so a fresh project compiles and renders immediately, and so there
 * is a working pattern to copy:
 *
 *   <Backdrop>      the art direction drawn for this reel, first in every scene
 *   <CameraMove>    the frame's own move, wrapped around the content
 *   anim=           the kinetic type system this scene was assigned, from look.ts
 *   a motion motif  one of the reel's three signature devices
 *   <PaperTexture>  last, always
 *
 * Frame anchors are named after the words they land on, headlines are sentence
 * case, and emphasis comes from an animated mark rather than from shouting.
 *
 * Local frame anchors (replace with real ones from the transcript):
 *   0   "<opening sentence>"
 *   106 "<the number being quoted>"
 *   214 "<the supporting detail>"
 */
export const SceneProblem: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop variant={BACKDROP} />

      <CameraMove mode={CAMERA} duration={SCENES.problem.duration}>
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
              anim={SCENE_TYPE_ANIM.problem}
              segments={[
                {
                  text: "hours lost",
                  color: COLORS.danger,
                  mark: { kind: "highlight", at: 132, color: COLORS.highlightWarn, rotate: -1.4 },
                },
              ]}
            />
          </div>

          <Headline
            delay={126}
            size={96}
            anim={SCENE_TYPE_ANIM.problem}
            segments={[{ text: "every single day." }]}
          />

          <Deck delay={214} size={34} maxWidth={840}>
            Replace this with the deck line from the plan.
          </Deck>

          {/* One of the reel's three motion motifs, pinned to the word it lands on. */}
          <DotMatrix filled={62} at={214} color={COLORS.danger} columns={10} dot={22} gap={12} />
        </div>
      </CameraMove>

      <PaperTexture opacity={0.055} halftone={0.045} />
    </AbsoluteFill>
  );
};
