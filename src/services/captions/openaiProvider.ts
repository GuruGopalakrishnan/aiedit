import OpenAI from "openai";
import { randomUUID } from "crypto";
import { chunkTranscript } from "@/services/captions/chunking";
import { detectHighlights } from "@/services/captions/highlighting";
import type { CaptionGroup, CaptionIntelligenceProvider, CaptionSettings, TranscriptWord } from "@/types";

const CHUNKING_SYSTEM_PROMPT = `You are a short-form video caption editor.

You receive a transcript with word-level timestamps, each word carrying a unique id.

Your job is to divide the transcript into short, readable caption groups.

Rules:
- Prefer {min}-{max} words per caption.
- Never split important phrases unnecessarily.
- Keep natural spoken rhythm.
- Use speech pauses where possible.
- Keep reading speed comfortable.
- Avoid one-word captions unless they are intentionally impactful.
- Keep names, numbers and connected phrases together.
- Do not rewrite the speaker's meaning.
- Do not remove words unless they are obvious transcription filler errors.
- Return valid JSON only, of the shape {"captions":[{"startWordId":"...","endWordId":"..."}]},
  where startWordId/endWordId are ids from the input word list marking the
  inclusive start and end of each caption group, covering every word exactly once in order.`;

const HIGHLIGHT_SYSTEM_PROMPT = `You are choosing words to visually highlight in short-form video captions.

For every caption:
- Select the most important word or phrase.
- Prioritize numbers, money, percentages, results, emotional words, time periods, strong claims, product names and key nouns.
- Do not highlight filler words.
- Do not highlight more than 30-40% of the caption.
- Some captions can have no highlight.
- Return valid JSON only, of the shape {"highlights":[{"captionId":"...","highlightWordIds":["..."]}]},
  where highlightWordIds are word ids from that caption's word list (empty array if nothing should be highlighted).`;

export class OpenAICaptionProvider implements CaptionIntelligenceProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async createCaptionGroups(transcript: TranscriptWord[], settings: CaptionSettings): Promise<CaptionGroup[]> {
    if (transcript.length === 0) return [];

    const prompt = CHUNKING_SYSTEM_PROMPT.replace("{min}", String(settings.minWordsPerCaption)).replace(
      "{max}",
      String(settings.maxWordsPerCaption)
    );

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(transcript.map((w) => ({ id: w.id, text: w.text }))) },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as {
        captions?: { startWordId: string; endWordId: string }[];
      };

      const wordIndex = new Map(transcript.map((w, i) => [w.id, i]));
      const groups: CaptionGroup[] = [];

      for (const c of parsed.captions ?? []) {
        const startIdx = wordIndex.get(c.startWordId);
        const endIdx = wordIndex.get(c.endWordId);
        if (startIdx === undefined || endIdx === undefined || endIdx < startIdx) continue;

        const groupWords = transcript.slice(startIdx, endIdx + 1);
        groups.push({
          id: randomUUID(),
          start: groupWords[0].start,
          end: groupWords[groupWords.length - 1].end,
          text: groupWords.map((w) => w.text).join(" "),
          words: groupWords,
          highlightedWords: [],
        });
      }

      // Model output failed validation entirely — fall back to the deterministic chunker
      // rather than surfacing an empty caption list.
      return groups.length > 0 ? groups : chunkTranscript(transcript, settings);
    } catch {
      return chunkTranscript(transcript, settings);
    }
  }

  async detectHighlights(captions: CaptionGroup[]): Promise<CaptionGroup[]> {
    if (captions.length === 0) return captions;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: HIGHLIGHT_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(
              captions.map((c) => ({ captionId: c.id, text: c.text, words: c.words.map((w) => ({ id: w.id, text: w.text })) }))
            ),
          },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as {
        highlights?: { captionId: string; highlightWordIds: string[] }[];
      };

      const byId = new Map((parsed.highlights ?? []).map((h) => [h.captionId, h.highlightWordIds]));
      return captions.map((c) => ({ ...c, highlightedWords: byId.get(c.id) ?? [] }));
    } catch {
      return detectHighlights(captions);
    }
  }
}
