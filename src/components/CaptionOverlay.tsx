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
import { CAPTION_ANIMATION_VARIANTS } from "@/lib/captionAnimations";
import { resolveWordFontFamily } from "@/lib/fonts";
import type { CaptionGroup, CaptionStyle } from "@/types";

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

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {showSafeArea && (
        <div className="absolute inset-0 border-y-[8%] border-x-[6%] border-dashed border-white/25" />
      )}

      <div className={`absolute inset-0 p-[6%] pt-[8%] pb-[12%] ${positionToFlexClasses(effectiveStyle.position)}`}>
        <AnimatePresence mode="sync">
          {active && (
            <motion.div
              key={active.id}
              variants={variants}
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
                  fontSize: `${effectiveStyle.fontSize * scale}px`,
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
                {active.words.map((w, i) => {
                  const isHighlighted = effectiveStyle.wordHighlightEnabled
                    ? w.id === activeWordId
                    : active.highlightedWords.includes(w.id);
                  const showMarker = isHighlighted && effectiveStyle.decoration === "marker";
                  const showUnderline = isHighlighted && effectiveStyle.decoration === "underline";
                  return (
                    <Fragment key={w.id}>
                      <motion.span
                        animate={
                          isGradient
                            ? { scale: isHighlighted ? 1.08 : 1 }
                            : {
                                color: isHighlighted ? effectiveStyle.highlightColor : effectiveStyle.textColor,
                                scale: isHighlighted ? 1.08 : 1,
                              }
                        }
                        transition={{ duration: 0.15 }}
                        style={{
                          display: "inline-block",
                          fontFamily: resolveWordFontFamily(w.text, effectiveStyle.fontFamily),
                          backgroundColor: showMarker ? effectiveStyle.highlightColor : undefined,
                          color: showMarker ? "#000000" : undefined,
                          borderRadius: showMarker ? 4 * scale : undefined,
                          padding: showMarker ? `0 ${4 * scale}px` : undefined,
                          borderBottom: showUnderline ? `${3 * scale}px solid ${effectiveStyle.highlightColor}` : undefined,
                        }}
                      >
                        {applyTextCase(w.text, effectiveStyle.textCase)}
                      </motion.span>
                      {i < active.words.length - 1 ? " " : ""}
                    </Fragment>
                  );
                })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
