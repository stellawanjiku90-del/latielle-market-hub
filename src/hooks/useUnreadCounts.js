import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Returns a map of { [conversationId]: unreadCount } for the current user,
// counting messages that were NOT sent by me and are not yet read.
// Stays live via ChatMessage subscriptions.
export default function useUnreadCounts(conversations, currentUserEmail) {
  const [unread, setUnread] = useState({});

  const recompute = useCallback(async () => {
    if (!currentUserEmail || !conversations?.length) {
      setUnread({});
      return;
    }
    const entries = await Promise.all(
      conversations.map(async (conv) => {
        const msgs = await base44.entities.ChatMessage.filter(
          { conversation_id: conv.id, is_read: false },
          "-created_date",
          100
        );
        const count = msgs.filter((m) => m.sender_email !== currentUserEmail && !m.is_deleted).length;
        return [conv.id, count];
      })
    );
    setUnread(Object.fromEntries(entries));
  }, [conversations, currentUserEmail]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    if (!currentUserEmail) return;
    const convIds = new Set((conversations || []).map((c) => c.id));
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      const rec = event.data;
      if (!rec || !convIds.has(rec.conversation_id)) return;
      recompute();
    });
    return () => unsub();
  }, [conversations, currentUserEmail, recompute]);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  return { unread, totalUnread };
}