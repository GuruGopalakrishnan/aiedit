import type { CaptionGroup, TranscriptWord } from "@/types";

const TIME_UNITS = new Set([
  "second", "seconds", "minute", "minutes", "hour", "hours",
  "day", "days", "week", "weeks", "month", "months", "year", "years",
]);

const MONEY_UNITS = new Set([
  "lakh", "lakhs", "crore", "crores", "thousand", "million", "billion",
  "rupees", "rupee", "dollar", "dollars", "rs",
]);

const IMPACT_KEYWORDS = new Set([
  "biggest", "mistake", "amazing", "incredible", "huge", "massive", "insane",
  "crazy", "best", "worst", "secret", "proven", "guaranteed", "revenue",
  "profit", "growth", "results", "success", "failure", "win", "lose", "free",
  "breakthrough", "discover", "discovered", "revealed", "warning", "important",
  "never", "always", "instantly", "finally", "shocking", "viral",
]);

const NUMERIC = /^[$₹]?\d[\d,]*\.?\d*%?$/;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?;:]+$/, "");
}

/** Finds the best highlight-worthy span (1-3 adjacent words) in a caption, or none. */
function findHighlightSpan(words: TranscriptWord[]): TranscriptWord[] | null {
  for (let i = 0; i < words.length; i++) {
    const norm = normalize(words[i].text);
    if (NUMERIC.test(norm)) {
      const span = [words[i]];
      const nextNorm = words[i + 1] ? normalize(words[i + 1].text) : "";
      if (TIME_UNITS.has(nextNorm) || MONEY_UNITS.has(nextNorm)) {
        span.push(words[i + 1]);
      }
      return span;
    }
  }

  for (let i = 0; i < words.length; i++) {
    if (MONEY_UNITS.has(normalize(words[i].text))) {
      return [words[i]];
    }
  }

  for (let i = 0; i < words.length; i++) {
    if (IMPACT_KEYWORDS.has(normalize(words[i].text))) {
      const span = [words[i]];
      const nextNorm = words[i + 1] ? normalize(words[i + 1].text) : "";
      if (IMPACT_KEYWORDS.has(nextNorm)) span.push(words[i + 1]);
      return span;
    }
  }

  return null;
}

/**
 * Deterministic highlight detector (fallback + always-available path).
 * Picks at most one span per caption — numbers/time-periods/money first,
 * then emotional or business-impact keywords — capped near 40% of the
 * caption's word count so highlighting stays sparse and meaningful.
 */
export function detectHighlights(captions: CaptionGroup[]): CaptionGroup[] {
  return captions.map((caption) => {
    const span = findHighlightSpan(caption.words);
    if (!span) return { ...caption, highlightedWords: [] };

    const maxHighlightWords = Math.max(1, Math.floor(caption.words.length * 0.4));
    const trimmed = span.slice(0, maxHighlightWords);
    return { ...caption, highlightedWords: trimmed.map((w) => w.id) };
  });
}
