import fs from "fs";
import OpenAI from "openai";
import type { TranscriptionProvider, TranscriptionResult, TranscriptWord } from "@/types";

// Word-level timestamps require the verbose_json response format with the
// "word" granularity — OpenAI's SDK types don't model this response shape
// precisely yet, so we read the fields we need defensively.
type WhisperWord = { word: string; start: number; end: number };
type WhisperVerboseResponse = {
  text: string;
  language?: string;
  words?: WhisperWord[];
};

export class OpenAIWhisperProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    const response = (await this.client.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    })) as unknown as WhisperVerboseResponse;

    if (!response.words || response.words.length === 0) {
      throw new Error("Transcription returned no word-level timestamps.");
    }

    const words: TranscriptWord[] = response.words.map((w, i) => ({
      id: `w-${i}`,
      text: w.word,
      start: w.start,
      end: w.end,
    }));

    return { words, rawText: response.text, language: response.language };
  }
}
