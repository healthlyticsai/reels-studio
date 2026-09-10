import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { COLORS } from "../theme";

/**
 * Custom Vox-style scene transitions.
 *
 * Each one is a `TransitionPresentation` so it can be dropped into a
 * `<TransitionSeries>`: the outgoing scene is still mounted while the
 * incoming one arrives, which is what makes these read as edits rather
 * than as cross-fades.
 */

type Empty = Record<string, never>;

/* ── Torn paper wipe ─────────────────────────────────────────────────────── */

const TornPaper: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const p = presentationProgress;

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          scale: `${interpolate(p, [0, 1], [1, 1.06], { output: "perceptual-scale" })}`,
          filter: `blur(${p * 5}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  // The incoming scene is revealed downward behind a torn paper edge.
  const edge = interpolate(p, [0, 1], [-14, 112], {
    easing: Easing.bezier(0.72, 0, 0.24, 1),
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `polygon(0 0, 100% 0, 100% ${edge}%, 0 ${edge}%)`,
        }}
      >
        {children}
      </AbsoluteFill>

      {/* The torn strip rides the reveal edge */}
      <Img
        src={staticFile("art/torn-paper.png")}
        style={{
          position: "absolute",
          left: "-6%",
          width: "112%",
          top: `${edge}%`,
          translate: "0px -52%",
          opacity: interpolate(p, [0, 0.08, 0.9, 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          filter: "drop-shadow(0 14px 26px rgba(15,23,42,0.22))",
        }}
      />
    </AbsoluteFill>
  );
};

export const tornPaper = (): TransitionPresentation<Empty> => ({
  component: TornPaper,
  props: {} as Empty,
});

/* ── Ink splatter wipe ───────────────────────────────────────────────────── */

const BLOTS = new Array(14).fill(0).map((_, i) => ({
  x: 6 + random(`bx${i}`) * 88,
  y: 6 + random(`by${i}`) * 88,
  size: 22 + random(`bs${i}`) * 34,
  delay: random(`bd${i}`) * 0.4,
  rotate: random(`br${i}`) * 360,
}));

const InkSplatter: React.FC<TransitionPresentationComponentProps<{ color: string }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill>
        {children}
        {/* Blots splatter over the outgoing scene, then the new scene is beneath */}
        {BLOTS.map((b, i) => {
          const local = interpolate(p, [b.delay, b.delay + 0.42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <Img
              key={i}
              src={staticFile("art/ink-splatter.png")}
              style={{
                position: "absolute",
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.size * local * 1.5}%`,
                translate: "-50% -50%",
                rotate: `${b.rotate}deg`,
                opacity: local,
              }}
            />
          );
        })}
        <AbsoluteFill
          style={{
            background: passedProps.color,
            opacity: interpolate(p, [0.42, 0.68], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(p, [0.66, 0.92], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: `${interpolate(p, [0.66, 1], [1.08, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        })}`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const inkSplatter = (color = COLORS.slate): TransitionPresentation<{ color: string }> => ({
  component: InkSplatter,
  props: { color },
});

/* ── Card push (3D whip) ─────────────────────────────────────────────────── */

const CardPush: React.FC<TransitionPresentationComponentProps<{ dir: 1 | -1 }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const eased = interpolate(p, [0, 1], [0, 1], { easing: Easing.bezier(0.76, 0, 0.2, 1) });
  const dir = passedProps.dir;

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill style={{ perspective: 2200 }}>
        <AbsoluteFill
          style={{
            translate: `${-dir * eased * 46}% 0px`,
            rotate: `y ${dir * eased * 22}deg`,
            scale: `${1 - eased * 0.14}`,
            filter: `brightness(${1 - eased * 0.35})`,
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <AbsoluteFill
        style={{
          translate: `${dir * (1 - eased) * 100}% 0px`,
          rotate: `y ${-dir * (1 - eased) * 26}deg`,
          transformStyle: "preserve-3d",
          boxShadow: `${-dir * 40}px 0 90px rgba(15,23,42,0.35)`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const cardPush = (dir: 1 | -1 = 1): TransitionPresentation<{ dir: 1 | -1 }> => ({
  component: CardPush,
  props: { dir },
});

/* ── Halftone dissolve ──────────────────────────────────────────────────── */

const Halftone: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const p = presentationProgress;

  // A growing dot grid mask eats the outgoing frame and reveals the next.
  const dot = interpolate(p, [0, 1], [0, 1], { easing: Easing.bezier(0.4, 0, 0.5, 1) });
  const mask = `radial-gradient(circle at 50% 50%, rgba(0,0,0,1) ${dot * 62}%, rgba(0,0,0,0) ${
    dot * 62 + 26
  }%)`;

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          scale: `${1 + p * 0.12}`,
          filter: `contrast(${1 + p * 0.5}) blur(${p * 3}px)`,
          opacity: 1 - p * 0.15,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <AbsoluteFill
        style={{
          scale: `${interpolate(p, [0, 1], [1.14, 1], { output: "perceptual-scale" })}`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const halftoneDissolve = (): TransitionPresentation<Empty> => ({
  component: Halftone,
  props: {} as Empty,
});

/* ── Paper stack shuffle ────────────────────────────────────────────────── */

const StackShuffle: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const p = presentationProgress;
  const eased = interpolate(p, [0, 1], [0, 1], { easing: Easing.bezier(0.68, 0, 0.22, 1) });

  if (presentationDirection === "exiting") {
    // The old scene is dealt away like a card off the top of a deck.
    return (
      <AbsoluteFill
        style={{
          translate: `${eased * -14}% ${eased * 116}%`,
          rotate: `${eased * -13}deg`,
          scale: `${1 - eased * 0.08}`,
          borderRadius: `${eased * 44}px`,
          overflow: "hidden",
          filter: `drop-shadow(0 ${eased * 50}px ${eased * 90}px rgba(15,23,42,0.4))`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        scale: `${interpolate(eased, [0, 1], [0.94, 1], { output: "perceptual-scale" })}`,
        filter: `brightness(${0.9 + eased * 0.1})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const stackShuffle = (): TransitionPresentation<Empty> => ({
  component: StackShuffle,
  props: {} as Empty,
});
