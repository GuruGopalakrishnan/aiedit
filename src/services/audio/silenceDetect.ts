import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";

export type SpeechSegment = { start: number; end: number };

const SILENCE_START_RE = /silence_start:\s*([\d.]+)/;
const SILENCE_END_RE = /silence_end:\s*([\d.]+)/;

/** Runs ffmpeg's silencedetect and returns raw stderr, regardless of exit code (an `-f null -` run with no crash still exits 0, but we don't want a non-zero exit to swallow the log). */
function runSilenceDetect(audioPath: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      ffmpegPath as unknown as string,
      ["-i", audioPath, "-af", "silencedetect=noise=-30dB:d=0.3", "-f", "null", "-"],
      { maxBuffer: 1024 * 1024 * 20 },
      (_err, _stdout, stderr) => resolve(stderr ?? "")
    );
  });
}

/**
 * Detects speech (non-silence) intervals in an audio file via ffmpeg's
 * silencedetect filter -- a free, local, deterministic stand-in for real
 * forced alignment. Used to distribute a user-supplied transcript's words
 * so they land inside actual speech and skip pauses, instead of being
 * spread uniformly across wall-clock time regardless of where the pauses
 * actually are.
 */
export async function detectSpeechSegments(audioPath: string, totalDuration: number): Promise<SpeechSegment[]> {
  const log = await runSilenceDetect(audioPath);

  const silences: { start: number; end: number }[] = [];
  let pendingStart: number | null = null;

  for (const line of log.split("\n")) {
    const startMatch = SILENCE_START_RE.exec(line);
    if (startMatch) {
      pendingStart = Number(startMatch[1]);
      continue;
    }
    const endMatch = SILENCE_END_RE.exec(line);
    if (endMatch && pendingStart !== null) {
      silences.push({ start: pendingStart, end: Number(endMatch[1]) });
      pendingStart = null;
    }
  }

  if (silences.length === 0) {
    // Either the whole clip is speech, or detection failed -- callers fall
    // back to even distribution across the full duration in that case.
    return [];
  }

  const speech: SpeechSegment[] = [];
  let cursor = 0;
  for (const s of silences) {
    if (s.start > cursor) speech.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < totalDuration) speech.push({ start: cursor, end: totalDuration });

  return speech.filter((seg) => seg.end - seg.start > 0.08);
}
