import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, COLORS, FONT_STACK, GRADIENT, SPRING } from "../theme";
import { useFormat } from "../format";
import { BACKDROP, CAMERA } from "../look";
import { Backdrop, CameraMove, isDarkBackdrop } from "./Backdrop";
import { PaperTexture } from "./Texture";
import { Eyebrow, Headline, type Segment } from "./Type";
import { BrandLockup, BrandMark } from "./BrowserFrame";
import { Screenshot } from "./Screenshot";
import { AvatarClip } from "./AvatarClip";
import { GlowList, GlowText } from "./GlowText";
import type { Cta, DemoScene as Spec, Presenter } from "../demoSpec";

/**
 * Draws one demo scene from its entry in src/demoTimeline.ts, in whichever format the
 * composition is rendering. Most demos need nothing else: the plan decides the
 * type, the screenshot, the focus boxes and where the presenter sits, and this
 * lays it out for 16:9 and 9:16 alike.
 *
 * Write a custom scene in src/scenes/ only when the plan asks for something this
 * cannot express — and then build it from the same pieces.
 */
export const DemoScene: React.FC<{ scene: Spec; cta: Cta; presenter?: Presenter }> = ({
  scene,
  cta,
  presenter,
}) => {
  const f = useFormat();
  const dark = isDarkBackdrop(BACKDROP);

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK }}>
      <Backdrop variant={BACKDROP} />
      {scene.type === "avatar" ? (
        <>
          <AvatarClip
            avatar={scene.avatar}
            width={f.w}
            height={f.h}
            shape="rect"
            presenter={presenter}
            fit="cover"
          />
          {scene.headline ? <AvatarCaption scene={scene} /> : null}
        </>
      ) : (
        <CameraMove mode={CAMERA} duration={scene.duration} strength={0.5}>
          {scene.type === "cta" ? (
            <CtaLayout scene={scene} cta={cta} dark={dark} />
          ) : (
            <ScreenLayout scene={scene} dark={dark} presenter={presenter} />
          )}
        </CameraMove>
      )}
      <PaperTexture opacity={0.03} halftone={0.02} />
    </AbsoluteFill>
  );
};

/**
 * Glowing line over the presenter, near the top of the frame, the way a
 * product film titles its talking-head shots. A soft scrim keeps it legible
 * over any background.
 */
const AvatarCaption: React.FC<{ scene: Spec }> = ({ scene }) => {
  const f = useFormat();
  const h = scene.headline!;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, rgba(3,10,25,0.55) 0%, rgba(3,10,25,0) 38%)" }}
      />
      <div
        style={{
          position: "absolute",
          left: f.safe.x,
          right: f.safe.x,
          top: f.safe.top + (f.isLandscape ? 10 : 60),
          display: "flex",
          justifyContent: "center",
        }}
      >
        <GlowText
          text={h.text}
          emphasis={h.emphasis}
          at={h.at}
          size={f.isLandscape ? 70 : 84}
          maxWidth={f.isLandscape ? f.w * 0.62 : f.w - f.safe.x * 2}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Split `text` around the emphasised words so they can carry the gradient and mark. */
const segmentsFor = (scene: Spec): Segment[] => {
  const h = scene.headline!;
  const i = h.emphasis ? h.text.indexOf(h.emphasis) : -1;
  if (i === -1) return [{ text: h.text }];
  const mark =
    h.mark && h.mark !== "none"
      ? ({ kind: h.mark, at: h.at + 14, color: COLORS.highlight } as Segment["mark"])
      : undefined;
  return [
    { text: h.text.slice(0, i).trim() },
    { text: h.emphasis!, gradient: !mark || h.mark === "underline", mark },
    { text: h.text.slice(i + h.emphasis!.length).trim() },
  ].filter((s) => s.text.length > 0);
};

