// src/types/ai.ts
export type StudioType = "CHAT" | "IMAGE" | "VIDEO" | "VOICE" | "MUSIC" | "CODING";

export interface AIModel {
  id: string;
  label: string;
  provider: string;
  costPerRequest: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
