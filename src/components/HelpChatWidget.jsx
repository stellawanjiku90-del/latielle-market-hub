import { useEffect, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2, Bot, User, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUPPORT_EMAIL = "realityofafrica2023@gmail.com";

const SUPPORT_INSTRUCTIONS = `You are the customer support assistant for LATIELLE MARKET HUB, a Kenyan marketplace for buying and selling established businesses across Kenya.

Answer questions about LATIELLE MARKET HUB using the facts below. Be direct, natural and useful. Do not use sales language, corporate buzzwords, emojis, fake testimonials, or vague claims. Do not invent fees, policies, listings, contact details, verification results, or business information. If the answer is not in the information provided, say that you do not have enough information and offer human support.

Platform facts:
- LATIELLE MARKET HUB helps people discover established businesses listed for sale across Kenya's 47 counties.
- The platform currently presents 10,000+ established listed businesses and 1,000,000+ buyers as the platform figures supplied by the business.
- Users can browse listings, search by business/category/location, view public listing information, and contact sellers through platform features where available.
- Sellers can create listings and provide business information, photos and supporting documents.
- Account registration uses a phone number and a 4-digit PIN. The current registration verification payment is KSh 100 through M-Pesa STK Push.
- M-Pesa payments are confirmed by the platform after Safaricom returns the transaction result.
- Buyers can request access to confidential business information where the listing and platform rules allow it.
- Human support is available at ${SUPPORT_EMAIL}.

If a customer asks for a human, tell them they can use the “Talk to a person” button in the chat. Do not send them away from the chat unless necessary.`;

const initialMessage = {
  role: "assistant",
  content: "Hi. How can I help you with LATIELLE MARKET HUB?",
};

export default function HelpChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [humanFormOpen, setHumanFormOpen] = useState(false);
  const [humanRequested, setHumanRequested] = useState(false);
  const [requestingHuman, setRequestingHuman] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    api.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      try {
        const user = await api.auth.me();
        setCurrentUser(user);
        setSupportName(user?.full_name || user?.name || "");
        setSupportEmail(user?.email || "");
      } catch {
        // Guest chat remains available even when authentication cannot be read.
      }
    });
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const history = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const response = await api.integrations.Core.InvokeLLM({
        instructions: SUPPORT_INSTRUCTIONS,
        input: history.slice(-12).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const answer = response?.answer || response?.output_text || "I couldn't answer that just now. You can use the Talk to a person option below.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I can't reach the support service right now. You can use “Talk to a person” below or email ${SUPPORT_EMAIL}.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openHumanForm = () => {
    setSupportMessage((current) => current || [...messages].reverse().find((m) => m.role === "user")?.content || "");
    setHumanFormOpen(true);
  };

  const requestHumanSupport = async () => {
    const email = supportEmail.trim();
    const name = supportName.trim();
    const message = supportMessage.trim() || "I would like to speak with a member of the LATIELLE MARKET HUB team.";

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    setRequestingHuman(true);
    try {
      const response = await api.request("/api/support/human-request", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          message,
          conversation: messages,
        }),
      });

      setHumanRequested(true);
      setHumanFormOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.emailSent
            ? "Your request has been sent to the LATIELLE MARKET HUB team. We will contact you at the email address you provided."
            : `Your request has been recorded. Please also email ${SUPPORT_EMAIL} because the notification service is temporarily unavailable.`,
        },
      ]);
      toast.success("Support request sent");
    } catch (error) {
      toast.error(error.message || "We could not send the support request.");
    } finally {
      setRequestingHuman(false);
    }
  };

  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 z-[9999] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <section
          aria-label="LATIELLE MARKET HUB support chat"
          className="fixed right-4 z-[9998] w-[calc(100vw-2rem)] sm:w-[390px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            bottom: "calc(9.5rem + env(safe-area-inset-bottom, 0px))",
            maxHeight: "min(600px, calc(100svh - 12rem))",
          }}
        >
          <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">LATIELLE Support</p>
              <p className="text-xs text-primary-foreground/80">Ask about the platform, listings or payments</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="p-1">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[250px] max-h-[360px]">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2.5 text-sm leading-6 whitespace-pre-line",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground border border-border rounded-tl-sm"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted border border-border rounded-2xl px-3 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!humanRequested && !humanFormOpen && (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={openHumanForm}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium py-2.5 transition-colors"
              >
                <PhoneCall className="h-4 w-4" />
                Talk to a person
              </button>
            </div>
          )}

          {humanFormOpen && !humanRequested && (
            <div className="border-t border-border p-3 space-y-2 bg-background">
              <p className="text-sm font-medium">Contact LATIELLE support</p>
              <input value={supportName} onChange={(e) => setSupportName(e.target.value)} placeholder="Your name" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="Email address" type="email" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="What do you need help with?" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setHumanFormOpen(false)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={requestHumanSupport} disabled={requestingHuman}>
                  {requestingHuman ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
                </Button>
              </div>
            </div>
          )}

          <div className="border-t border-border p-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question"
              disabled={loading}
              className="flex-1 min-w-0 h-10 text-base bg-background border border-input rounded-lg px-3 outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              aria-label="Chat message"
            />
            <Button type="button" size="icon" onClick={sendMessage} disabled={loading || !input.trim()} className="shrink-0 h-10 w-10" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
