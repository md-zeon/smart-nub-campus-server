import type { AIProvider, AIProviderConfig } from "./types";
import { GeminiProvider } from "./gemini.provider";

export function createProvider(config: AIProviderConfig): AIProvider {
  return new GeminiProvider(config);
}
