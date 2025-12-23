import { useState, useRef, useEffect } from "react";
import { Send, User as UserIcon, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useChatStream } from "@/hooks/use-chat-stream"; // We'll implement this hook locally since the template didn't provide it in shared/routes
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Simple local type since we are building the chat experience
type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function CoachPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: `Hi ${user?.firstName || 'there'}! I'm your AI Swim Coach. I can analyze your recent swims, suggest drills for your stroke, or help you plan for an upcoming race. What can I help you with today?` 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Create conversation first (if needed) or just post message to a default conversation
      // For simplicity in this demo, we assume a single persistent conversation or create one on fly
      // We'll use the proper route: POST /api/conversations/:id/messages
      // But first we need a conversation ID. 
      // Simplified flow: Create conversation -> Send Message -> Stream response
      
      // 1. Get or Create conversation (mocked logic for simplicity, normally stored in context/url)
      let convId = 1; // Default ID for demo, real app would manage this better
      try {
        const res = await fetch('/api/conversations', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title: 'Coach Chat' })
        });
        if(res.ok) {
            const data = await res.json();
            convId = data.id;
        }
      } catch (err) {
        console.warn("Using default conversation ID");
      }

      // 2. Stream the response
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages(prev => {
                const newHistory = [...prev];
                const lastMsg = newHistory[newHistory.length - 1];
                if (lastMsg.role === "assistant") {
                    lastMsg.content += data.content;
                }
                return newHistory;
              });
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">AI Coach</h1>
        <p className="text-muted-foreground">Chat with your personalized swimming expert.</p>
      </div>

      <div className="flex-1 bg-card border border-border/50 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shrink-0 mt-1">
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`
                  max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed
                  ${m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted rounded-tl-none text-foreground"
                  }
                `}>
                  {m.content}
                </div>

                {m.role === "user" && (
                   <Avatar className="w-8 h-8 mt-1 border border-border">
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
               <div className="flex gap-3 justify-start">
                 <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shrink-0 mt-1">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-none p-4 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
               </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for training advice..."
              className="pr-12 py-6 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1 top-1 h-10 w-10 rounded-lg"
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
