import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Loads notifications for the current recipient, keeps them live via subscription,
// and pops a toast when a brand-new unread notification arrives.
export default function useNotifications(recipient) {
  const [notifications, setNotifications] = useState([]);
  const seenIds = useRef(new Set());
  const initialized = useRef(false);

  const load = useCallback(async () => {
    if (!recipient) return;
    const list = await base44.entities.Notification.filter({ recipient }, "-created_date", 50);
    list.forEach((n) => seenIds.current.add(n.id));
    initialized.current = true;
    setNotifications(list);
  }, [recipient]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!recipient) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.recipient !== recipient) return;

      if (event.type === "delete") {
        setNotifications((prev) => prev.filter((n) => n.id !== event.id));
        return;
      }

      // Toast only for genuinely new notifications (not the initial load)
      if (event.type === "create" && initialized.current && !seenIds.current.has(rec.id)) {
        toast(rec.title, { description: rec.body });
      }
      seenIds.current.add(rec.id);

      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === rec.id);
        if (exists) return prev.map((n) => (n.id === rec.id ? rec : n));
        return [rec, ...prev];
      });
    });
    return () => unsub();
  }, [recipient]);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.is_read);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {})));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return { notifications, unreadCount, markAllRead, reload: load };
}