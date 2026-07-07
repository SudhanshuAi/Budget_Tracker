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
    categoryStats: summary,
    totalIncome,
    totalExpense,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
    recentTransactions,
    period: `${format(startDate, "MMM yyyy")} to Present`,
  };
}

export function constructInsightPrompt(data: any) {
  return `
    As a professional financial advisor AI, analyze the following user budget data for the period ${data.period} and provide a JSON response.
    
    Data Summary:
    - Total Income: ${data.totalIncome}
    - Total Expense: ${data.totalExpense}
    - Savings Rate: ${data.savingsRate.toFixed(2)}%
    - Category Breakdown: ${JSON.stringify(data.categoryStats)}
    - Recent activity: ${JSON.stringify(data.recentTransactions)}

    Required JSON output format:
    {
      "summary": "A concise paragraph summarizing their financial health and trends.",
      "anomalies": ["List any unusual patterns or spikes observed in categories or recent activity"],
      "opportunities": ["3 actionable tips to save more or optimize spending based on their specific categories"],
      "healthScore": 0-100 (an integer),
      "savingsRateText": "e.g., 25% (Good)",
      "forecastBalance": "e.g., ₹12,500 (+15%)",
      "healthNarrative": "One sentence about what exactly shaped their score today."
    }

    Keep the tone professional, encouraging, and highly specific to the data provided. DO NOT use generic advice.
  `;
}
