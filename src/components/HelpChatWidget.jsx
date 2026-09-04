import { useEffect, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2, Bot, User, PhoneCall, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUPPORT_EMAIL = "realityofafrica2023@gmail.com";


const INITIAL_MESSAGE = {
  role: "assistant",
  content: "Hi. I’m here to help with listings, accounts, payments and using the marketplace. What would you like to know?",
};

const QUICK_QUESTIONS = [
  "How do I list a business?",
  "How does the KSh 100 payment work?",
  "How do I view business details?",
];

export default function HelpChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [humanFormOpen, setHumanFormOpen] = useState(false);
  const [humanRequested, setHumanRequested] = useState(false);
  const [requestingHuman, setRequestingHuman] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      try {
        const user = await api.auth.me();
        setSupportName(user?.full_name || user?.name || "");
        setSupportEmail(user?.email || "");
      } catch {
        // Guest support remains available.
      }
    });
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [messages, open]);

  const sendMessage = async (question = input) => {
    const text = String(question || "").trim();
    if (!text || loading) return;

    const history = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const response = await api.request("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          input: history.slice(-12).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const answer = response?.answer || response?.output_text || "I couldn’t answer that just now. You can use “Talk to a person” below.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      const message = error?.status === 429
        ? "There have been a few chat requests in a short time. Please wait a moment and try again."
        : error?.status === 503
          ? "LATIELLE Support is not connected right now. Please use “Talk to a person” below while the support connection is restored."
          : error?.status === 504
            ? "Support is taking longer than expected. Please try your question again."
            : `I can’t reach the support service right now. You can use “Talk to a person” below or email ${SUPPORT_EMAIL}.`;
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
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
        body: JSON.stringify({ name, email, message, conversation: messages }),
      });

      setHumanRequested(true);
      setHumanFormOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.emailSent
            ? "Thanks. Your message has been sent to the LATIELLE MARKET HUB team. We’ll contact you at the email address you provided."
            : `Your request has been recorded. The email notification is temporarily unavailable, so please also email ${SUPPORT_EMAIL}.`,
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
        className="help-chat-trigger fixed right-4 z-[9999] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_12px_30px_-8px_hsl(var(--navy)/0.55)] flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <section
          aria-label="LATIELLE MARKET HUB support chat"
          className="help-chat-panel fixed right-4 z-[9998] w-[calc(100vw-2rem)] sm:w-[400px] bg-card border border-border rounded-2xl shadow-[0_24px_70px_-24px_hsl(var(--navy)/0.5)] flex flex-col overflow-hidden"
        >
          <header className="bg-navy text-white px-4 py-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">LATIELLE Support</p>
              <p className="text-xs text-white/70 mt-0.5">Listings, accounts and payments</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[250px] max-h-[380px] bg-background">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-line",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card text-foreground border border-border rounded-tl-sm shadow-sm"
                )}>
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="ml-9 flex flex-wrap gap-2 pt-1">
                {QUICK_QUESTIONS.map((question) => (
                  <button key={question} type="button" onClick={() => sendMessage(question)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary/40 hover:text-primary transition-colors text-left">
                    {question}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Support is responding" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!humanRequested && !humanFormOpen && (
            <div className="px-3.5 pb-2.5 bg-background">
              <button type="button" onClick={openHumanForm} className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium py-2.5 transition-colors">
                <PhoneCall className="h-4 w-4" />
                Talk to a person
              </button>
            </div>
          )}

          {humanFormOpen && !humanRequested && (
            <div className="border-t border-border p-3.5 space-y-2.5 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Contact the team</p>
                  <p className="text-xs text-muted-foreground mt-0.5">We’ll use your email to reply.</p>
                </div>
                <button type="button" onClick={() => setHumanFormOpen(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
              <input value={supportName} onChange={(e) => setSupportName(e.target.value)} placeholder="Your name" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="Email address" type="email" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="What do you need help with?" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-ring" />
              <Button type="button" className="w-full" onClick={requestHumanSupport} disabled={requestingHuman}>
                {requestingHuman ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send request <ArrowUpRight className="ml-1.5 h-4 w-4" /></>}
              </Button>
            </div>
          )}

          <div className="border-t border-border p-3 bg-card flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question…"
              disabled={loading}
              className="flex-1 min-w-0 h-10 text-base bg-background border border-input rounded-lg px-3 outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              aria-label="Chat message"
            />
            <Button type="button" size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="shrink-0 h-10 w-10" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
