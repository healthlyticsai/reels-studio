import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";

type Hit = { at: number; file: string; volume: number; rate?: number };

/**
 * Sound design.
 *
 * The voiceover carries the reel, so every hit is mixed well under it and only
 * marks a real beat: a cut, a marker stroke landing on a word, a click, an
 * impact, a success. Six source files cover everything — vary `rate` to get
 * more sounds out of them (the same whip at 1.45 is a marker stroke, at 0.8 an
 * ink splat).
 *
 * Fire transition hits two frames before the cut. Sound leading picture by a
 * frame or two is what makes an edit read as intentional rather than late.
 */
export const lead = (boundary: number) => boundary - 2;

const HITS: Hit[] = [
  // Replace with cues anchored to the transcript. plan.json's `sfx` array lists
  // the words each cue should land on; look those words up in captions.json.
  //
  //   { at: lead(342), file: "whoosh", volume: 0.4 },
  //   { at: 294, file: "whip", volume: 0.5 },
  //   { at: 132, file: "whip", volume: 0.2, rate: 1.35 },
];

export const Sfx: React.FC = () => (
  <>
    {HITS.map((hit, i) => (
      <Sequence
        key={`${hit.file}-${hit.at}-${i}`}
        from={Math.max(0, hit.at)}
        durationInFrames={90}
        layout="none"
      >
        <Audio
          src={staticFile(`sfx/${hit.file}.wav`)}
          volume={hit.volume}
          playbackRate={hit.rate ?? 1}
        />
      </Sequence>
    ))}
  </>
);
