"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import ReactMarkdown from 'react-markdown'

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI budget assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to get response";
        const status = response.status;
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = await response.text() || errorMsg;
        }

        if (status === 429) {
          toast.error("Rate limit reached. Try another provider in LLM settings.", {
            action: { label: "LLM Page", onClick: () => window.location.href = "/ai-settings" }
          });
        }
        
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      setMessages((prev) => [...prev, data]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      
      let finalContent = "Sorry, I had trouble processing that. Please try again.";
      if (errorMessage.includes("API Key") || errorMessage.includes("quota") || errorMessage.includes("limit")) {
        finalContent = `⚠️ **Provider Error**: ${errorMessage}\n\nYou can update your configuration in the [LLM Settings](/ai-settings) page.`;
      } else if (errorMessage.includes("overloaded")) {
        finalContent = "⚠️ **Service Busy**: The AI is currently overloaded. Please wait a minute and try again.";
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: finalContent },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white p-0"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-[350px] md:w-[400px] h-[500px] flex flex-col shadow-2xl border-indigo-500/20">
          <CardHeader className="p-4 bg-indigo-600 text-white rounded-t-lg flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Budget Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 text-white hover:bg-indigo-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-grow overflow-hidden p-0 text-sm">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3 text-sm max-w-[85%]",
                      m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      m.role === "user" ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                    )}>
                      {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl overflow-hidden",
                      m.role === "user" 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-zinc-100 text-zinc-800 rounded-tl-none"
                    )}>
                      <ReactMarkdown 
                        components={{
                          ul: ({...props}) => <ul className="list-disc ml-4 mt-2" {...props} />,
                          p: ({...props}) => <p className="leading-tight" {...props} />,
                          strong: ({...props}) => <strong className="font-black" {...props} />,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 text-sm mr-auto">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-zinc-100 p-3 rounded-2xl rounded-tl-none">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex w-full items-center space-x-2"
            >
              <Input
                placeholder="Ask me something..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                className="flex-grow"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
