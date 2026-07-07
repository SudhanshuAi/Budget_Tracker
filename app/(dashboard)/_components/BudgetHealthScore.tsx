"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { cn } from "@/lib/utils";

interface HealthData {
  healthScore: number;
  savingsRateText: string;
  forecastBalance: string;
  healthNarrative: string;
}

export default function BudgetHealthScore() {
  const { data, isLoading } = useQuery<HealthData>({
    queryKey: ["ai-insights"],
    queryFn: () => fetch("/api/ai/insights").then((res) => res.json()),
  });

  const score = data?.healthScore ?? 0;

  const getGrade = (s: number) => {
    if (s >= 90) return { grade: "A+", color: "text-emerald-500", label: "Excellent" };
    if (s >= 80) return { grade: "A", color: "text-emerald-400", label: "Very Good" };
    if (s >= 70) return { grade: "B", color: "text-sky-500", label: "Healthy" };
    if (s >= 60) return { grade: "C", color: "text-amber-500", label: "Fair" };
    return { grade: "D", color: "text-rose-500", label: "At Risk" };
  };

  const { grade, color, label } = getGrade(score);

  return (
    <Card className="h-full">
      <CardHeader className="py-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Budget Health Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-0 pb-6">
        <SkeletonWrapper isLoading={isLoading}>
          <div className="flex items-center justify-around gap-4">
            <div className="relative flex items-center justify-center w-32 h-32 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/10" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 - (364.4 * score) / 100} className={cn("transition-all duration-1000", color)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-4xl font-black", color)}>{grade}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">{label}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 flex-grow">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Savings Rate</p>
                <p className="text-lg font-bold">
                  {typeof data?.savingsRateText === "string" ? data.savingsRateText : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Month-End Projection</p>
                <p className="text-lg font-bold">
                  {typeof data?.forecastBalance === "string" ? data.forecastBalance : "Calculating..."}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-muted-foreground/10">
            <p className="text-xs leading-relaxed italic text-muted-foreground">
              {typeof data?.healthNarrative === "string" ? data.healthNarrative : "Your health score is calculated based on category risks and performance."}
            </p>
          </div>
        </SkeletonWrapper>
      </CardContent>
    </Card>
  );
}

