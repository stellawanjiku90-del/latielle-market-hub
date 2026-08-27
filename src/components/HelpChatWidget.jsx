import { useState, useEffect, useRef } from "react";
import { api, apiFunction } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2, Bot, User, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SYSTEM_CONTEXT = `You are a helpful support assistant for LATIELLE MARKET HUB — Kenya's trusted marketplace for buying and selling verified businesses. 

You help users with:
- How to list a business for sale
- How to browse and buy businesses
- How payments work (M-Pesa, listing fees, detail request fees)
- How verification works (seller verification, document review)
- How the KES 1,000 confidential details request works
- General questions about the platform

Keep answers concise and practical. If the user has a complex issue that needs human help, acknowledge it and tell them to email realityofafrica2023@gmail.com or use the contact form. Always be friendly and professional.`;

export default function HelpChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! 👋 I'm the LATIELLE MARKET HUB support assistant. How can I help you today?\n\nI can answer questions about listing a business, buying, payments, or verification." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wantsHuman, setWantsHuman] = useState(false);
  const [requestingHuman, setRequestingHuman] = useState(false);
  const [humanRequested, setHumanRequested] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.auth.isAuthenticated().then(async (authed) => {
      if (authed) setCurrentUser(await api.auth.me());
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    // Check if user wants human support
    const humanKeywords = ["human", "agent", "person", "talk to someone", "real person", "contact", "call me", "escalate"];
    if (humanKeywords.some(k => text.toLowerCase().includes(k))) {
      setWantsHuman(true);
      setMessages([...newMessages, {
        role: "assistant",
        content: "I understand you'd like to speak with a human agent. 👤\n\nPlease email us at **realityofafrica2023@gmail.com** and our team will get back to you within 48 hours.\n\nIs there anything else I can help you with in the meantime?"
      }]);
      setLoading(false);
      return;
    }

    const conversationHistory = newMessages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

    const response = await api.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_CONTEXT}\n\nConversation so far:\n${conversationHistory}\n\nRespond helpfully and concisely as the support assistant.`,
    });

    setMessages([...newMessages, { role: "assistant", content: response }]);

    // Save first user message as an AI chat support request
    if (newMessages.filter(m => m.role === "user").length === 1 && currentUser?.email) {
      api.asServiceRole.entities.SupportRequest.create({
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        message: text,
        type: "ai_chat",
        status: "open",
      }).catch(() => {});
    }

    setLoading(false);
  };

  const requestHumanChat = async () => {
    if (humanRequested) return;
    if (!currentUser) { api.auth.redirectToLogin(); return; }
    setRequestingHuman(true);

    // Get the last user message as context
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");

    try {
      // Save to SupportRequest entity for admin visibility
      const conversationSummary = messages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join(" | ");
      await api.asServiceRole.entities.SupportRequest.create({
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        message: lastUserMsg?.content || "User requested direct chat",
        conversation_summary: conversationSummary,
        type: "human_request",
        status: "open",
      });

      // Create a support conversation so admin can reply directly
      const conv = await api.entities.Conversation.create({
        type: "support",
        buyer_email: currentUser.email,
        listing_title: "Support Chat Request",
        status: "active",
        last_message: lastUserMsg?.content || "User requested direct chat",
        last_message_at: new Date().toISOString(),
      });

      // Send initial message into the conversation
      await api.entities.ChatMessage.create({
        conversation_id: conv.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        sender_role: "buyer",
        content: lastUserMsg?.content || "Hi, I'd like to speak with the LATIELLE team directly.",
        is_read: false,
      });

      // Notify admin via email
      await apiFunction("notifyAdminSupportRequest", {
        user_name: currentUser.full_name || "",
        user_email: currentUser.email,
        message: lastUserMsg?.content || "",
        conversation_id: conv.id,
      });

      setHumanRequested(true);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ Your chat request has been sent to the LATIELLE team!\n\nIf we're online, we'll join the chat shortly. If not, we'll reach out to you at **${currentUser.email}** as soon as possible.\n\nYou can also track your conversation in your Dashboard → Messages tab.`,
      }]);
      toast.success("Chat request sent to LATIELLE support!");
    } catch (err) {
      toast.error("Failed to send request. Please try again.");
    } finally {
      setRequestingHuman(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button — above bottom nav, respects safe area */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-4 z-[9999] h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Help Chat"
      >
        {open ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed right-4 z-[9998] w-[calc(100vw-2rem)] sm:w-[380px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            bottom: "calc(9.5rem + env(safe-area-inset-bottom, 0px))",
            maxHeight: "min(520px, calc(100svh - 12rem))",
          }}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold font-heading">LATIELLE Support</p>
              <p className="text-[10px] opacity-80">AI Assistant · Usually instant</p>
            </div>
            <button onClick={() => setOpen(false)}><X className="h-4 w-4 opacity-70 hover:opacity-100" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: "280px", maxHeight: "340px" }}>
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm font-body leading-relaxed whitespace-pre-line",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                )}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Human chat request button */}
          {!humanRequested && (
            <div className="px-3 pb-2">
              <button
                onClick={requestHumanChat}
                disabled={requestingHuman}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold py-2.5 transition-all",
                  requestingHuman && "opacity-60 cursor-not-allowed"
                )}
              >
                {requestingHuman ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PhoneCall className="h-3.5 w-3.5" />
                )}
                {requestingHuman ? "Sending request…" : "Request LATIELLE to chat with me"}
              </button>
            </div>
          )}
          {humanRequested && (
            <div className="px-3 pb-2">
              <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-medium py-2 opacity-70">
                ✅ Chat request sent — we'll reach out soon!
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question..."
              className="flex-1 text-sm font-body bg-background border border-input rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()} className="shrink-0 h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}