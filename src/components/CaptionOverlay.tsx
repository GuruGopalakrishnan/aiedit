"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CANONICAL_CANVAS_WIDTH,
  applyTextCase,
  backgroundClasses,
  findActiveCaption,
  findActiveWordId,
  fontWeightValue,
  positionToFlexClasses,
  strokeWidthPx,
} from "@/lib/captionStyle";
import { CAPTION_ANIMATION_VARIANTS, withEnterDelay } from "@/lib/captionAnimations";
import { resolveWordFontFamily } from "@/lib/fonts";
import { buildStackedLines, type SceneLine } from "@/lib/sceneLayout";
import type { CaptionStyle, TranscriptWord, CaptionGroup } from "@/types";

const STAGGER_SECONDS = 0.12;

function WordSpan({
  word,
  isHighlighted,
  effectiveStyle,
  scale,
  isGradient,
}: {
  word: TranscriptWord;
  isHighlighted: boolean;
  effectiveStyle: CaptionStyle;
  scale: number;
  isGradient: boolean;
}) {
  const showMarker = isHighlighted && effectiveStyle.decoration === "marker";
  const showUnderline = isHighlighted && effectiveStyle.decoration === "underline";

  return (
    <motion.span
      animate={
        isGradient
          ? { scale: isHighlighted ? 1.08 : 1 }
          : { color: isHighlighted ? effectiveStyle.highlightColor : effectiveStyle.textColor, scale: isHighlighted ? 1.08 : 1 }
      }
      transition={{ duration: 0.15 }}
      style={{
        display: "inline-block",
        fontFamily: resolveWordFontFamily(word.text, effectiveStyle.fontFamily),
        backgroundColor: showMarker ? effectiveStyle.highlightColor : undefined,
        color: showMarker ? "#000000" : undefined,
        borderRadius: showMarker ? 4 * scale : undefined,
        padding: showMarker ? `0 ${4 * scale}px` : undefined,
        borderBottom: showUnderline ? `${3 * scale}px solid ${effectiveStyle.highlightColor}` : undefined,
      }}
    >
      {applyTextCase(word.text, effectiveStyle.textCase)}
    </motion.span>
  );
}

export function CaptionOverlay({
  captions,
  style,
  currentTime,
  showSafeArea,
}: {
  captions: CaptionGroup[];
  style: CaptionStyle;
  currentTime: number;
  showSafeArea: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / CANONICAL_CANVAS_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const active = findActiveCaption(captions, currentTime);
  const effectiveStyle: CaptionStyle = active ? { ...style, ...active.styleOverrides } : style;
  const activeWordId = active && effectiveStyle.wordHighlightEnabled ? findActiveWordId(active, currentTime) : null;
  const variants = CAPTION_ANIMATION_VARIANTS[effectiveStyle.animation];
  const isGradient = effectiveStyle.decoration === "gradient";

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
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {showSafeArea && (
        <div className="absolute inset-0 border-y-[8%] border-x-[6%] border-dashed border-white/25" />
      )}

      <div
        className={`absolute inset-0 flex flex-col p-[6%] pt-[8%] pb-[12%] ${positionToFlexClasses(effectiveStyle.position)}`}
        style={{ gap: effectiveStyle.layout === "stacked" ? 4 * scale : 0 }}
      >
        <AnimatePresence mode="sync">
          {active &&
            lines.map((line, lineIndex) => {
              const fontSizeMultiplier = line.emphasized ? 1.55 : effectiveStyle.layout === "stacked" ? 0.82 : 1;
              const lineVariants = withEnterDelay(variants, lineIndex * STAGGER_SECONDS);

              return (
                <motion.div
                  key={`${active.id}-${lineIndex}`}
                  variants={lineVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={`inline-block max-w-full rounded-md ${backgroundClasses(effectiveStyle.background)}`}
                  style={{
                    padding: effectiveStyle.background === "none" ? 0 : `${4 * scale}px ${10 * scale}px`,
                  }}
                >
                  <p
                    style={{
                      fontWeight: fontWeightValue(effectiveStyle.fontWeight),
                      fontSize: `${effectiveStyle.fontSize * scale * fontSizeMultiplier}px`,
                      textAlign: effectiveStyle.textAlign,
                      lineHeight: 1.25,
                      WebkitTextStroke:
                        effectiveStyle.stroke === "none" ? undefined : `${strokeWidthPx(effectiveStyle.stroke, scale)}px black`,
                      textShadow: effectiveStyle.shadow ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.7)` : undefined,
                      backgroundImage: isGradient
                        ? `linear-gradient(90deg, ${effectiveStyle.textColor}, ${effectiveStyle.highlightColor})`
                        : undefined,
                      backgroundClip: isGradient ? "text" : undefined,
                      WebkitBackgroundClip: isGradient ? "text" : undefined,
                      color: isGradient ? "transparent" : undefined,
                      margin: 0,
                    }}
                  >
                    {line.words.map((w, i) => {
                      const isHighlighted = effectiveStyle.wordHighlightEnabled
                        ? w.id === activeWordId
                        : line.emphasized || active.highlightedWords.includes(w.id);
                      return (
                        <Fragment key={w.id}>
                          <WordSpan word={w} isHighlighted={isHighlighted} effectiveStyle={effectiveStyle} scale={scale} isGradient={isGradient} />
                          {i < line.words.length - 1 ? " " : ""}
                        </Fragment>
                      );
                    })}
                  </p>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </div>
  );
}
