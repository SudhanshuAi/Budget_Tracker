import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import History from "../_components/History";
import BudgetHealthScore from "../_components/BudgetHealthScore";
import AiInsightsSidebar from "../_components/AiInsightsSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Target, Sparkles } from "lucide-react";

export default async function AiInsightsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (!userSettings) {
    redirect("/wizard");
  }

  return (
    <div className="h-full bg-background pb-20">
      <div className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-6 p-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <BrainCircuit className="w-10 h-10 text-indigo-500" />
              Detailed AI Intelligence
            </h1>
            <p className="text-muted-foreground">
              Deep-dive into your financial habits and future projections.
            </p>
          </div>
        </div>
      </div>

      <div className="container mt-8 flex flex-col gap-8 px-4">
        {/* Top Section - Detailed AI Snapshot */}
        <section className="w-full">
           <AiInsightsSidebar />
        </section>

        {/* Middle Section - Health & Actionable Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BudgetHealthScore />
          
          <Card className="relative overflow-hidden border-indigo-500/20 bg-indigo-500/5 shadow-2xl flex flex-col justify-center min-h-[200px]">
             {/* Subtle Decorative Glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 bg-indigo-500/10 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 bg-indigo-500/10 blur-3xl" />
            
            <CardHeader className="pb-2">
              <CardTitle className="text-indigo-400 flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" />
                AI Smart Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl leading-relaxed text-foreground/90 italic font-semibold">
                &quot;You&apos;re currently on track to save 12% more than last month. 
                Keep your &apos;Dining Out&apos; category below ₹2,000 this week to reach your &apos;A+&apos; health score.&quot;
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-400/80">
                <Sparkles className="w-3 h-3" />
                Updated in real-time based on your activity
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Detailed History */}
        <section className="w-full">
           <History userSettings={userSettings} />
        </section>
      </div>

    </div>
  );
}
