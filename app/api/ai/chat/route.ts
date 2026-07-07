import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { chatWithProvider, AiProvider } from "@/lib/ai-providers";
import { decryptApiKey } from "@/lib/crypto";
import { getUserTransactionSummary } from "@/lib/ai-helpers";

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

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { message, history } = await request.json();

  const data = await getUserTransactionSummary(user.id);
  const { provider, apiKey } = await getProviderConfig(user.id);

  const systemPrompt = `
    You are a personal financial assistant for a Budget Tracker app.
    A user is asking you questions about their finances.

    User Context Summary:
    - Period: ${data.period}
    - Total Income: ${data.totalIncome}
    - Total Expense: ${data.totalExpense}
    - Savings Rate: ${data.savingsRate.toFixed(2)}%
    - Category Stats: ${JSON.stringify(data.categoryStats)}
    - Recent Transactions: ${JSON.stringify(data.recentTransactions)}

    Instructions:
    - BE EXTREMELY CONCISE. Use short sentences and bullet points.
    - Answer the question directly using the provided data.
    - If no goal is found, suggest ONE clear, actionable goal.
    - Use a friendly but efficient tone. Avoid long introductions or generic advice.
    - Use currency symbols from the context (if available, otherwise assume local format).
  `;

  try {
    // Build history for the provider (excluding opening assistant message)
    const providerHistory = history
      .filter((h: { role: string; content: string }, i: number) => !(i === 0 && h.role === "assistant"))
      .map((h: { role: string; content: string }) => ({
        role: h.role === "user" ? ("user" as const) : ("model" as const),
        content: h.content,
      }));

    const responseText = await chatWithProvider(systemPrompt, providerHistory, message, provider, apiKey);
    return Response.json({ role: "assistant", content: responseText });
  } catch (error: any) {
    console.error("Chat error:", error);
    
    const status = error?.status || error?.response?.status || 500;
    
    if (status === 401 || status === 403) {
      return Response.json({ 
        error: "Invalid API Key. Please check your credentials in the LLM settings.",
        role: "assistant"
      }, { status: 401 });
    }
    
    if (status === 429) {
      return Response.json({ 
        error: "Rate limit reached. Try another provider in LLM settings or wait a moment.",
        role: "assistant"
      }, { status: 429 });
    }

    if (status === 503) {
      return Response.json({ 
        error: "Gemini is currently overloaded. Please try again in a few seconds or switch to Groq in the LLM Key settings.",
        role: "assistant"
      }, { status: 503 });
    }

    return new Response("Failed to generate chat response", { status: 500 });
  }
}
