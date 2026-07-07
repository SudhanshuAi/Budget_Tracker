"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface AiInsights {
  summary: string;
  anomalies: string[];
  opportunities: string[];
  healthScore: number;
}

export default function AiInsightsSidebar() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const insightsQuery = useQuery<AiInsights>({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/ai/insights?refresh=true");
      if (!res.ok) throw new Error("Failed to refresh");
      await res.json();
      insightsQuery.refetch();
      toast.success("Insights updated!");
    } catch {
      toast.error("Failed to refresh insights");
    } finally {
      setIsRefreshing(false);
    }
  };

  const data = insightsQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          AI Insights
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || insightsQuery.isLoading}
          className="h-8 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <SkeletonWrapper isLoading={insightsQuery.isLoading}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Summary */}
          <Card className="border-amber-500/20 bg-amber-500/5 h-full">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[13px] text-muted-foreground leading-snug px-4 pb-4">
              {data?.summary || "Analyzing your spending patterns..."}
            </CardContent>
          </Card>

          {/* Anomalies */}
          <Card className="border-rose-500/20 bg-rose-500/5 h-full">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-3 h-3" />
                Spending Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ul className="text-xs space-y-1.5">
                {data?.anomalies && data.anomalies.length > 0 ? (
                  data.anomalies.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      {a}
                    </li>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No unusual spikes detected.</p>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card className="border-sky-500/20 bg-sky-500/5 h-full">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-sky-500">
                <Lightbulb className="w-3 h-3" />
                Savings Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ul className="text-xs space-y-1.5">
                {data?.opportunities?.map((o, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-sky-500">•</span>
                    {o}
                  </li>
                )) || <p className="text-muted-foreground italic">Generating tips...</p>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </SkeletonWrapper>
    </div>
  );
}
