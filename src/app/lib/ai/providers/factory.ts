import type { AIProvider, AIProviderConfig } from "./types";
import { GeminiProvider } from "./gemini.provider";
import { GroqProvider } from "./groq.provider";

export function createProvider(config: AIProviderConfig & { provider?: string }): AIProvider {
  switch (config.provider) {
    case "groq":
      return new GroqProvider(config);
    case "gemini":
    default:
      return new GeminiProvider(config);
  }
}
