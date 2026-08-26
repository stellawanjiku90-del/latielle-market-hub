import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * When the device goes offline, replace the entire app with a clean,
 * human "You're offline" screen so no broken pages, spinners, or
 * platform error states are shown. Restores automatically on reconnect.
 */
export default function OfflineGate({ children }) {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
          You're offline
        </h1>
        <p className="text-muted-foreground font-body text-sm leading-relaxed mb-6">
          We can't reach the internet right now. Check your connection —
          LATIELLE MARKET HUB will come back automatically the moment you're reconnected.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium font-body hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}