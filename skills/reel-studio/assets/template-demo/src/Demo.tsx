import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { Caption } from "@remotion/captions";

import { COLORS } from "./theme";
import { FormatProvider, useFormat, type FormatId } from "./format";
import { CTA, HAS_VO, MUSIC, PRESENTER, SCENES, SFX, TOTAL, VO_END } from "./demoTimeline";
import type { TransitionStyle } from "./demoSpec";
import { Captions, buildPages } from "./components/Captions";
import { DemoScene } from "./components/DemoScene";
import * as T from "./components/Transitions";
import captionsJson from "./captions.json";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentation = (style: TransitionStyle): TransitionPresentation<any> | null => {
  switch (style) {
    case "cut":
      return null;
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: "from-right" });
    case "inkSplatter":
      return T.inkSplatter(COLORS.primaryDeep);
    case "cardPush":
      return T.cardPush(1);
    case "whipPan":
      return T.whipPan(1);
    case "barWipe":
      return T.barWipe(COLORS.primary);
    case "colorFlash":
      return T.colorFlash(COLORS.white);
    default: {
      const make = (T as Record<string, unknown>)[style];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof make === "function" ? (make as () => TransitionPresentation<any>)() : fade();
    }
  }
};

/**
 * The demo, rendered once per format. `Root.tsx` registers this as Demo-16x9
 * and Demo-9x16; every component underneath reads the format from context.
 */
export const Demo: React.FC<{ format: FormatId }> = ({ format }) => (
  <FormatProvider format={format}>
    <DemoBody />
  </FormatProvider>
);

const DemoBody: React.FC = () => {
  const f = useFormat();
  const pages = useMemo(
    () => buildPages(captionsJson as Caption[], f.captions.maxWords),
    [f.captions.maxWords],
  );
  // The presenter's name tag rides on their first full-size appearance only.
  const introId = SCENES.find((s) => s.type === "avatar" || s.type === "split")?.id;

  return (
    <AbsoluteFill style={{ background: COLORS.white, fontFamily }}>
      {/* ── Audio bed ──────────────────────────────────────── */}
      {MUSIC ? (
        <Audio
          src={staticFile("audio/bg.mp3")}
          loop
          volume={(fr) =>
            interpolate(
              fr,
              [0, 30, VO_END - 120, VO_END - 80, VO_END, TOTAL],
              [0, 0.12, 0.12, 0.22, 0.22, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          }
        />
      ) : null}
      {HAS_VO ? <Audio src={staticFile("audio/vo.mp3")} volume={1} /> : null}
      {SFX.map((hit, i) => (
        <Sequence key={i} from={Math.max(0, hit.at)} durationInFrames={90} layout="none">
          <Audio src={staticFile(`sfx/${hit.file}.wav`)} volume={hit.volume} playbackRate={hit.rate ?? 1} />
        </Sequence>
      ))}

      {/* ── Scenes ─────────────────────────────────────────── */}
      <TransitionSeries>
        {SCENES.flatMap((scene, i) => {
          const last = i === SCENES.length - 1;
          const pres = scene.transition && !last ? presentation(scene.transition.style) : null;
          const frames = pres ? scene.transition!.frames : 0;
          const parts = [
            <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.duration + frames}>
              <DemoScene scene={scene} cta={CTA} presenter={scene.id === introId ? PRESENTER : undefined} />
            </TransitionSeries.Sequence>,
          ];
          if (pres) {
            parts.push(
              <TransitionSeries.Transition
                key={`${scene.id}-t`}
                presentation={pres}
                timing={linearTiming({ durationInFrames: frames })}
              />,
            );
          }
          return parts;
        })}
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
