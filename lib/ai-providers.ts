import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiProvider, PROVIDER_MODELS } from "./ai-provider-constants";

export { type AiProvider, PROVIDER_LABELS, PROVIDER_MODELS, PROVIDER_ICONS, PROVIDER_DESCRIPTIONS } from "./ai-provider-constants";

/**
 * Generates text using the specified provider and API key.
 */
export async function generateWithProvider(
  prompt: string,
  provider: AiProvider,
  apiKey: string
): Promise<string> {
  switch (provider) {
    case "gemini": {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: PROVIDER_MODELS.gemini });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }

    case "groq": {
      const { default: Groq } = await import("groq-sdk");
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        model: PROVIDER_MODELS.groq,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      });
      return completion.choices[0]?.message?.content ?? "";
    }

    case "openrouter": {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      const completion = await client.chat.completions.create({
        model: PROVIDER_MODELS.openrouter,
        messages: [{ role: "user", content: prompt }],
      });
      return completion.choices[0]?.message?.content ?? "";
    }

    case "anthropic": {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey });
      const message = await anthropic.messages.create({
        model: PROVIDER_MODELS.anthropic,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const block = message.content[0];
      return block.type === "text" ? block.text : "";
    }

    case "openai": {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: PROVIDER_MODELS.openai,
        messages: [{ role: "user", content: prompt }],
      });
      return completion.choices[0]?.message?.content ?? "";
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Chat support: generates a response with message history.
 */
export async function chatWithProvider(
  systemPrompt: string,
  history: { role: "user" | "model"; content: string }[],
  userMessage: string,
  provider: AiProvider,
  apiKey: string
): Promise<string> {
  switch (provider) {
    case "gemini": {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: PROVIDER_MODELS.gemini });
      const chat = model.startChat({
        history: history.map((h) => ({
          role: h.role,
          parts: [{ text: h.content }],
        })),
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      });
      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    }

    case "groq":
    case "openrouter":
    case "openai": {
      let baseURL = undefined;
      if (provider === "openrouter") baseURL = "https://openrouter.ai/api/v1";
      if (provider === "groq") baseURL = "https://api.groq.com/openai/v1";

      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((h) => ({
          role: (h.role === "model" ? "assistant" : "user") as "assistant" | "user",
          content: h.content,
        })),
        { role: "user" as const, content: userMessage },
      ];
      const completion = await client.chat.completions.create({
        model: PROVIDER_MODELS[provider as "groq" | "openrouter" | "openai"],
        messages,
      });
      return completion.choices[0]?.message?.content ?? "";
    }

    case "anthropic": {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey });
      const messages = history.map((h) => ({
        role: (h.role === "model" ? "assistant" : "user") as "assistant" | "user",
        content: h.content,
      }));
      messages.push({ role: "user", content: userMessage });
      const response = await anthropic.messages.create({
        model: PROVIDER_MODELS.anthropic,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });
      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
