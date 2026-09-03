import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineGate({ children }) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

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

  return (
    <>
      {!online && (
        <div className="sticky top-0 z-[10000] flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-sm text-background">
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Saved pages remain available; payments, chat and account changes need a connection.</span>
        </div>
      )}
      {children}
    </>
  );
}
