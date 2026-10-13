import React from "react";
import { Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { COLORS, FONT_STACK, GRADIENT, SPRING } from "../theme";
import { BROWSER_BAR, BrowserFrame } from "./BrowserFrame";
import { PHONE_PAD, PhoneFrame } from "./PhoneFrame";
import { LaptopFrame, laptopScreenSize, laptopWidthFor, useLaptopPose, type LaptopMotion } from "./LaptopFrame";
import type { Box, Focus, Screen } from "../demoSpec";
import { LAPTOP_FINISH } from "../look";
import { useFormat } from "../format";

/**
 * A real product screenshot, shown exactly as captured.
 *
 * This is the reason the demo pipeline exists: an AI video model redraws a UI
 * and gets the text wrong, so the product itself is never generated — it is the
 * PNG the person uploaded, in a browser or phone frame, with the camera doing
 * the explaining. `focus` entries zoom into a region, dim everything around it,
 * or move a cursor in and click, each pinned to the frame its word is spoken.
 *
 * Boxes are in the screenshot's own 0–1 coordinates, so the same plan lands on
 * the same pixels in the 16:9 and the 9:16 render.
 *
 * On a `laptop` the zoom happens inside the screen rather than by moving the
 * camera: the laptop is turned in 3D, so a flat camera move would miss its box,
 * while zooming the screen's own content always lands. `nextScreen` cross-fades
 * to a second screenshot mid-scene (a recording becoming its note); focus boxes
 * after that frame refer to the second image.
 */

const RAMP = 18;
/** Tight enough to sit inside the stage's inset, so the clip never squares it off. */
const DEVICE_SHADOW = "0 16px 34px rgba(15,23,42,0.16), 0 3px 10px rgba(15,23,42,0.08)";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

/** Resolve each focus's `until`, so a zoom hands over to the next one cleanly. */
const resolveUntil = (focus: Focus[], sceneEnd: number): Required<Pick<Focus, "until">>[] =>
  focus.map((f, i) => {
    if (f.until !== undefined) return { until: Math.max(f.until, f.at + RAMP * 2) };
    const next = focus.slice(i + 1).find((n) => n.action === f.action);
    // Zooms overlap their neighbour by one ramp so the two weights always sum to
    // one and the camera travels straight from box to box.
    const end = next ? next.at + (f.action === "zoom" ? RAMP : 0) : sceneEnd;
    return { until: Math.max(end, f.at + RAMP * 2) };
  });

const weight = (frame: number, at: number, until: number) => {
  // Short windows get shorter ramps; interpolate needs a strictly rising input range.
  const r = Math.min(RAMP, Math.floor((until - at - 1) / 2));
  if (r < 1) return 0;
  return interpolate(frame, [at, at + r, until - r, until], [0, 1, 1, 0], { ...clamp, easing: ease });
};

export const Screenshot: React.FC<{
  screen: Screen;
  focus?: Focus[];
  /** The stage this screenshot has to fit inside, in px. */
  width: number;
  height: number;
  /** Scene length in frames, for the last focus's release. */
  sceneDuration: number;
  /** Frames before the device settles in. */
  enterAt?: number;
  /** Camera move for a laptop. */
  motion?: LaptopMotion;
  /** A second screenshot the screen cross-fades to at `at`. */
  nextScreen?: { screen: Screen; at: number };
}> = ({ screen, focus = [], width, height, sceneDuration, enterAt = 0, motion = "float", nextScreen }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aspect = screen.width / screen.height;
  const mobile = screen.device === "mobile";
  const laptop = screen.device === "laptop";
  const pose = useLaptopPose(motion, sceneDuration, enterAt);
  const format = useFormat();
  // A whole desktop UI at phone width is unreadable, so in a vertical frame the
  // camera starts already pushed in on the scene's first region of interest and
  // hands over to the planned focus actions from there.
  if (!format.isLandscape && !laptop && !mobile && focus.length) {
    const [bx, by, bw, bh] = focus[0].box;
    const w = Math.min(1, Math.max(bw * 1.3, 0.42));
    const h = Math.min(1, Math.max(bh * 1.3, 0.24));
    const x = Math.min(1 - w, Math.max(0, bx + bw / 2 - w / 2));
    const y = Math.min(1 - h, Math.max(0, by + bh / 2 - h / 2));
    const replaced = focus[0].action === "zoom" && focus[0].at < 24 ? focus[0] : null;
    focus = [
      { at: 0, box: [x, y, w, h], action: "zoom", ...(replaced?.until !== undefined ? { until: replaced.until } : {}) },
      ...focus.filter((f) => f !== replaced),
    ];
  }

  // Chrome around the image: title bar and 2px borders for a browser, the bezel
  // for a phone. The image area keeps the screenshot's exact aspect.
  const chromeW = mobile ? PHONE_PAD * 2 : 4;
  const chromeH = mobile ? PHONE_PAD * 2 : BROWSER_BAR + 4;
  // Room for the device's drop shadow inside the stage, which clips (it has to,
  // so a zoom stays inside its window) and would otherwise cut the shadow square.
  const inset = 36;
  let contentW = width - inset * 2 - chromeW;
  let contentH = contentW / aspect;
  if (contentH + chromeH > height - inset * 2) {
    contentH = height - inset * 2 - chromeH;
    contentW = contentH * aspect;
  }
  const lidW = laptopWidthFor(width * 0.96, height * 0.96, aspect);
  if (laptop) ({ w: contentW, h: contentH } = laptopScreenSize(lidW, aspect));
  const deviceW = contentW + chromeW;
  const deviceH = contentH + chromeH;
  const deviceX = (width - deviceW) / 2;
  const deviceY = (height - deviceH) / 2;
  const contentX = deviceX + (mobile ? PHONE_PAD : 2);
  const contentY = deviceY + (mobile ? PHONE_PAD : BROWSER_BAR + 2);

  const untils = resolveUntil(focus, sceneDuration);

  /* ── Camera: blend toward each zoom target by its weight ─────────────── */
  let scale = 1;
  let tx = 0;
  let ty = 0;
  // Inner zoom, for a laptop: the screen's content scales and pans behind the glass.
  let zs = 1;
  let ztx = 0;
  let zty = 0;
  focus.forEach((f, i) => {
    if (f.action !== "zoom") return;
    const w = weight(frame, f.at, untils[i].until);
    if (w <= 0) return;
    const [bx, by, bw, bh] = f.box;
    if (laptop) {
      const s = Math.min(Math.max(Math.min(1 / (bw * 1.2), 1 / (bh * 1.2)), 1), 2.4);
      const cx = (bx + bw / 2) * contentW;
      const cy = (by + bh / 2) * contentH;
      // Pan so the box is centred, but never past the image's own edges.
      const px = Math.min(0, Math.max(contentW - s * contentW, contentW / 2 - s * cx));
      const py = Math.min(0, Math.max(contentH - s * contentH, contentH / 2 - s * cy));
      zs += w * (s - 1);
      ztx += w * px;
      zty += w * py;
      return;
    }
    const s = Math.min(Math.max(Math.min(width / (bw * contentW * 1.3), height / (bh * contentH * 1.3)), 1), 2.6);
    const cx = contentX + (bx + bw / 2) * contentW;
    const cy = contentY + (by + bh / 2) * contentH;
    scale += w * (s - 1);
    tx += w * (width / 2 - s * cx);
    ty += w * (height / 2 - s * cy);
  });
  // Cursor and callouts keep a constant size through either kind of zoom.
  const uiScale = laptop ? zs : scale;
  const swap = nextScreen
    ? interpolate(frame, [nextScreen.at, nextScreen.at + 10], [0, 1], { ...clamp, easing: ease })
    : 0;

  const enter = spring({ frame: frame - enterAt, fps, config: SPRING.card });
  const px = (b: Box) => ({
    left: b[0] * contentW,
    top: b[1] * contentH,
    width: b[2] * contentW,
    height: b[3] * contentH,
  });

  const image = (
    <div style={{ position: "relative", width: contentW, height: contentH, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "0 0",
          transform: `translate(${ztx}px, ${zty}px) scale(${zs})`,
        }}
      >
      <Img
        src={staticFile(screen.src)}
        style={{ width: contentW, height: contentH, display: "block", objectFit: "contain" }}
      />
      {nextScreen && swap > 0 ? (
        <Img
          src={staticFile(nextScreen.screen.src)}
          style={{ position: "absolute", inset: 0, width: contentW, height: contentH, objectFit: "contain", opacity: swap }}
        />
      ) : null}
      {focus.map((f, i) =>
        f.action === "highlight" ? (
          <Highlight key={i} rect={px(f.box)} at={f.at} until={untils[i].until} />
        ) : null,
      )}
      <Cursor focus={focus} untils={untils} contentW={contentW} contentH={contentH} scale={uiScale} />
      {focus.map((f, i) =>
        f.label ? (
          <Callout
            key={`l${i}`}
            rect={px(f.box)}
            text={f.label}
            at={f.at + 6}
            until={untils[i].until}
            scale={uiScale}
            contentH={contentH}
          />
        ) : null,
      )}
      </div>
    </div>
  );

  const clicks = focus.map((f, i) =>
    f.action === "click" ? (
      <Sequence key={`s${i}`} from={f.at} durationInFrames={30} layout="none">
        <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.35} />
      </Sequence>
    ) : null,
  );

  if (laptop) {
    return (
      <div style={{ position: "relative", width, height }}>
        <LaptopFrame width={lidW} screenAspect={aspect} pose={pose} height={height} finish={LAPTOP_FINISH}>
          {image}
        </LaptopFrame>
        {clicks}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", borderRadius: 28 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: deviceX,
            top: deviceY,
            opacity: enter,
            translate: `0px ${interpolate(enter, [0, 1], [60, 0])}px`,
          }}
        >
          {mobile ? (
            <PhoneFrame width={deviceW} height={deviceH} style={{ boxShadow: DEVICE_SHADOW }}>
              {image}
            </PhoneFrame>
          ) : (
            <BrowserFrame
              width={deviceW}
              height={deviceH}
              url={screen.url ?? ""}
              extension={false}
              style={{ boxShadow: DEVICE_SHADOW }}
            >
              {image}
            </BrowserFrame>
          )}
        </div>
      </div>

      {clicks}
    </div>
  );
};

