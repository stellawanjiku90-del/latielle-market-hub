import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "../hooks/usePullToRefresh";

/**
 * Wraps a page with pull-to-refresh behaviour.
 * Usage: <PullToRefreshWrapper onRefresh={asyncFn} className="...">...</PullToRefreshWrapper>
 */
export default function PullToRefreshWrapper({ onRefresh, children, className = "" }) {
  const { pullY, isPulling, isRefreshing, PULL_THRESHOLD, handlers } = usePullToRefresh(onRefresh);

  return (
    <div className={className} {...handlers}>
      {(isPulling || isRefreshing) && (
        <div
          className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-all"
          style={{ height: isRefreshing ? 44 : Math.max(0, pullY), opacity: isRefreshing ? 1 : pullY / PULL_THRESHOLD }}
        >
          <div className={`flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 shadow-sm text-sm font-body text-muted-foreground ${isRefreshing ? "animate-pulse" : ""}`}>
            <RefreshCw className={`h-4 w-4 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}