import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { BRAND, COLORS, FONT_STACK } from "../theme";
import { FPS } from "../timing";

/**
 * Whisper transcribes phonetically, so brand names come back wrong ("Waivs" as
 * "waves"). The corrections live in brand.json rather than here, so a re-skin
 * only edits data. Also strips the em-dash artefacts whisper emits mid-sentence.
 */
const CORRECTIONS = Object.entries(BRAND.captions?.misheardBrandTerms ?? {});

const fix = (t: string) => {
  let out = t;
  for (const [wrong, right] of CORRECTIONS) {
    out = out.replace(new RegExp(`\\b${wrong}\\b`, "gi"), right);
  }
  return out
    .replace(/--+/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export type CaptionPage = { startMs: number; endMs: number; words: Caption[] };

/**
 * Whisper emits sub-word tokens ("burn" + "out", "Sc" + "ribe", "waves" + "." + "ai")
 * and bare punctuation. Glue anything that did not arrive with a leading space back
 * onto the previous token so each rendered pill is a real word.
 */
const mergeTokens = (captions: Caption[]): Caption[] => {
  const out: Caption[] = [];

  for (const raw of captions) {
    const startsNewWord = /^\s/.test(raw.text);
    const trimmed = raw.text.trim();
    if (!trimmed) continue;

    const isPunctuation = /^[,.\-?!:;]+$/.test(trimmed);
    const prev = out[out.length - 1];

    if (prev && (!startsNewWord || isPunctuation)) {
      out[out.length - 1] = {
        ...prev,
        text: prev.text + trimmed,
        endMs: Math.max(prev.endMs, raw.endMs),
      };
      continue;
    }

    out.push({ ...raw, text: trimmed });
  }

  return out.filter((w) => fix(w.text).length > 0);
};

/** Group merged words into short, readable pages that break on sentence ends. */
export const buildPages = (captions: Caption[], maxWords = 4, maxGapMs = 420): CaptionPage[] => {
  const words = mergeTokens(captions);
  const pages: CaptionPage[] = [];
  let current: Caption[] = [];

  const flush = () => {
    if (current.length === 0) return;
    pages.push({
      startMs: current[0].startMs,
      endMs: current[current.length - 1].endMs,
      words: current,
    });
    current = [];
  };

  for (const w of words) {
    const prev = current[current.length - 1];
    if (prev && w.startMs - prev.endMs > maxGapMs) flush();
    current.push(w);
    if (/[.?!]$/.test(w.text) || current.length >= maxWords) flush();
  }
  flush();

  return pages;
};

/**
 * Bottom-third burned-in captions with a per-word active highlight, so the
 * reel reads with the sound off (which is how most of the feed watches it).
 */
export const Captions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / FPS) * 1000;

  // Hold each page until the next one starts (capped) so captions never flicker
  // out between phrases.
  const index = pages.findIndex(
    (p, i) => nowMs >= p.startMs - 90 && nowMs < (pages[i + 1]?.startMs ?? Infinity),
  );
  const page = index === -1 ? undefined : pages[index];
  if (!page) return null;

  const holdUntil = Math.min(pages[index + 1]?.startMs ?? page.endMs + 700, page.endMs + 700);

  const pageFrame = frame - (page.startMs / 1000) * FPS;
  const enter = spring({ frame: pageFrame + 2, fps, config: { damping: 18, stiffness: 220, mass: 0.5 } });
  const out = interpolate(nowMs, [holdUntil - 90, holdUntil], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 128,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px 14px",
        zIndex: 40,
        opacity: Math.min(enter, out),
        translate: `0px ${interpolate(enter, [0, 1], [26, 0])}px`,
        pointerEvents: "none",
      }}
    >
      {page.words.map((w, i) => {
        const active = nowMs >= w.startMs - 40 && nowMs <= w.endMs + 60;

        return (
          <span
            key={`${w.startMs}-${i}`}
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              fontSize: 52,
              letterSpacing: -0.6,
              lineHeight: 1.12,
              padding: "8px 16px",
              borderRadius: 14,
              color: active ? COLORS.white : COLORS.slate,
              background: active ? COLORS.primary : "rgba(255,255,255,0.94)",
              boxShadow: active
                ? "0 12px 30px rgba(44,107,172,0.4)"
                : "0 8px 22px rgba(15,23,42,0.14)",
              scale: active ? "1.06" : "1",
            }}
          >
            {fix(w.text)}
          </span>
        );
      })}
    </div>
  );
};
