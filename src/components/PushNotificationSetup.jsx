import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/api/apiClient";
import { toast } from "sonner";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationSetup() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setSupported(false);
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setSupported(true);
          setEnabled(Boolean(subscription));
        }
      } catch {
        if (!cancelled) setSupported(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!supported) throw new Error("Push notifications are not supported by this browser.");
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");

      const { publicKey } = await api.request("/api/push/public-key");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await api.request("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setEnabled(true);
      toast.success("Push notifications enabled.");
    } catch (error) {
      toast.error(error?.message || "Could not enable push notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.request("/api/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Push notifications disabled.");
    } catch {
      toast.error("Could not disable push notifications.");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {enabled ? <BellRing className="h-5 w-5 text-primary mt-0.5 shrink-0" /> : <Bell className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
        <div>
          <p className="text-sm font-semibold">Push notifications</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled
              ? "You'll receive alerts when new businesses are posted and when businesses are marked sold."
              : "Enable alerts for new businesses and sold-business updates."}
          </p>
        </div>
      </div>
      <Button size="sm" variant={enabled ? "outline" : "default"} onClick={enabled ? disable : enable} disabled={busy} className="font-body shrink-0">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? "Disable" : "Enable notifications"}
      </Button>
    </div>
  );
}
