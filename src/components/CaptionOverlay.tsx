"use client";

import { useEffect, useRef, useState } from "react";
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
  const activeWordId = active && style.wordHighlightEnabled ? findActiveWordId(active, currentTime) : null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {showSafeArea && (
        <div className="absolute inset-0 border-y-[8%] border-x-[6%] border-dashed border-white/25" />
      )}

      <div className={`absolute inset-0 p-[6%] pt-[8%] pb-[12%] ${positionToFlexClasses(style.position)}`}>
        {active && (
          <div
            className={`inline-block max-w-full rounded-md ${backgroundClasses(style.background)}`}
            style={{
              padding: style.background === "none" ? 0 : `${4 * scale}px ${10 * scale}px`,
            }}
          >
            <p
              style={{
                fontFamily: style.fontFamily,
                fontWeight: fontWeightValue(style.fontWeight),
                fontSize: `${style.fontSize * scale}px`,
                textAlign: style.textAlign,
                lineHeight: 1.25,
                color: style.textColor,
                WebkitTextStroke:
                  style.stroke === "none" ? undefined : `${strokeWidthPx(style.stroke, scale)}px black`,
                textShadow: style.shadow ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.7)` : undefined,
                margin: 0,
              }}
            >
              {active.words.map((w, i) => {
                const isHighlighted = style.wordHighlightEnabled
                  ? w.id === activeWordId
                  : active.highlightedWords.includes(w.id);
                return (
                  <span key={w.id} style={{ color: isHighlighted ? style.highlightColor : undefined }}>
                    {applyTextCase(w.text, style.textCase)}
                    {i < active.words.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
