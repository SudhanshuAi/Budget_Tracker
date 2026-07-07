import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateWithProvider, AiProvider } from "@/lib/ai-providers";
import { decryptApiKey } from "@/lib/crypto";
import { constructInsightPrompt, getUserTransactionSummary } from "@/lib/ai-helpers";
import { addHours } from "date-fns";

export const maxDuration = 60;

async function getProviderConfig(userId: string): Promise<{ provider: AiProvider; apiKey: string }> {
  // Check if user has their own key configured
  const config = await prisma.userAiConfig.findUnique({ where: { userId } });
  if (config) {
    return {
      provider: config.provider as AiProvider,
      apiKey: decryptApiKey(config.apiKey),
    };
  }
  // Fall back to server's Gemini key
  return {
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY ?? "",
  };
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // Check cache
  if (!forceRefresh) {
    const cached = await prisma.aiInsightCache.findUnique({
      where: { userId_type: { userId: user.id, type: "summary" } },
    });
    if (cached && cached.expiresAt > new Date()) {
      return Response.json(JSON.parse(cached.content));
    }
  }

  // Get provider config
  const { provider, apiKey } = await getProviderConfig(user.id);

  // Generate new insights
  const data = await getUserTransactionSummary(user.id);
  const prompt = constructInsightPrompt(data);

  let aiResponse: string;
  try {
    aiResponse = await generateWithProvider(prompt, provider, apiKey);
  } catch {
    return new Response("AI service is currently busy. Please try again later.", { status: 503 });
  }

  const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleanedResponse);

    await prisma.aiInsightCache.upsert({
      where: { userId_type: { userId: user.id, type: "summary" } },
      update: { content: cleanedResponse, expiresAt: addHours(new Date(), 1) },
      create: { userId: user.id, type: "summary", content: cleanedResponse, expiresAt: addHours(new Date(), 1) },
    });

    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
