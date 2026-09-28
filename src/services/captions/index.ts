import type { CaptionIntelligenceProvider } from "@/types";
import { OpenAICaptionProvider } from "@/services/captions/openaiProvider";
import { RuleBasedCaptionProvider } from "@/services/captions/ruleBasedProvider";

export function getCaptionIntelligenceProvider(): CaptionIntelligenceProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return new OpenAICaptionProvider(apiKey);
  }
  return new RuleBasedCaptionProvider();
}
