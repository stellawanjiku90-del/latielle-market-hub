import { useEffect } from "react";
import { api } from "@/api/apiClient";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/**
 * Push notifications are managed automatically. There is no enable/disable
 * control: once browser permission is granted, the subscription is kept and
 * re-synced with the logged-in buyer account whenever this component mounts.
 */
export default function PushNotificationSetup() {
  useEffect(() => {
    let cancelled = false;

    const registerPush = async () => {
      if (cancelled) return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        if (cancelled) return;

        // If permission has already been granted, silently subscribe/re-sync.
        let permission = Notification.permission;
        if (permission === "default") {
          // Browsers may require a user gesture for this prompt. If they reject
          // an automatic request, leave it alone and retry on a later visit.
          try {
            permission = await Notification.requestPermission();
          } catch {
            return;
          }
        }
        if (permission !== "granted" || cancelled) return;

        const { publicKey } = await api.request("/api/push/public-key");
        if (!publicKey || cancelled) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        if (cancelled) return;
        await api.request("/api/push/subscribe", {
          method: "POST",
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch (error) {
        // Push is best-effort. Do not interrupt the buyer experience if a
        // browser/device does not support automatic permission/subscription.
        console.warn("Automatic push registration unavailable:", error?.message || error);
      }
    };

    registerPush();
    return () => { cancelled = true; };
  }, []);

  return null;
}
