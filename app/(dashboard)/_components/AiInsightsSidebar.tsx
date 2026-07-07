"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, ExternalLink } from "lucide-react";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

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
      // If we are in refreshing state, add the refresh param
      const url = isRefreshing ? "/api/ai/insights?refresh=true" : "/api/ai/insights";
      const res = await fetch(url);
      if (!res.ok) {
        let errorMsg = "Failed to fetch insights";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = await res.text() || errorMsg;
        }
        throw new Error(errorMsg);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const toastId = toast.loading("Refreshing insights...");
    
    try {
      // Step 1: Force backend refresh
      const res = await fetch("/api/ai/insights?refresh=true");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "AI service is currently busy.");
      }
      
      // Step 2: Refetch to update local state
      await insightsQuery.refetch();
      toast.success("Insights updated!", { id: toastId });
    } catch (err: any) {
      console.error("Refresh error:", err);
      toast.error(err.message || "Failed to refresh", { 
        id: toastId,
        action: { label: "LLM Page", onClick: () => window.location.href = "/ai-settings" }
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const data = insightsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Intelligence</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={insightsQuery.isLoading || isRefreshing}
          className="gap-2 text-xs h-8 border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500 transition-all duration-300"
        >
          <RefreshCw className={isRefreshing ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
          Update Insights
        </Button>
      </div>

      <SkeletonWrapper isLoading={insightsQuery.isLoading && !isRefreshing}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Summary */}
          <Card className="border-amber-500/20 bg-amber-500/5 h-full relative overflow-hidden">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[13px] text-muted-foreground leading-snug px-4 pb-4">
              {insightsQuery.error ? (
                <div className="space-y-2">
                  <p className="text-rose-500 font-medium">
                    {(insightsQuery.error as any)?.message || "Service error"}
                  </p>
                  <Link 
                    href="/ai-settings" 
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Go to LLM Settings <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                typeof data?.summary === "string" ? data.summary : "Analyzing your spending patterns..."
              )}
            </CardContent>
          </Card>

          {/* Anomalies */}
          <Card className="border-rose-500/20 bg-rose-500/5 h-full">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {data?.anomalies && Array.isArray(data.anomalies) && data.anomalies.length > 0 ? (
                  data.anomalies.map((anomaly, i) => (
                    <div key={i} className="flex gap-2 items-start group">
                      <div className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-tight group-hover:text-rose-600 transition-colors">
                        {typeof anomaly === "string" ? anomaly : JSON.stringify(anomaly)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No unusual activity detected.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card className="border-sky-500/20 bg-sky-500/5 h-full">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Lightbulb className="w-3 h-3 text-sky-500" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {data?.opportunities && Array.isArray(data.opportunities) && data.opportunities.length > 0 ? (
                  data.opportunities.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-start group">
                      <div className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-tight group-hover:text-sky-600 transition-colors">
                        {typeof opt === "string" ? opt : JSON.stringify(opt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">Efficiency is currently optimal.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SkeletonWrapper>
    </div>
  );
}
