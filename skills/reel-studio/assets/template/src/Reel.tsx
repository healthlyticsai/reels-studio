import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { Caption } from "@remotion/captions";

import { COLORS } from "./theme";
import { SCENE_DURATION, TOTAL, TRANSITIONS, VO_END } from "./timing";
import { Captions, buildPages } from "./components/Captions";
import { Sfx } from "./Sfx";
// Also available: cardPush(dir), inkSplatter(color), stackShuffle().
import { tornPaper } from "./components/Transitions";
import captionsJson from "./captions.json";

// Scenes live in src/scenes/. Two examples ship so a fresh project compiles and
// renders immediately — replace them with the scenes from PLAN.md.
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneCta } from "./scenes/SceneCta";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

export const Reel: React.FC = () => {
  const pages = useMemo(() => buildPages(captionsJson as Caption[]), []);

  return (
    <AbsoluteFill style={{ background: COLORS.white, fontFamily }}>
      {/* ── Audio bed ──────────────────────────────────────── */}
      <Audio
        src={staticFile("audio/bg.mp3")}
        loop
        volume={(f) =>
          interpolate(
            f,
            [0, 30, VO_END - 120, VO_END - 80, VO_END, TOTAL],
            [0, 0.16, 0.16, 0.26, 0.26, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />
      <Audio src={staticFile("audio/vo.mp3")} volume={1} />
      <Sfx />

      {/* ── Scenes ─────────────────────────────────────────── */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION.problem}>
          <SceneProblem />
        </TransitionSeries.Sequence>

        {/*
          Pick the transition whose physical metaphor matches the argument:
          tornPaper() leaves a world behind, inkSplatter(color) floods into a
          dark scene, cardPush(dir) is a hard change of subject, stackShuffle()
          deals the old scene away. See references/component-kit.md.
        */}
        <TransitionSeries.Transition
          presentation={tornPaper()}
          timing={linearTiming({ durationInFrames: TRANSITIONS.problemToCta })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATION.cta}>
          <SceneCta />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* ── Burned-in captions ─────────────────────────────── */}
      <Captions pages={pages} />

      <FinalFade />
    </AbsoluteFill>
  );
};

const FinalFade: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [TOTAL - 14, TOTAL], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0.001) return null;
  return <AbsoluteFill style={{ background: COLORS.white, opacity, zIndex: 60 }} />;
};
