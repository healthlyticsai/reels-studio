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

/* ── Whip pan ───────────────────────────────────────────────────────────── */

const WhipPan: React.FC<TransitionPresentationComponentProps<{ dir: 1 | -1 }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const dir = passedProps.dir;
  // Blur peaks at the midpoint — the smear is what sells a whip, not the speed.
  const blur = interpolate(p, [0, 0.5, 1], [0, 34, 0]);

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          translate: `${-p * 118 * dir}% 0px`,
          filter: `blur(${blur}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        translate: `${(1 - p) * 118 * dir}% 0px`,
        filter: `blur(${blur}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const whipPan = (dir: 1 | -1 = 1): TransitionPresentation<{ dir: 1 | -1 }> => ({
  component: WhipPan,
  props: { dir },
});

/* ── Bar wipe ───────────────────────────────────────────────────────────── */

const BarWipe: React.FC<TransitionPresentationComponentProps<{ color: string; bars: number }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const { color, bars } = passedProps;

  if (presentationDirection === "exiting") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  // Each bar sweeps with its own offset, so the edge arrives as a stagger.
  const reveal = interpolate(p, [0.25, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.6, 0, 0.2, 1),
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)` }}>{children}</AbsoluteFill>
      {new Array(bars).fill(0).map((_, i) => {
        const offset = i / bars;
        const sweep = interpolate(p, [offset * 0.3, offset * 0.3 + 0.55], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.6, 0, 0.2, 1),
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${(i / bars) * 100}%`,
              height: `${100 / bars + 0.4}%`,
              left: 0,
              right: 0,
              background: color,
              translate: `${sweep < 0.5 ? (sweep * 2 - 1) * 100 : sweep * 2 * 100 - 100}% 0`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const barWipe = (
  color: string = COLORS.slate,
  bars = 6,
): TransitionPresentation<{ color: string; bars: number }> => ({
  component: BarWipe,
  props: { color, bars },
});

/* ── Zoom punch ─────────────────────────────────────────────────────────── */

const ZoomPunch: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const p = presentationProgress;

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          scale: `${interpolate(p, [0, 1], [1, 2.4], {
            easing: Easing.in(Easing.cubic),
            output: "perceptual-scale",
          })}`,
          filter: `blur(${p * 22}px)`,
          opacity: 1 - p,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        scale: `${interpolate(p, [0, 1], [0.55, 1], {
          easing: Easing.out(Easing.cubic),
          output: "perceptual-scale",
        })}`,
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const zoomPunch = (): TransitionPresentation<Empty> => ({
  component: ZoomPunch,
  props: {} as Empty,
});

/* ── Glitch slice ───────────────────────────────────────────────────────── */

const SLICES = new Array(11).fill(0).map((_, i) => ({
  shift: (random(`gs${i}`) - 0.5) * 2,
  delay: random(`gd${i}`) * 0.4,
}));

const GlitchSlice: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const p = presentationProgress;
  const violence = interpolate(p, [0, 0.5, 1], [0, 1, 0]);

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill style={{ opacity: 1 - Math.max(0, (p - 0.5) * 2) }}>
        {SLICES.map((s, i) => (
          <AbsoluteFill
            key={i}
            style={{
              clipPath: `inset(${(i / SLICES.length) * 100}% 0 ${100 - ((i + 1) / SLICES.length) * 100}% 0)`,
              translate: `${s.shift * violence * 140}px 0px`,
            }}
          >
            {children}
          </AbsoluteFill>
        ))}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(p, [0.4, 0.75], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        // Chroma split fading out as the frame settles.
        filter: `drop-shadow(${violence * 9}px 0 0 rgba(255,0,80,0.5)) drop-shadow(${-violence * 9}px 0 0 rgba(0,200,255,0.5))`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const glitchSlice = (): TransitionPresentation<Empty> => ({
  component: GlitchSlice,
  props: {} as Empty,
});

/* ── Iris wipe ──────────────────────────────────────────────────────────── */

const IrisWipe: React.FC<TransitionPresentationComponentProps<{ x: number; y: number }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const { x, y } = passedProps;

  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ scale: `${1 - p * 0.05}` }}>{children}</AbsoluteFill>;
  }

  const r = interpolate(p, [0, 1], [0, 128], { easing: Easing.bezier(0.5, 0, 0.2, 1) });

  return (
    <AbsoluteFill style={{ clipPath: `circle(${r}% at ${x}% ${y}%)` }}>
      <AbsoluteFill
        style={{
          scale: `${interpolate(p, [0, 1], [1.12, 1], { output: "perceptual-scale" })}`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const irisWipe = (x = 50, y = 46): TransitionPresentation<{ x: number; y: number }> => ({
  component: IrisWipe,
  props: { x, y },
});

/* ── Shutter slats ──────────────────────────────────────────────────────── */

const ShutterSlats: React.FC<TransitionPresentationComponentProps<{ slats: number }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const { slats } = passedProps;

  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ filter: `brightness(${1 - p * 0.25})` }}>{children}</AbsoluteFill>;
  }

  // Alternating slats open from opposite sides, which reads as a mechanism
  // rather than as a wipe.
  const openings = new Array(slats).fill(0).map((_, i) => {
    const t = interpolate(p, [(i % 2) * 0.12, 0.88 + (i % 2) * 0.12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.5, 0, 0.2, 1),
    });
    const top = (i / slats) * 100;
    const height = (100 / slats) * t;
    const from = i % 2 === 0 ? top : top + 100 / slats - height;
    return `inset(${from}% 0 ${100 - (from + height)}% 0)`;
  });

  return (
    <AbsoluteFill>
      {openings.map((clip, i) => (
        <AbsoluteFill key={i} style={{ clipPath: clip }}>
          {children}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

export const shutterSlats = (slats = 8): TransitionPresentation<{ slats: number }> => ({
  component: ShutterSlats,
  props: { slats },
});

/* ── Film burn ──────────────────────────────────────────────────────────── */

const FilmBurn: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const p = presentationProgress;
  const heat = interpolate(p, [0, 0.45, 1], [0, 1, 0]);

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill>
        <AbsoluteFill
          style={{
            filter: `brightness(${1 + heat * 1.6}) contrast(${1 + heat * 0.7}) sepia(${heat * 0.5})`,
          }}
        >
          {children}
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 62% 42%, rgba(255,214,120,${heat}) 0%, rgba(255,120,30,${heat * 0.8}) 22%, rgba(0,0,0,0) 62%)`,
            mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(p, [0.4, 0.8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        filter: `brightness(${1 + heat * 0.7})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const filmBurn = (): TransitionPresentation<Empty> => ({
  component: FilmBurn,
  props: {} as Empty,
});

/* ── Colour flash ───────────────────────────────────────────────────────── */

const ColorFlash: React.FC<TransitionPresentationComponentProps<{ color: string }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const flash = interpolate(p, [0, 0.42, 0.62, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity:
            presentationDirection === "exiting"
              ? 1
              : interpolate(p, [0.5, 0.62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: `${presentationDirection === "exiting" ? 1 + p * 0.06 : interpolate(p, [0, 1], [1.06, 1])}`,
        }}
      >
        {children}
      </AbsoluteFill>
      {presentationDirection === "exiting" ? (
        <AbsoluteFill style={{ background: passedProps.color, opacity: flash }} />
      ) : null}
    </AbsoluteFill>
  );
};

export const colorFlash = (color: string = COLORS.white): TransitionPresentation<{ color: string }> => ({
  component: ColorFlash,
  props: { color },
});

/* ── Path wipe ──────────────────────────────────────────────────────────── */

const PathWipe: React.FC<TransitionPresentationComponentProps<{ angle: number; color: string }>> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const p = presentationProgress;
  const { angle, color } = passedProps;

  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ filter: `brightness(${1 - p * 0.2})` }}>{children}</AbsoluteFill>;
  }

  const eased = interpolate(p, [0, 1], [0, 1], { easing: Easing.bezier(0.55, 0, 0.2, 1) });
  // A soft-edged gradient mask travelling at `angle`, with a drawn leading rule.
  const mask = `linear-gradient(${angle}deg, rgba(0,0,0,1) ${eased * 130 - 18}%, rgba(0,0,0,0) ${eased * 130}%)`;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${angle}deg, rgba(0,0,0,0) ${eased * 130 - 2}%, ${color} ${eased * 130}%, rgba(0,0,0,0) ${eased * 130 + 1.2}%)`,
          opacity: interpolate(p, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
        }}
      />
    </AbsoluteFill>
  );
};

export const pathWipe = (
  angle = 112,
  color: string = COLORS.teal,
): TransitionPresentation<{ angle: number; color: string }> => ({
  component: PathWipe,
  props: { angle, color },
});
