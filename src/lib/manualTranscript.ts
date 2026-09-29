import type { TranscriptWord } from "@/types";
import type { SpeechSegment } from "@/services/audio/silenceDetect";

// Matches a leading timestamp marker like (0:04) or (1:02:30) at the start of a sentence.
const TIMESTAMP_RE = /\((?:(\d+):)?(\d{1,2}):(\d{2})\)/g;

function distributeEvenly(tokens: string[], start: number, end: number, startIndex: number): TranscriptWord[] {
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

/** Clips speech segments to a window, dropping/trimming anything outside it. */
function clipToWindow(segments: SpeechSegment[], start: number, end: number): SpeechSegment[] {
  return segments
    .map((s) => ({ start: Math.max(s.start, start), end: Math.min(s.end, end) }))
    .filter((s) => s.end - s.start > 0.05);
}

/**
 * Distributes words across a sequence of real speech intervals (skipping
 * silence gaps between them) instead of evenly across wall-clock time. Each
 * interval gets a word count proportional to its share of total speech
 * duration in the window.
 */
function distributeAcrossSpeech(tokens: string[], segments: SpeechSegment[], startIndex: number): TranscriptWord[] {
  const totalSpeech = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  if (totalSpeech <= 0) return [];

  const words: TranscriptWord[] = [];
  let tokenIdx = 0;
  let remaining = tokens.length;

  segments.forEach((seg, i) => {
    const isLast = i === segments.length - 1;
    const segDur = seg.end - seg.start;
    const share = isLast ? remaining : Math.min(remaining, Math.max(1, Math.round((segDur / totalSpeech) * tokens.length)));
    if (share <= 0) return;

    const segTokens = tokens.slice(tokenIdx, tokenIdx + share);
    words.push(...distributeEvenly(segTokens, seg.start, seg.end, startIndex + words.length));
    tokenIdx += share;
    remaining -= share;
  });

  return words;
}

function distributeInWindow(tokens: string[], start: number, end: number, startIndex: number, speechSegments: SpeechSegment[]): TranscriptWord[] {
  const windowSpeech = clipToWindow(speechSegments, start, end);
  if (windowSpeech.length > 0) {
    const words = distributeAcrossSpeech(tokens, windowSpeech, startIndex);
    if (words.length > 0) return words;
  }
  // No detected speech in this window (silence detection found nothing, or
  // this whole span is one continuous speech run with no pauses) -- spread
  // evenly across the wall-clock window instead.
  return distributeEvenly(tokens, start, end, startIndex);
}

/**
 * Turns a user-pasted transcript into word-level timestamps.
 *
 * If the text contains `(mm:ss)` markers at sentence starts, each marked
 * segment is timed against the next marker (or the video's end for the last
 * one). Within that window -- and across the whole video when there are no
 * markers at all -- words are distributed across detected speech intervals
 * (see services/audio/silenceDetect) so they land inside actual speech and
 * skip pauses, rather than being spread uniformly regardless of where the
 * pauses actually fall. Falls back to even wall-clock spacing wherever no
 * speech was detected in a window.
 */
export function parseManualTranscript(
  raw: string,
  videoDuration: number,
  speechSegments: SpeechSegment[] = []
): { words: TranscriptWord[]; rawText: string } {
  const matches = [...raw.matchAll(TIMESTAMP_RE)];

  if (matches.length === 0) {
    const tokens = raw.split(/\s+/).filter(Boolean);
    return {
      words: distributeInWindow(tokens, 0, Math.max(videoDuration, 0.1), 0, speechSegments),
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
    words.push(...distributeInWindow(tokens, start, end, words.length, speechSegments));
  }

  return { words, rawText: segments.map((s) => s.text).join(" ") };
}
