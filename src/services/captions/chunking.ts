import { randomUUID } from "crypto";
import type { CaptionGroup, CaptionSettings, TranscriptWord } from "@/types";

const SENTENCE_END = /[.!?]$/;
const SOFT_BREAK = /[,;:]$/;
const PAUSE_SECONDS = 0.35;
const NUMERIC = /^\d[\d,]*\.?\d*%?$/;

/**
 * Deterministic caption chunker used as the always-available fallback (and
 * as the real implementation when no AI provider is configured). Greedily
 * grows a chunk word-by-word and looks for a natural break: sentence-ending
 * punctuation, a speech pause, or a soft-punctuation pause once the target
 * word count is reached — capped by maxWordsPerCaption. A bare number is
 * kept glued to the word that follows it (e.g. "100 days") rather than
 * ending a caption right after it.
 */
export function chunkTranscript(words: TranscriptWord[], settings: CaptionSettings): CaptionGroup[] {
  if (words.length === 0) return [];

  const { minWordsPerCaption: min, maxWordsPerCaption: max } = settings;
  const groups: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    current.push(word);

    const isLast = i === words.length - 1;
    const next = words[i + 1];
    const gapToNext = next ? next.start - word.end : Infinity;
    const endsSentence = SENTENCE_END.test(word.text);
    const endsSoft = SOFT_BREAK.test(word.text);
    const isBareNumber = NUMERIC.test(word.text.replace(/[.,]$/, ""));
    const atMax = current.length >= max;
    const atMin = current.length >= min;

    const shouldBreak =
      isLast ||
      atMax ||
      (!isBareNumber && (endsSentence || (atMin && (endsSoft || gapToNext > PAUSE_SECONDS))));

    if (shouldBreak) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);

  mergeTinyTrailingGroups(groups, max);

  return groups.map((groupWords) => ({
    id: randomUUID(),
    start: groupWords[0].start,
    end: groupWords[groupWords.length - 1].end,
    text: groupWords.map((w) => w.text).join(" "),
    words: groupWords,
    highlightedWords: [],
  }));
}

/** Folds a trailing 1-word group into the previous one when it fits under the cap, avoiding orphan single-word captions. */
function mergeTinyTrailingGroups(groups: TranscriptWord[][], max: number) {
  for (let i = groups.length - 1; i > 0; i--) {
    const group = groups[i];
    const prev = groups[i - 1];
    const endsSentence = SENTENCE_END.test(group[group.length - 1].text);
    if (group.length === 1 && !endsSentence && prev.length + group.length <= max) {
      groups[i - 1] = [...prev, ...group];
      groups.splice(i, 1);
    }
  }
}
