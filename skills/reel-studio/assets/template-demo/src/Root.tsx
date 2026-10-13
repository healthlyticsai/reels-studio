import React from "react";
import { Composition } from "remotion";
import "./index.css";
import { Demo } from "./Demo";
import { FORMATS } from "./format";
import { FPS, TOTAL } from "./demoTimeline";

/**
 * One timeline, two renders. Both compositions play the same scenes against the
 * same voiceover; only the layout differs, and every component reads it from the
 * format context rather than from literal pixel numbers.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Demo-16x9"
      component={Demo}
      defaultProps={{ format: "16x9" as const }}
      durationInFrames={TOTAL}
      fps={FPS}
      width={FORMATS["16x9"].w}
      height={FORMATS["16x9"].h}
    />
    <Composition
      id="Demo-9x16"
      component={Demo}
      defaultProps={{ format: "9x16" as const }}
      durationInFrames={TOTAL}
      fps={FPS}
      width={FORMATS["9x16"].w}
      height={FORMATS["9x16"].h}
    />
  </>
);
