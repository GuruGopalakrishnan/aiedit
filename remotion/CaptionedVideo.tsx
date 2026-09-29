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
import { buildStackedLines, type SceneLine } from "@/lib/sceneLayout";
import type { CaptionGroup, CaptionStyle, TranscriptWord } from "@/types";
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

const STAGGER_SECONDS = 0.12;

function WordSpan({
  word,
  isHighlighted,
  effectiveStyle,
  scale,
  wordScale,
  isGradient,
}: {
  word: TranscriptWord;
  isHighlighted: boolean;
  effectiveStyle: CaptionStyle;
  scale: number;
  wordScale: number;
  isGradient: boolean;
}) {
  const showMarker = isHighlighted && effectiveStyle.decoration === "marker";
  const showUnderline = isHighlighted && effectiveStyle.decoration === "underline";

  return (
    <span
      style={{
        display: "inline-block",
        transform: `scale(${wordScale})`,
        fontFamily: resolveWordFontFamily(word.text, effectiveStyle.fontFamily),
        color: isGradient ? undefined : isHighlighted ? effectiveStyle.highlightColor : effectiveStyle.textColor,
        backgroundColor: showMarker ? effectiveStyle.highlightColor : undefined,
        borderRadius: showMarker ? 4 * scale : undefined,
        padding: showMarker ? `0 ${4 * scale}px` : undefined,
        borderBottom: showUnderline ? `${3 * scale}px solid ${effectiveStyle.highlightColor}` : undefined,
        ...(showMarker ? { color: "#000000" } : {}),
      }}
    >
      {applyTextCase(word.text, effectiveStyle.textCase)}
    </span>
  );
}

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
  const staggerFrames = Math.max(1, Math.round(STAGGER_SECONDS * fps));

  let lines: SceneLine[] = [];
  if (active) {
    if (effectiveStyle.layout === "stacked") {
      lines = buildStackedLines(active);
    } else if (effectiveStyle.layout === "single-word") {
      const spokenId = findActiveWordId(active, currentTime) ?? active.words[0]?.id;
      const word = active.words.find((w) => w.id === spokenId) ?? active.words[0];
      lines = word ? [{ words: [word], emphasized: true }] : [];
    } else {
      lines = [{ words: active.words, emphasized: false }];
    }
  }

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
          gap: effectiveStyle.layout === "stacked" ? 4 * scale : 0,
          padding: `${8 * scale}px ${6 * scale}px`,
          paddingTop: `${8 * scale + 0.08 * width}px`,
          paddingBottom: `${8 * scale + 0.12 * width}px`,
          ...align,
        }}
      >
        {active &&
          lines.map((line, lineIndex) => {
            const isSingleWordMode = effectiveStyle.layout === "single-word";
            const wordStartFrame = isSingleWordMode ? Math.round(line.words[0].start * fps) : captionStartFrame;
            const lineOffset = isSingleWordMode ? 0 : lineIndex * staggerFrames;
            const blockStyle = getCaptionFrameStyle(
              effectiveStyle.animation,
              frame - wordStartFrame - lineOffset,
              captionEndFrame - frame,
              fps
            );
            const fontSizeMultiplier = line.emphasized ? 1.55 : effectiveStyle.layout === "stacked" ? 0.82 : 1;

            return (
              <div
                key={lineIndex}
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
                    fontSize: effectiveStyle.fontSize * scale * fontSizeMultiplier,
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
                  {line.words.map((w, i) => {
                    const isHighlighted = effectiveStyle.wordHighlightEnabled
                      ? w.id === activeWordId
                      : line.emphasized || active.highlightedWords.includes(w.id);
                    const perWordStart = effectiveStyle.wordHighlightEnabled ? Math.round(w.start * fps) : wordStartFrame;
                    const wordScale = isHighlighted && !line.emphasized ? getWordScale(frame - perWordStart, fps) : 1;

                    return (
                      <Fragment key={w.id}>
                        <WordSpan
                          word={w}
                          isHighlighted={isHighlighted}
                          effectiveStyle={effectiveStyle}
                          scale={scale}
                          wordScale={wordScale}
                          isGradient={isGradient}
                        />
                        {i < line.words.length - 1 ? " " : ""}
                      </Fragment>
                    );
                  })}
                </p>
              </div>
            );
          })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
