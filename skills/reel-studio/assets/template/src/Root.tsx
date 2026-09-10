import React from "react";
import { Composition } from "remotion";
import "./index.css";
import { Reel } from "./Reel";
import { FPS, HEIGHT, TOTAL, WIDTH } from "./timing";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={TOTAL}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
