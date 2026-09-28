import { getAudioDuration } from "@/services/video/metadata";
import type { TranscriptionProvider, TranscriptionResult, TranscriptWord } from "@/types";

const SAMPLE_SENTENCE =
  "This is a mock transcript because no OPENAI_API_KEY is configured. " +
  "100 days challenge la kekura question enna na, idhu than antha answer. " +
  "Set your API key in dot env to get a real transcription.";

/**
 * Development fallback so upload -> transcript -> caption editing can be
 * exercised end-to-end without an OpenAI API key. Spreads placeholder words
 * evenly across the audio's real duration so downstream timing logic
 * (chunking, preview sync) behaves the same as with a real provider.
 */
export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    const duration = await getAudioDuration(audioFilePath);
    const rawWords = SAMPLE_SENTENCE.split(/\s+/).filter(Boolean);

    const perWord = duration > 0 ? duration / rawWords.length : 0.4;
    const words: TranscriptWord[] = rawWords.map((text, i) => ({
      id: `w-${i}`,
      text,
      start: Number((i * perWord).toFixed(2)),
      end: Number(((i + 1) * perWord - 0.02).toFixed(2)),
      confidence: 1,
    }));

    return { words, rawText: SAMPLE_SENTENCE, language: "en" };
  }
}
