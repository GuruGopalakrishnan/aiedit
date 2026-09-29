import type { TranscriptWord } from "@/types";

// Matches a leading timestamp marker like (0:04) or (1:02:30) at the start of a sentence.
const TIMESTAMP_RE = /\((?:(\d+):)?(\d{1,2}):(\d{2})\)/g;

function distributeWords(tokens: string[], start: number, end: number, startIndex: number): TranscriptWord[] {
  const perWord = tokens.length > 0 ? (end - start) / tokens.length : 0;
  return tokens.map((text, j) => {
    const wStart = start + j * perWord;
    const wEnd = j === tokens.length - 1 ? end - 0.02 : start + (j + 1) * perWord - 0.02;
    return {
      id: `w-${startIndex + j}`,
      text,
      start: Number(wStart.toFixed(2)),
      end: Number(Math.max(wStart + 0.05, wEnd).toFixed(2)),
      confidence: 1,
    };
  });
}

/**
 * Turns a user-pasted transcript into word-level timestamps.
 *
 * If the text contains `(mm:ss)` markers at sentence starts, each marked
 * segment is timed against the next marker (or the video's end for the last
 * one) and its words are spread evenly across that span. Without markers,
 * every word is spread evenly across the whole video — accurate enough for
 * short clips, since there's no other timing signal to go on.
 */
export function parseManualTranscript(
  raw: string,
  videoDuration: number
): { words: TranscriptWord[]; rawText: string } {
  const matches = [...raw.matchAll(TIMESTAMP_RE)];

  if (matches.length === 0) {
    const tokens = raw.split(/\s+/).filter(Boolean);
    return {
      words: distributeWords(tokens, 0, Math.max(videoDuration, 0.1), 0),
      rawText: raw.replace(/\s+/g, " ").trim(),
    };
  }

  const segments: { start: number; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const hours = m[1] ? Number(m[1]) : 0;
    const minutes = Number(m[2]);
    const seconds = Number(m[3]);
    const start = hours * 3600 + minutes * 60 + seconds;
    const textStart = m.index! + m[0].length;
    const textEnd = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const text = raw.slice(textStart, textEnd).replace(/\s+/g, " ").trim();
    if (text) segments.push({ start, text });
  }

  const words: TranscriptWord[] = [];
  for (let i = 0; i < segments.length; i++) {
    const { start, text } = segments[i];
    const nextStart = i + 1 < segments.length ? segments[i + 1].start : videoDuration;
    const end = Math.max(nextStart, start + 0.1);
    const tokens = text.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    words.push(...distributeWords(tokens, start, end, words.length));
  }

  return { words, rawText: segments.map((s) => s.text).join(" ") };
}
