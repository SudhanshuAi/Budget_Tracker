import prisma from "./prisma";
import { startOfMonth, subMonths, format } from "date-fns";
import { Transaction } from ".prisma/client";

export async function getUserTransactionSummary(userId: string, months = 3) {
  const startDate = startOfMonth(subMonths(new Date(), months));

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Aggregate by category and type
  const summary: Record<string, { income: number; expense: number; count: number }> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx: Transaction) => {
    if (!summary[tx.category]) {
      summary[tx.category] = { income: 0, expense: 0, count: 0 };
    }
    if (tx.type === "income") {
      summary[tx.category].income += tx.amount;
      totalIncome += tx.amount;
    } else {
      summary[tx.category].expense += tx.amount;
      totalExpense += tx.amount;
    }
    summary[tx.category].count++;
  });

  // Recent 10 transactions for context (anonymized descriptions)
  const recentTransactions = transactions.slice(0, 10).map((tx: Transaction) => ({
    date: format(tx.date, "yyyy-MM-dd"),
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
  }));

  return {
    categoryStats: summary as Record<string, { income: number; expense: number; count: number }>,
    totalIncome,
    totalExpense,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
    recentTransactions,
    period: `${format(startDate, "MMM yyyy")} to Present`,
  };
}

export function constructInsightPrompt(data: {
  period: string;
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  categoryStats: Record<string, { income: number; expense: number; count: number }>;
  recentTransactions: { date: string; amount: number; type: string; category: string }[];
}) {
  return `
    As an Elite Financial Wealth Architect and Data Analyst, perform a deep-dive analysis of the following user budget data for the period ${data.period}.
    
    Data Summary for Analysis:
    - Total Inflow: ${data.totalIncome}
    - Total Outflow: ${data.totalExpense}
    - Savings Efficiency: ${data.savingsRate.toFixed(2)}%
    - Category Velocity & Distribution: ${JSON.stringify(data.categoryStats)}
    - Recent Raw Activity: ${JSON.stringify(data.recentTransactions)}

    GOAL: Provide sophisticated, high-signal financial intelligence. 
    1. SUMMARY: Must be 3-5 sentences. Analyze the 'why' behind the numbers, not just the 'what'. Compare income vs expenses and note the sustainability of their current savings rate.
    2. ANOMALIES: Identify subtle trends, erratic spending in specific categories, or unusual income patterns.
    3. OPPORTUNITIES: Provide 3 strategic, actionable wealth-building tips. Focus on tax efficiency, high-impact savings, or reducing 'lifestyle creep' in their highest spending categories.
    4. TONE: Professional, executive-level, and data-driven. Use terms like 'capital allocation', 'burn rate', and 'portfolio health'.

    IMPORTANT: Return ONLY a valid JSON object. DO NOT include markdown outside the JSON block.
    
    Required JSON structure:
    {
      "summary": "Example: Your capital allocation is currently optimized for liquidity, with a robust 93% savings rate driven by high freelance velocity. However, the 'Bill' category shows erratic fluctuation suggests a need for subscription auditing...",
      "anomalies": ["Category X shows a 15% increase vs last month", "..."],
      "opportunities": ["Strategic Tip: Reallocate X to a high-yield vehicle...", "..."],
      "healthScore": 85,
      "savingsRateText": "93% (Excellent)",
      "forecastBalance": "₹74,200",
      "healthNarrative": "Your aggressive saving strategy is creating a powerful safety net for future investment."
    }
  `;
}
