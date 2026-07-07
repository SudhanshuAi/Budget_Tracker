import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateWithProvider, AiProvider } from "@/lib/ai-providers";
import { decryptApiKey } from "@/lib/crypto";
import { constructInsightPrompt, getUserTransactionSummary } from "@/lib/ai-helpers";
import { addHours } from "date-fns";

export const maxDuration = 60;

async function getProviderConfig(userId: string): Promise<{ provider: AiProvider; apiKey: string }> {
  const config = await prisma.userAiConfig.findUnique({ where: { userId } });
  if (config) {
    return {
      provider: config.provider as AiProvider,
      apiKey: decryptApiKey(config.apiKey),
    };
  }
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

  if (!forceRefresh) {
    const cached = await prisma.aiInsightCache.findUnique({
      where: { userId_type: { userId: user.id, type: "summary" } },
    });
    if (cached && cached.expiresAt > new Date()) {
      return Response.json(JSON.parse(cached.content));
    }
  }

  const { provider, apiKey } = await getProviderConfig(user.id);
  const data = await getUserTransactionSummary(user.id);
  const prompt = constructInsightPrompt(data);

  let aiResponse: string;
  try {
    aiResponse = await generateWithProvider(prompt, provider, apiKey);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 503;
    return Response.json({ 
      error: "AI service is currently busy or overloaded. Please try again in a moment.",
      code: "SERVICE_BUSY"
    }, { status });
  }

  // Robust JSON Extraction
  let jsonString = aiResponse.trim();
  if (jsonString.includes("{")) {
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }
  }
  jsonString = jsonString.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(jsonString);

    await prisma.aiInsightCache.upsert({
      where: { userId_type: { userId: user.id, type: "summary" } },
      update: { content: JSON.stringify(parsed), expiresAt: addHours(new Date(), 1) },
      create: { userId: user.id, type: "summary", content: JSON.stringify(parsed), expiresAt: addHours(new Date(), 1) },
    });

    return Response.json(parsed);
  } catch {
    console.error("JSON Parse Error. AI Response was:", aiResponse);
    
    // In case of a hard parse error, return a nice UI message
    return Response.json({ 
      error: "AI returned data in an incorrect format. Please try again or switch providers in LLM settings.",
      code: "PARSE_ERROR" 
    }, { status: 500 });
  }
}
