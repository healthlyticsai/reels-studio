import React from "react";
import { Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK, GRADIENT, SPRING } from "../theme";
import { AVATAR_STILL } from "../demoTimeline";
import type { Avatar, Presenter } from "../demoSpec";

/**
 * The presenter, lip-synced by Higgsfield to one slice of the voiceover.
 *
 * The clip is always muted. The single vo.mp3 is the only voice track — the
 * slice sent to Higgsfield was cut from it, so the mouth matches the master
 * audio frame for frame when the clip starts at `clipFrom`. Before the clip has
 * been generated the still stands in, so a layout can be checked early.
 */
export const AvatarClip: React.FC<{
  avatar: Avatar;
  width: number;
  height: number;
  shape: "rect" | "circle";
  /** Frame the presenter pops in, for a bubble arriving mid-scene. */
  enterAt?: number;
  radius?: number;
  presenter?: Presenter;
  style?: React.CSSProperties;
  /**
   * "blurFill" shows the whole shot as a card over a blurred copy of itself —
   * the vertical-video answer to a landscape take, which a plain cover-crop
   * would cut through the face.
   */
  fit?: "cover" | "blurFill";
  /** Width over height of the clip, for "blurFill". Omni and Higgsfield takes are 16:9. */
  sourceAspect?: number;
}> = ({ avatar, width, height, shape, enterAt = 0, radius = 0, presenter, style, fit = "cover", sourceAspect = 16 / 9 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = shape === "circle" ? spring({ frame: frame - enterAt, fps, config: SPRING.snap }) : 1;
  const ring = shape === "circle" ? 8 : 0;

  // Jump cuts: every cut toggles between the wide framing and a close one, as a
  // hard cut rather than a zoom, so one take reads as two cameras.
  const cutIndex = (avatar.cuts ?? []).filter((c) => frame >= c).length;
  const punch = shape === "rect" && cutIndex % 2 === 1 ? 1.22 : 1;
  const media: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: shape === "circle" ? "50% 22%" : "50% 30%",
    display: "block",
    scale: `${punch}`,
    transformOrigin: "50% 28%",
  };

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        padding: ring,
        borderRadius: shape === "circle" ? 999 : radius,
        background: shape === "circle" ? GRADIENT : "transparent",
        boxShadow: shape === "circle" ? "0 24px 60px rgba(15,23,42,0.35)" : undefined,
        scale: `${pop}`,
        opacity: Math.min(1, pop * 1.4),
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: shape === "circle" ? 999 : radius,
          background: COLORS.slate100,
        }}
      >
        {fit === "blurFill" && shape === "rect" ? (
          <BlurFill avatar={avatar} width={width} height={height} aspect={sourceAspect} />
        ) : avatar.clip ? (
          <Sequence from={avatar.clipFrom} layout="none">
            <OffthreadVideo src={staticFile(avatar.clip)} muted style={media} />
          </Sequence>
        ) : (
          <Img src={staticFile(AVATAR_STILL)} style={media} />
        )}
      </div>
      {presenter?.name && shape === "rect" ? <NameTag presenter={presenter} /> : null}
    </div>
  );
};

/** The whole shot as a rounded card, over a soft, darkened, blown-up copy of itself. */
const BlurFill: React.FC<{ avatar: Avatar; width: number; height: number; aspect: number }> = ({
  avatar,
  width,
  height,
  aspect,
}) => {
  const cardW = width * 0.92;
  const cardH = cardW / aspect;
  const layer = (style: React.CSSProperties) =>
    avatar.clip ? (
      <Sequence from={avatar.clipFrom} layout="none">
        <OffthreadVideo src={staticFile(avatar.clip)} muted style={style} />
      </Sequence>
    ) : (
      <Img src={staticFile(AVATAR_STILL)} style={style} />
    );
  return (
    <>
      {layer({
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        filter: "blur(38px) brightness(0.55) saturate(1.1)",
        scale: "1.2",
      })}
      <div
        style={{
          position: "absolute",
          left: (width - cardW) / 2,
          top: (height - cardH) / 2 + height * 0.02,
          width: cardW,
          height: cardH,
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 40px 90px rgba(3,10,25,0.55)",
        }}
      >
        {layer({ width: "100%", height: "100%", objectFit: "cover", display: "block" })}
      </div>
    </>
  );
};

/** Lower-left name and role, the first time the presenter is on screen. */
const NameTag: React.FC<{ presenter: Presenter }> = ({ presenter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 12, fps, config: SPRING.card });
  const out = interpolate(frame, [130, 146], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        top: 48,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "16px 26px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.94)",
        borderLeft: `6px solid ${COLORS.teal}`,
        boxShadow: "0 18px 40px rgba(15,23,42,0.22)",
        fontFamily: FONT_STACK,
        opacity: Math.min(t, out),
        translate: `${interpolate(t, [0, 1], [-40, 0])}px 0px`,
      }}
    >
      <span style={{ fontSize: 34, fontWeight: 800, color: COLORS.slate }}>{presenter.name}</span>
      {presenter.role ? (
        <span style={{ fontSize: 24, fontWeight: 600, color: COLORS.slate500 }}>{presenter.role}</span>
      ) : null}
    </div>
  );
};
