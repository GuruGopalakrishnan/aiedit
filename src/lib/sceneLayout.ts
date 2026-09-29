import type { CaptionGroup, TranscriptWord } from "@/types";

export type SceneLine = { words: TranscriptWord[]; emphasized: boolean };

/**
 * Splits a caption into stacked display lines for "stacked" layout themes
 * (Big Keyword, Kinetic Stack, Split Text): a highlighted word gets its own
 * line so it can render at a larger size, everything else chunks into
 * short runs. Reuses the caption's existing `highlightedWords` (the same
 * rule-based emphasis detector that drives inline decoration/color) as the
 * emphasis signal, so "what's important" stays one concept across every
 * layout instead of a second, separate detector.
 */
export function buildStackedLines(caption: CaptionGroup): SceneLine[] {
  const emphasized = new Set(caption.highlightedWords);
  const lines: SceneLine[] = [];
  let current: TranscriptWord[] = [];

  const flush = () => {
    if (current.length > 0) {
      lines.push({ words: current, emphasized: false });
      current = [];
    }
  };

  for (const w of caption.words) {
    if (emphasized.has(w.id)) {
      flush();
      lines.push({ words: [w], emphasized: true });
      continue;
    }
    current.push(w);
    if (current.length >= 3) flush();
  }
  flush();

  return lines.length > 0 ? lines : [{ words: caption.words, emphasized: false }];
}
