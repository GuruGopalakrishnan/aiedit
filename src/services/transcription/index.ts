import type { TranscriptionProvider } from "@/types";
import { OpenAIWhisperProvider } from "@/services/transcription/openaiProvider";
import { MockTranscriptionProvider } from "@/services/transcription/mockProvider";

export function getTranscriptionProvider(): TranscriptionProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return new OpenAIWhisperProvider(apiKey);
  }
  return new MockTranscriptionProvider();
}

/** Trims whitespace and collapses accidental double spaces from raw transcript text. */
export function cleanTranscriptText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
