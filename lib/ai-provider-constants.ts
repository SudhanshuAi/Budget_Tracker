// Client-safe constants for AI providers - no server SDKs imported here
export type AiProvider = "gemini" | "groq" | "openrouter" | "anthropic" | "openai";

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  groq: "Groq (Llama 3)",
  openrouter: "OpenRouter (Auto)",
  anthropic: "Anthropic Claude",
  openai: "OpenAI GPT",
};

export const PROVIDER_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-flash-latest",
  groq: "llama-3.1-8b-instant",
  openrouter: "openai/gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
};

export const PROVIDER_ICONS: Record<AiProvider, string> = {
  gemini: "🔵",
  groq: "🟠",
  openrouter: "🟣",
  anthropic: "🟤",
  openai: "🟢",
};

export const PROVIDER_DESCRIPTIONS: Record<AiProvider, string> = {
  gemini: "Fast & free tier. Get key at aistudio.google.com",
  groq: "Extremely fast inference. Free tier available at groq.com",
  openrouter: "Routes to best available model. openrouter.ai",
  anthropic: "Claude Haiku - smart & efficient. console.anthropic.com",
  openai: "GPT-4o Mini - balanced cost & quality. platform.openai.com",
};
