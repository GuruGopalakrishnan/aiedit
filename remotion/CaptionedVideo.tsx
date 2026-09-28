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
  const activeWordId = active && style.wordHighlightEnabled ? findActiveWordId(active, currentTime) : null;
  const align = positionToAlignStyle(style.position);

  const captionStartFrame = active ? Math.round(active.start * fps) : 0;
  const captionEndFrame = active ? Math.round(active.end * fps) : 0;
  const blockStyle = active
    ? getCaptionFrameStyle(style.animation, frame - captionStartFrame, captionEndFrame - frame, fps)
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
              backgroundColor: backgroundColorValue(style.background),
              padding: style.background === "none" ? 0 : `${4 * scale}px ${10 * scale}px`,
            }}
          >
            <p
              style={{
                fontFamily: style.fontFamily,
                fontWeight: fontWeightValue(style.fontWeight),
                fontSize: style.fontSize * scale,
                textAlign: align.textAlign,
                lineHeight: 1.25,
                margin: 0,
                WebkitTextStroke: style.stroke === "none" ? undefined : `${strokeWidthPx(style.stroke, scale)}px black`,
                textShadow: style.shadow ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.7)` : undefined,
              }}
            >
              {active.words.map((w, i) => {
                const isHighlighted = style.wordHighlightEnabled
                  ? w.id === activeWordId
                  : active.highlightedWords.includes(w.id);
                const wordStartFrame = style.wordHighlightEnabled ? Math.round(w.start * fps) : captionStartFrame;
                const wordScale = isHighlighted ? getWordScale(frame - wordStartFrame, fps) : 1;

                return (
                  <span
                    key={w.id}
                    style={{
                      display: "inline-block",
                      transform: `scale(${wordScale})`,
                      color: isHighlighted ? style.highlightColor : style.textColor,
                    }}
                  >
                    {applyTextCase(w.text, style.textCase)}
                    {i < active.words.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </p>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
