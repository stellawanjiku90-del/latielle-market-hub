import { Eye } from "lucide-react";

export function formatViews(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}K`;
  return `${num}`;
}

export default function ViewCount({ count = 0, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground ${className}`}>
      <Eye className="h-3.5 w-3.5" />
      {formatViews(count)}
    </span>
  );
}