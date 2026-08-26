import { useState, useRef, useCallback } from "react";

const PULL_THRESHOLD = 72;

/**
 * usePullToRefresh(onRefresh)
 * Returns { pullY, isPulling, isRefreshing, handlers }
 * Spread `handlers` onto the scrollable container div.
 */
export function usePullToRefresh(onRefresh) {
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);

  const trigger = useCallback(async () => {
    setIsRefreshing(true);
    setPullY(0);
    setIsPulling(false);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && window.scrollY === 0) {
      setIsPulling(true);
      setPullY(Math.min(delta * 0.45, PULL_THRESHOLD + 20));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullY >= PULL_THRESHOLD) {
      trigger();
    } else {
      setPullY(0);
      setIsPulling(false);
    }
    touchStartY.current = null;
  }, [pullY, trigger]);

  return {
    pullY,
    isPulling,
    isRefreshing,
    PULL_THRESHOLD,
    handlers: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
  };
}