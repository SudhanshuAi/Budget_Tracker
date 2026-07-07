import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateAiInsight } from "@/lib/gemini";
import { constructInsightPrompt, getUserTransactionSummary } from "@/lib/ai-helpers";
import { addHours } from "date-fns";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // Check cache
  if (!forceRefresh) {
    const cached = await prisma.aiInsightCache.findUnique({
      where: {
        userId_type: {
          userId: user.id,
          type: "summary",
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      return Response.json(JSON.parse(cached.content));
    }
  }

  // Generate new insights
  const data = await getUserTransactionSummary(user.id);
  const prompt = constructInsightPrompt(data);
  const aiResponse = await generateAiInsight(prompt);

  if (!aiResponse) {
    return new Response("Failed to generate AI insights", { status: 500 });
  }

  // Clean up AI response (sometimes it includes markdown blocks)
  const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();
  
  try {
    const parsed = JSON.parse(cleanedResponse);

    // Update cache
    await prisma.aiInsightCache.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: "summary",
        },
      },
      update: {
        content: cleanedResponse,
        expiresAt: addHours(new Date(), 1), // 1 hour TTL
      },
      create: {
        userId: user.id,
        type: "summary",
        content: cleanedResponse,
        expiresAt: addHours(new Date(), 1),
      },
    });

    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Failed to fetch AI insights" }, { status: 500 });
  }
}