/** Dims everything around a region and rings it in the brand colour. */
const Highlight: React.FC<{
  rect: { left: number; top: number; width: number; height: number };
  at: number;
  until: number;
}> = ({ rect, at, until }) => {
  const frame = useCurrentFrame();
  const t = weight(frame, at, until);
  if (t <= 0) return null;
  const pad = 10;

  return (
    <div
      style={{
        position: "absolute",
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 14,
        boxShadow: `0 0 0 4000px rgba(15,23,42,${0.5 * t})`,
        outline: `4px solid ${COLORS.teal}`,
        outlineOffset: 2,
        opacity: t,
        scale: `${interpolate(t, [0, 1], [1.06, 1])}`,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * One cursor for the whole screenshot. It glides from wherever it last clicked
 * (or in from the lower right) and lands on each click box exactly as the word
 * is spoken, then ripples.
 */
const Cursor: React.FC<{
  focus: Focus[];
  untils: { until: number }[];
  contentW: number;
  contentH: number;
  scale: number;
}> = ({ focus, untils, contentW, contentH, scale }) => {
  const frame = useCurrentFrame();
  const clicks = focus.map((f, i) => ({ ...f, until: untils[i].until })).filter((f) => f.action === "click");
  if (clicks.length === 0) return null;

  const first = clicks[0];
  const last = clicks[clicks.length - 1];
  const TRAVEL = 16;
  if (frame < first.at - TRAVEL - 6 || frame > last.until) return null;

  const centre = (b: Box) => [b[0] + b[2] / 2, b[1] + b[3] / 2];
  let pos = [0.86, 0.92];
  let ripple: number | null = null;
  for (let i = 0; i < clicks.length; i++) {
    const c = clicks[i];
    const target = centre(c.box);
    const from = i === 0 ? [0.86, 0.92] : centre(clicks[i - 1].box);
    const t = interpolate(frame, [c.at - TRAVEL, c.at], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    if (frame >= c.at - TRAVEL) pos = [from[0] + (target[0] - from[0]) * t, from[1] + (target[1] - from[1]) * t];
    if (frame >= c.at && frame < c.at + 24) ripple = frame - c.at;
  }

  const appear = interpolate(frame, [first.at - TRAVEL - 6, first.at - TRAVEL], [0, 1], clamp);
  const press = ripple !== null ? interpolate(ripple, [0, 3, 8], [1, 0.82, 1], clamp) : 1;
  const x = pos[0] * contentW;
  const y = pos[1] * contentH;
  const inv = 1 / scale;

  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, pointerEvents: "none", opacity: appear }}>
      {ripple !== null ? (
        <div
          style={{
            position: "absolute",
            left: -40 * inv,
            top: -40 * inv,
            width: 80 * inv,
            height: 80 * inv,
            borderRadius: 999,
            border: `${4 * inv}px solid ${COLORS.teal}`,
            scale: `${interpolate(ripple, [0, 24], [0.2, 1.4], clamp)}`,
            opacity: interpolate(ripple, [0, 24], [0.9, 0], clamp),
          }}
        />
      ) : null}
      <svg
        width={44 * inv}
        height={44 * inv}
        viewBox="0 0 24 24"
        style={{ position: "absolute", left: -4 * inv, top: -2 * inv, scale: `${press}`, transformOrigin: "0 0" }}
      >
        <path
          d="M4 2 L4 19 L8.6 14.8 L11.6 21.4 L14.4 20.2 L11.5 13.8 L17.8 13.6 Z"
          fill={COLORS.slate}
          stroke={COLORS.white}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/** Short label pill beside a focus box, kept at a constant size through a zoom. */
const Callout: React.FC<{
  rect: { left: number; top: number; width: number; height: number };
  text: string;
  at: number;
  until: number;
  scale: number;
  contentH: number;
}> = ({ rect, text, at, until, scale, contentH }) => {
  const frame = useCurrentFrame();
  const t = weight(frame, at, until);
  if (t <= 0) return null;
  const inv = 1 / scale;
  const below = rect.top < contentH * 0.18;

  return (
    <div
      style={{
        position: "absolute",
        left: rect.left + rect.width / 2,
        top: below ? rect.top + rect.height + 18 : rect.top - 18,
        translate: below ? "-50% 0" : "-50% -100%",
        scale: `${inv * interpolate(t, [0, 1], [0.85, 1])}`,
        transformOrigin: below ? "50% 0" : "50% 100%",
        opacity: t,
        whiteSpace: "nowrap",
        background: GRADIENT,
        color: COLORS.white,
        fontFamily: FONT_STACK,
        fontWeight: 700,
        fontSize: 30,
        padding: "10px 22px",
        borderRadius: 999,
        boxShadow: "0 14px 34px rgba(44,107,172,0.4)",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};
