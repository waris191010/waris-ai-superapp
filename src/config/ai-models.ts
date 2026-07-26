// src/config/ai-models.ts
import { AIModel } from "@/types/ai";

export const AI_MODELS: AIModel[] = [
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", costPerRequest: 5.0 },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic", costPerRequest: 6.0 },
  { id: "deepseek-r1", label: "DeepSeek R1", provider: "DeepSeek", costPerRequest: 1.0 },
];