const ScreenLayout: React.FC<{ scene: Spec; dark: boolean; presenter?: Presenter }> = ({
  scene,
  dark,
  presenter,
}) => {
  const f = useFormat();
  const split = scene.type === "split" && scene.avatar.layout !== "none";
  const bubble = scene.avatar.layout === "bubble";
  const firstBox = scene.focus[0]?.box;
  const corner = scene.avatar.corner ?? (firstBox && firstBox[0] + firstBox[2] / 2 > 0.5 ? "left" : "right");
  const showHeadline = Boolean(scene.headline) && !(split && !f.isLandscape);
  const laptop = scene.screen?.device === "laptop";
  // Laptop scenes take the product-film type: glowing words, not a marker headline.
  const glow = laptop || scene.headline?.style === "glow" || dark;
  const list = scene.list?.items?.length ? scene.list.items : null;
  const hasText = showHeadline || Boolean(list);
  // A laptop shares a 16:9 frame side by side with its text; everything else stacks.
  // A checklist needs a column of its own, laptop or not.
  const sideText = f.isLandscape && hasText && !split && (laptop || Boolean(list));

  /* ── Regions ─────────────────────────────────────────────────────────── */
  const headH = sideText
    ? 0
    : list
      ? (f.isLandscape ? 300 : 520)
      : laptop
        ? (showHeadline ? (f.isLandscape ? 160 : 330) : 0)
        : showHeadline
          ? (f.isLandscape ? 130 : 300)
          : 0;
  let region = { x: f.safe.x, y: f.safe.top, w: f.w - f.safe.x * 2, h: f.h - f.safe.top - f.safe.bottom };
  let avatarBox: { x: number; y: number; w: number; h: number } | null = null;

  if (split) {
    if (f.isLandscape) {
      avatarBox = { x: 0, y: 0, w: Math.round(f.w * 0.4), h: f.h };
      region = { x: avatarBox.w + 64, y: f.safe.top, w: f.w - avatarBox.w - 64 - f.safe.x, h: region.h };
    } else {
      avatarBox = { x: 0, y: 0, w: f.w, h: Math.round(f.h * 0.42) };
      region = { x: f.safe.x, y: avatarBox.h + 48, w: region.w, h: f.h - avatarBox.h - 48 - f.safe.bottom };
    }
  }

  const bubbleSize = f.isLandscape ? 250 : 270;
  const bubbleGap = f.isLandscape ? 48 : 60;
  if (bubble) {
    if (f.isLandscape) {
      const inset = bubbleGap + bubbleSize + 32 - f.safe.x;
      region = { ...region, w: region.w - inset, x: corner === "left" ? region.x + inset : region.x };
    } else {
      region = { ...region, h: region.h - bubbleSize - 40 };
    }
  }

  const textCol = sideText ? Math.round(region.w * 0.38) : 0;
  const stage = sideText
    ? { x: region.x + textCol + 24, y: region.y, w: region.w - textCol - 24, h: region.h }
    : { x: region.x, y: region.y + headH, w: region.w, h: region.h - headH };
  const textBox = sideText
    ? { x: region.x, y: region.y, w: textCol, h: region.h }
    : { x: region.x, y: region.y, w: region.w, h: headH };

  return (
    <AbsoluteFill>
      {avatarBox ? (
        <AvatarClip
          avatar={scene.avatar}
          width={avatarBox.w}
          height={avatarBox.h}
          shape="rect"
          presenter={presenter}
          style={{ left: avatarBox.x, top: avatarBox.y }}
        />
      ) : null}

      {glow && hasText ? (
        <div
          style={{
            position: "absolute",
            left: textBox.x,
            top: textBox.y,
            width: textBox.w,
            height: textBox.h,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: sideText ? "flex-start" : "center",
            gap: f.isLandscape ? 28 : 40,
          }}
        >
          {showHeadline ? (
            <GlowText
              text={scene.headline!.text}
              emphasis={scene.headline!.emphasis}
              at={scene.headline!.at}
              size={f.isLandscape ? (sideText ? 58 : laptop ? 60 : 50) : 80}
              align={sideText ? "left" : "center"}
              maxWidth={textBox.w}
            />
          ) : null}
          {list ? <GlowList items={list} size={f.isLandscape ? 44 : 56} /> : null}
        </div>
      ) : null}

      {!glow && showHeadline ? (
        <div
          style={{
            position: "absolute",
            left: region.x,
            top: region.y,
            width: region.w,
            height: headH,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: f.isLandscape ? "flex-start" : "center",
            gap: 14,
          }}
        >
          {scene.eyebrow ? (
            <Eyebrow delay={scene.headline!.at} size={f.isLandscape ? 22 : 26}>
              {scene.eyebrow}
            </Eyebrow>
          ) : null}
          <Headline
            delay={scene.headline!.at + 4}
            size={f.isLandscape ? 58 : 72}
            anim={scene.typeAnim}
            align={f.isLandscape ? "flex-start" : "center"}
            nowrap={false}
            color={dark ? COLORS.white : COLORS.slate}
            segments={segmentsFor(scene)}
          />
        </div>
      ) : null}

      {scene.screen ? (
        <div style={{ position: "absolute", left: stage.x, top: stage.y }}>
          <Screenshot
            screen={scene.screen}
            focus={scene.focus}
            width={stage.w}
            height={stage.h}
            sceneDuration={scene.duration}
            enterAt={2}
            motion={scene.motion}
            nextScreen={scene.nextScreen}
          />
        </div>
      ) : null}

      {bubble ? (
        <AvatarClip
          avatar={scene.avatar}
          width={bubbleSize}
          height={bubbleSize}
          shape="circle"
          enterAt={6}
          style={{
            bottom: f.isLandscape ? 40 : f.safe.bottom + 10,
            [corner]: bubbleGap,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const CtaLayout: React.FC<{ scene: Spec; cta: Cta; dark: boolean }> = ({ scene, cta, dark }) => {
  const f = useFormat();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = scene.headline?.at ?? 10;
  const pop = spring({ frame: frame - at - 30, fps, config: SPRING.punch });
  const withAvatar = scene.avatar.layout !== "none";
  const headline: Spec = {
    ...scene,
    headline: { text: cta.headline, emphasis: cta.emphasis, mark: "highlight", at },
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: f.isLandscape ? 26 : 36,
        padding: `${f.safe.top}px ${f.safe.x}px ${f.safe.bottom}px`,
      }}
    >
      {withAvatar ? (
        <div style={{ position: "relative", width: f.isLandscape ? 220 : 300, height: f.isLandscape ? 220 : 300 }}>
          <AvatarClip
            avatar={scene.avatar}
            width={f.isLandscape ? 220 : 300}
            height={f.isLandscape ? 220 : 300}
            shape="circle"
          />
        </div>
      ) : null}
      <BrandLockup width={f.isLandscape ? 360 : 460} white={dark} />
      {dark ? (
        // A marker block reads as a solid box on a dark backdrop; glow reads as emphasis.
        <GlowText
          text={cta.headline}
          emphasis={cta.emphasis}
          at={at}
          size={f.isLandscape ? 68 : 80}
          maxWidth={f.w - f.safe.x * 2}
        />
      ) : (
        <Headline
          delay={at}
          size={f.isLandscape ? 68 : 80}
          anim={scene.typeAnim}
          nowrap={false}
          color={COLORS.slate}
          segments={segmentsFor(headline)}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: f.isLandscape ? "20px 44px" : "26px 54px",
          borderRadius: 999,
          background: GRADIENT,
          boxShadow: "0 26px 60px rgba(44,107,172,0.42)",
          opacity: Math.min(1, pop * 1.6),
          scale: `${interpolate(pop, [0, 1], [0.7, 1])}`,
        }}
      >
        <BrandMark size={f.isLandscape ? 36 : 44} white />
        <span style={{ fontWeight: 800, fontSize: f.isLandscape ? 38 : 44, color: COLORS.white }}>
          {cta.button}
        </span>
        <span style={{ fontSize: f.isLandscape ? 36 : 42, color: COLORS.white }}>→</span>
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: f.isLandscape ? 30 : 34,
          color: dark ? "rgba(255,255,255,0.9)" : COLORS.primary,
          letterSpacing: 0.5,
          opacity: interpolate(frame, [at + 50, at + 66], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {cta.url || BRAND.url}
      </div>
    </AbsoluteFill>
  );
};
