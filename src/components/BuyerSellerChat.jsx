import { useState, useEffect, useRef } from "react";
import { api, apiFunction } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageSquare, X, Paperclip, Trash2, AlertTriangle, Ban, ShieldCheck, FileIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

export default function BuyerSellerChat({ conversationId, currentUserEmail, currentUserName, currentUserRole, listingTitle, otherPartyEmail, onClose }) {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const isAdmin = currentUserRole === "admin";
  const isBlocked = conversation?.status === "closed";

  useEffect(() => {
    loadConversation();
    loadMessages();
    const interval = setInterval(() => { loadMessages(); loadConversation(); }, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async () => {
    const conv = await api.entities.Conversation.get(conversationId).catch(() => null);
    if (conv) setConversation(conv);
  };

  const loadMessages = async () => {
    const msgs = await api.entities.ChatMessage.filter({ conversation_id: conversationId }, "created_date", 100);
    setMessages(prev => {
      const optimistic = prev.filter(m => m._optimistic);
      const optimisticNotYetConfirmed = optimistic.filter(
        o => !msgs.some(c => c.content === o.content && c.sender_email === o.sender_email)
      );
      return [...msgs, ...optimisticNotYetConfirmed];
    });
    setLoading(false);
    msgs.filter(m => !m.is_read && m.sender_email !== currentUserEmail).forEach(m => {
      api.entities.ChatMessage.update(m.id, { is_read: true }).catch(() => {});
    });
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setAttachments(prev => [...prev, ...urls]);
    } catch {
      toast.error("Failed to upload file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || sending) return;
    setSending(true);
    setInput("");
    const sentAttachments = attachments;
    setAttachments([]);

    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      _optimistic: true,
      conversation_id: conversationId,
      sender_email: currentUserEmail,
      sender_name: currentUserName || currentUserEmail,
      sender_role: currentUserRole,
      content: text,
      attachments: sentAttachments,
      is_read: false,
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await api.entities.ChatMessage.create({
        conversation_id: conversationId,
        sender_email: currentUserEmail,
        sender_name: currentUserName || currentUserEmail,
        sender_role: currentUserRole,
        content: text,
        attachments: sentAttachments,
        is_read: false,
      });
      await api.entities.Conversation.update(conversationId, {
        last_message: (text || `📎 ${sentAttachments.length} attachment(s)`).slice(0, 80),
        last_message_at: new Date().toISOString(),
      });
      // Notify the other party (buyer/seller chats only)
      if (!isAdmin && otherPartyEmail) {
        apiFunction('createNotification', {
          recipient: otherPartyEmail,
          type: "new_message",
          title: `New message — ${listingTitle || "Business Chat"}`,
          body: text ? text.slice(0, 120) : "Sent an attachment",
          conversationId,
        }).catch(() => {});
      }
      await loadMessages();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error("Failed to send message. Please try again.");
      setInput(text);
      setAttachments(sentAttachments);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ---- Admin moderation ----
  const deleteMessage = async (msg) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_deleted: true } : m));
    await api.entities.ChatMessage.update(msg.id, { is_deleted: true }).catch(() => toast.error("Failed to remove message."));
    toast.success("Message removed");
  };

  const warnUser = async (msg) => {
    if (!msg.sender_email) return;
    await apiFunction('createNotification', {
      recipient: msg.sender_email,
      type: "warning",
      title: "⚠️ Warning from Admin",
      body: "An administrator flagged one of your messages. Please keep the conversation respectful and within our guidelines.",
      conversationId,
    }).catch(() => toast.error("Failed to send warning."));
    toast.success(`Warning issued to ${msg.sender_name || msg.sender_email}`);
  };

  const toggleBlock = async () => {
    const newStatus = isBlocked ? "active" : "closed";
    setConversation(prev => ({ ...prev, status: newStatus }));
    await api.entities.Conversation.update(conversationId, { status: newStatus }).catch(() => toast.error("Failed to update conversation."));
    toast.success(newStatus === "closed" ? "Conversation blocked" : "Conversation re-enabled");
  };

  const canType = !isBlocked || isAdmin;

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card" style={{ height: "460px" }}>
      {/* Header */}
      <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold font-heading truncate max-w-[180px]">{listingTitle || "Business Chat"}</p>
            <p className="text-[10px] text-muted-foreground">{isBlocked ? "Conversation blocked" : "Secure buyer-seller conversation"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant={isBlocked ? "default" : "outline"} className="h-7 text-xs gap-1" onClick={toggleBlock}>
              {isBlocked ? <ShieldCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
              {isBlocked ? "Re-enable" : "Block"}
            </Button>
          )}
          {onClose && <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground font-body">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_email === currentUserEmail;
            if (msg.is_deleted) {
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className="rounded-2xl px-3 py-2 text-xs italic text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                    <Trash2 className="h-3 w-3" /> Message removed by admin
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className={cn("flex gap-2 group", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] space-y-0.5", isMe && "items-end flex flex-col")}>
                  {!isMe && <p className="text-[10px] text-muted-foreground px-1 font-body">{msg.sender_name || msg.sender_email}</p>}
                  <div className={cn(
                    "rounded-2xl px-3 py-2 text-sm font-body leading-relaxed transition-opacity space-y-2",
                    isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm",
                    msg._optimistic && "opacity-60"
                  )}>
                    {msg.content && <p className="whitespace-pre-line">{msg.content}</p>}
                    {(msg.attachments || []).map((url, i) => (
                      isImage(url) ? (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url} alt="attachment" className="rounded-lg max-h-44 object-cover border border-black/10" />
                        </a>
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-1.5 text-xs underline", isMe ? "text-primary-foreground" : "text-primary")}>
                          <FileIcon className="h-3.5 w-3.5" />{url.split("/").pop()?.slice(0, 28) || "Attachment"}
                        </a>
                      )
                    ))}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <p className="text-[9px] text-muted-foreground">
                      {msg._optimistic ? "Sending…" : msg.created_date ? format(new Date(msg.created_date), "MMM d, h:mm a") : ""}
                    </p>
                    {isAdmin && !msg._optimistic && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteMessage(msg)} className="text-[9px] text-destructive flex items-center gap-0.5 hover:underline"><Trash2 className="h-2.5 w-2.5" />Delete</button>
                        <button onClick={() => warnUser(msg)} className="text-[9px] text-amber-600 flex items-center gap-0.5 hover:underline"><AlertTriangle className="h-2.5 w-2.5" />Warn</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="border-t border-border px-3 py-2 flex flex-wrap gap-2">
          {attachments.map((url, i) => (
            <div key={i} className="relative">
              {isImage(url) ? (
                <img src={url} alt="" className="h-12 w-12 object-cover rounded border border-border" />
              ) : (
                <div className="h-12 w-12 flex items-center justify-center bg-muted rounded border border-border"><FileIcon className="h-5 w-5 text-muted-foreground" /></div>
              )}
              <button onClick={() => setAttachments(prev => prev.filter(u => u !== url))} className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-white rounded-full flex items-center justify-center">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {canType ? (
        <div className="border-t border-border p-3 flex gap-2 items-end">
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Button size="icon" variant="outline" className="shrink-0 h-9 w-9" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 text-sm font-body bg-background border border-input rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring resize-none"
            style={{ fontSize: "16px", maxHeight: "96px", overflowY: "auto" }}
          />
          <Button size="icon" onClick={sendMessage} disabled={sending || (!input.trim() && attachments.length === 0)} className="shrink-0 h-9 w-9">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <div className="border-t border-border p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30">
          <Lock className="h-3.5 w-3.5" /> This conversation has been blocked by an administrator.
        </div>
      )}
    </div>
  );
}