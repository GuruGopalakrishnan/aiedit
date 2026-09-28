import type { CaptionGroup, CaptionPosition, CaptionStyle, FontWeight, StrokeWidth, TextCase, TranscriptWord } from "@/types";

/** Caption font sizes/positions are authored relative to this canonical canvas width (matches DEFAULT_EXPORT). */
export const CANONICAL_CANVAS_WIDTH = 1080;

export function findActiveCaption(captions: CaptionGroup[], t: number): CaptionGroup | null {
  for (const c of captions) {
    if (t >= c.start && t <= c.end) return c;
  }
  return null;
}

/** The word "currently being spoken" within a caption, for karaoke-style active-word highlighting. */
export function findActiveWordId(caption: CaptionGroup, t: number): string | null {
  let active: TranscriptWord | null = null;
  for (const w of caption.words) {
    if (w.start <= t) active = w;
    if (t < w.start) break;
  }
  return active?.id ?? null;
}

const FONT_WEIGHT_VALUE: Record<FontWeight, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

const STROKE_WIDTH_PX: Record<StrokeWidth, number> = {
  none: 0,
  thin: 1,
  medium: 2.5,
  thick: 5,
};

export function fontWeightValue(weight: FontWeight): number {
  return FONT_WEIGHT_VALUE[weight];
}

export function strokeWidthPx(stroke: StrokeWidth, scale: number): number {
  return STROKE_WIDTH_PX[stroke] * scale;
}

export function applyTextCase(text: string, textCase: TextCase): string {
  switch (textCase) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "titlecase":
      return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    default:
      return text;
  }
}

/** Tailwind flex classes that place the caption block within its safe-area container. */
export function positionToFlexClasses(position: CaptionPosition): string {
  const vertical = position.startsWith("top") ? "justify-start" : position.startsWith("bottom") ? "justify-end" : "justify-center";
  const horizontal = position.endsWith("left")
    ? "items-start text-left"
    : position.endsWith("right")
      ? "items-end text-right"
      : "items-center text-center";
  return `flex flex-col ${vertical} ${horizontal}`;
}

export function backgroundClasses(background: CaptionStyle["background"]): string {
  switch (background) {
    case "solid":
      return "bg-black";
    case "semi-transparent":
      return "bg-black/50";
    default:
      return "bg-transparent";
  }
}
