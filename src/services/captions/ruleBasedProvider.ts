import { chunkTranscript } from "@/services/captions/chunking";
import { detectHighlights } from "@/services/captions/highlighting";
import type { CaptionGroup, CaptionIntelligenceProvider, CaptionSettings, TranscriptWord } from "@/types";

export class RuleBasedCaptionProvider implements CaptionIntelligenceProvider {
  async createCaptionGroups(transcript: TranscriptWord[], settings: CaptionSettings): Promise<CaptionGroup[]> {
    return chunkTranscript(transcript, settings);
  }

  async detectHighlights(captions: CaptionGroup[]): Promise<CaptionGroup[]> {
    return detectHighlights(captions);
  }
}
