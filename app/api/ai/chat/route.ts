import { currentUser } from "@clerk/nextjs/server";
import { geminiModel } from "@/lib/gemini";
import { getUserTransactionSummary } from "@/lib/ai-helpers";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message, history } = await request.json();

  // Get user data context
  const data = await getUserTransactionSummary(user.id);
  
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
    - Answer the question directly using the provide data.
    - If no goal is found, suggest ONE clear, actionable goal (e.g., "Aim for ₹5,000 savings").
    - Use a friendly but efficient tone. Avoid long introductions or generic advice.
    - Use currency symbols from the context (if available, otherwise assume local format).
  `;

  try {
    // Gemini requires history to start with 'user'
    const formattedHistory = history
      .filter((h: any, index: number) => {
        if (index === 0 && h.role === "assistant") return false;
        return true;
      })
      .map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      }));

    const chat = geminiModel.startChat({
      history: formattedHistory,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    return Response.json({ role: "assistant", content: response.text() });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response("Failed to generate chat response", { status: 500 });
  }
}
