/**
 * Output formats.
 *
 * A reel is 9:16 only, so its scenes read `SAFE` from timing.ts directly. A demo
 * renders the same timeline twice — 16:9 for LinkedIn, YouTube and the website,
 * 9:16 for the feeds — so its components lay out from `useFormat()` instead of
 * literal pixel numbers. The context defaults to 9:16, which keeps every reel
 * component working unchanged when nothing provides it.
 */
import React, { createContext, useContext } from "react";

export type FormatId = "16x9" | "9x16";

export type Format = {
  id: FormatId;
  w: number;
  h: number;
  isLandscape: boolean;
  /** Content margins. `bottom` includes the caption band. */
  safe: { x: number; top: number; bottom: number };
  captions: { fontSize: number; bottom: number; side: number; maxWords: number };
};

export const FORMATS: Record<FormatId, Format> = {
  "16x9": {
    id: "16x9",
    w: 1920,
    h: 1080,
    isLandscape: true,
    safe: { x: 96, top: 72, bottom: 170 },
    captions: { fontSize: 40, bottom: 56, side: 320, maxWords: 6 },
  },
  "9x16": {
    id: "9x16",
    w: 1080,
    h: 1920,
    isLandscape: false,
    safe: { x: 84, top: 150, bottom: 300 },
    captions: { fontSize: 52, bottom: 128, side: 70, maxWords: 4 },
  },
};

const FormatContext = createContext<Format>(FORMATS["9x16"]);

export const FormatProvider: React.FC<{ format: FormatId; children: React.ReactNode }> = ({
  format,
  children,
}) => <FormatContext.Provider value={FORMATS[format]}>{children}</FormatContext.Provider>;

export const useFormat = () => useContext(FormatContext);
