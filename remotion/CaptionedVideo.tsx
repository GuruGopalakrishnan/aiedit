import { Fragment } from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import {
  CANONICAL_CANVAS_WIDTH,
  applyTextCase,
  backgroundColorValue,
  findActiveCaption,
  findActiveWordId,
  fontWeightValue,
  positionToAlignStyle,
  strokeWidthPx,
} from "@/lib/captionStyle";
import { resolveWordFontFamily } from "@/lib/fonts";
import type { CaptionGroup, CaptionStyle } from "@/types";
import { getCaptionFrameStyle, getWordScale } from "./animations";

export type CaptionedVideoProps = {
  videoSrc: string;
  captions: CaptionGroup[];
  style: CaptionStyle;
  showSafeArea?: boolean;
  // Consumed by Root.tsx's calculateMetadata (composition width/height/fps/duration
  // are metadata, not component props, but Remotion computes them FROM props).
  durationInSeconds: number;
  fps: number;
  width: number;
  height: number;
};

export function CaptionedVideo({ videoSrc, captions, style, showSafeArea }: CaptionedVideoProps) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const currentTime = frame / fps;
  const scale = width / CANONICAL_CANVAS_WIDTH;

  const active = findActiveCaption(captions, currentTime);
  const effectiveStyle: CaptionStyle = active ? { ...style, ...active.styleOverrides } : style;
  const activeWordId = active && effectiveStyle.wordHighlightEnabled ? findActiveWordId(active, currentTime) : null;
  const align = positionToAlignStyle(effectiveStyle.position);
  const isGradient = effectiveStyle.decoration === "gradient";

  const captionStartFrame = active ? Math.round(active.start * fps) : 0;
  const captionEndFrame = active ? Math.round(active.end * fps) : 0;
  const blockStyle = active
    ? getCaptionFrameStyle(effectiveStyle.animation, frame - captionStartFrame, captionEndFrame - frame, fps)
    : null;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo src={videoSrc} />

      {showSafeArea && (
        <AbsoluteFill
          style={{
            borderTop: "1px dashed rgba(255,255,255,0.25)",
            borderBottom: "1px dashed rgba(255,255,255,0.25)",
            borderLeft: "1px dashed rgba(255,255,255,0.25)",
            borderRight: "1px dashed rgba(255,255,255,0.25)",
            margin: "8% 6%",
          }}
        />
      )}

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          padding: `${8 * scale}px ${6 * scale}px`,
          paddingTop: `${8 * scale + 0.08 * width}px`,
          paddingBottom: `${8 * scale + 0.12 * width}px`,
          ...align,
        }}
      >
        {active && blockStyle && (
          <div
            style={{
              opacity: blockStyle.opacity,
              transform: blockStyle.transform,
              display: "inline-block",
              maxWidth: "100%",
              borderRadius: 8,
              backgroundColor: backgroundColorValue(effectiveStyle.background),
              padding: effectiveStyle.background === "none" ? 0 : `${4 * scale}px ${10 * scale}px`,
            }}
          >
            <p
              style={{
                fontWeight: fontWeightValue(effectiveStyle.fontWeight),
                fontSize: effectiveStyle.fontSize * scale,
                textAlign: align.textAlign,
                lineHeight: 1.25,
                margin: 0,
                WebkitTextStroke:
                  effectiveStyle.stroke === "none" ? undefined : `${strokeWidthPx(effectiveStyle.stroke, scale)}px black`,
                textShadow: effectiveStyle.shadow ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.7)` : undefined,
                backgroundImage: isGradient
                  ? `linear-gradient(90deg, ${effectiveStyle.textColor}, ${effectiveStyle.highlightColor})`
                  : undefined,
                backgroundClip: isGradient ? "text" : undefined,
                WebkitBackgroundClip: isGradient ? "text" : undefined,
                color: isGradient ? "transparent" : undefined,
              }}
            >
              {active.words.map((w, i) => {
                const isHighlighted = effectiveStyle.wordHighlightEnabled
                  ? w.id === activeWordId
                  : active.highlightedWords.includes(w.id);
                const wordStartFrame = effectiveStyle.wordHighlightEnabled ? Math.round(w.start * fps) : captionStartFrame;
                const wordScale = isHighlighted ? getWordScale(frame - wordStartFrame, fps) : 1;
                const showMarker = isHighlighted && effectiveStyle.decoration === "marker";
                const showUnderline = isHighlighted && effectiveStyle.decoration === "underline";

                return (
                  <Fragment key={w.id}>
                    <span
                      style={{
                        display: "inline-block",
                        transform: `scale(${wordScale})`,
                        fontFamily: resolveWordFontFamily(w.text, effectiveStyle.fontFamily),
                        color: isGradient ? undefined : isHighlighted ? effectiveStyle.highlightColor : effectiveStyle.textColor,
                        backgroundColor: showMarker ? effectiveStyle.highlightColor : undefined,
                        borderRadius: showMarker ? 4 * scale : undefined,
                        padding: showMarker ? `0 ${4 * scale}px` : undefined,
                        borderBottom: showUnderline ? `${3 * scale}px solid ${effectiveStyle.highlightColor}` : undefined,
                        ...(showMarker ? { color: "#000000" } : {}),
                      }}
                    >
                      {applyTextCase(w.text, effectiveStyle.textCase)}
                    </span>
                    {i < active.words.length - 1 ? " " : ""}
                  </Fragment>
                );
              })}
            </p>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
