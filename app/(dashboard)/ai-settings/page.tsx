"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Sparkles,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiProvider, PROVIDER_LABELS, PROVIDER_DESCRIPTIONS, PROVIDER_ICONS } from "@/lib/ai-provider-constants";

const PROVIDERS: { id: AiProvider; docsUrl: string }[] = [
  { id: "gemini",     docsUrl: "https://aistudio.google.com/app/apikey" },
  { id: "groq",       docsUrl: "https://console.groq.com/keys" },
  { id: "openrouter", docsUrl: "https://openrouter.ai/keys" },
  { id: "anthropic",  docsUrl: "https://console.anthropic.com/keys" },
  { id: "openai",     docsUrl: "https://platform.openai.com/api-keys" },
];

interface ConfigData {
  configured: boolean;
  provider: AiProvider | null;
  maskedKey: string | null;
  updatedAt?: string;
}

export default function AiSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: config, isLoading } = useQuery<ConfigData>({
    queryKey: ["ai-config"],
    queryFn: () => fetch("/api/ai/config").then((r) => r.json()),
  });

  // Pre-select configured provider
  useEffect(() => {
    if (config?.provider) setSelectedProvider(config.provider);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("API key validated and saved successfully!");
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch("/api/ai/config", { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Configuration removed. Using server default.");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Settings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect your own AI provider API key for personalized insights
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-6 py-8 space-y-8">

        {/* Current Status */}
        <Card className={cn(
          "border transition-colors",
          config?.configured
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        )}>
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center",
                config?.configured ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}>
                {config?.configured
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <Shield className="h-5 w-5 text-amber-500" />}
              </div>
              <div>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading configuration...</p>
                ) : config?.configured ? (
                  <>
                    <p className="text-sm font-semibold">
                      Active: {PROVIDER_ICONS[config.provider!]} {PROVIDER_LABELS[config.provider!]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Key: {config.maskedKey} · Updated {config.updatedAt ? new Date(config.updatedAt).toLocaleDateString() : "recently"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Using Server Default (Gemini)</p>
                    <p className="text-xs text-muted-foreground">Add your own key below to use your preferred AI provider</p>
                  </>
                )}
              </div>
            </div>
            {config?.configured && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="ml-2">Remove</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Provider Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            Choose Your AI Provider
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map(({ id, docsUrl }) => (
              <button
                key={id}
                onClick={() => setSelectedProvider(id)}
                className={cn(
                  "relative text-left p-4 rounded-xl border-2 transition-all duration-200 hover:border-indigo-500/50",
                  selectedProvider === id
                    ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                    : "border-border bg-card hover:bg-accent/50"
                )}
              >
                {selectedProvider === id && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                  </div>
                )}
                <div className="text-2xl mb-2">{PROVIDER_ICONS[id]}</div>
                <div className="font-semibold text-sm">{PROVIDER_LABELS[id]}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{PROVIDER_DESCRIPTIONS[id]}</div>
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 mt-2 hover:underline"
                >
                  Get API Key <ExternalLink className="h-3 w-3" />
                </a>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* API Key Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {PROVIDER_ICONS[selectedProvider]} Enter {PROVIDER_LABELS[selectedProvider]} API Key
            </CardTitle>
            <CardDescription>
              Your key is encrypted with AES-256 before being stored. It is never sent to the browser after saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="Paste your API key here..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!apiKey.trim() || saveMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating key...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Test & Save Key
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We make a small test call to validate your key before saving. This uses minimal tokens.
            </p>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <Shield className="h-5 w-5 text-emerald-500 mb-2" />
              <p className="text-xs font-semibold">Encrypted Storage</p>
              <p className="text-xs text-muted-foreground mt-1">Keys are encrypted with AES-256-GCM before storage</p>
            </CardContent>
          </Card>
          <Card className="bg-sky-500/5 border-sky-500/20">
            <CardContent className="p-4">
              <KeyRound className="h-5 w-5 text-sky-500 mb-2" />
              <p className="text-xs font-semibold">Your Key, Your Control</p>
              <p className="text-xs text-muted-foreground mt-1">Remove your key at any time to revert to the default</p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-500/5 border-indigo-500/20">
            <CardContent className="p-4">
              <Sparkles className="h-5 w-5 text-indigo-500 mb-2" />
              <p className="text-xs font-semibold">Instant Switch</p>
              <p className="text-xs text-muted-foreground mt-1">Change provider at any time — AI insights update immediately</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
