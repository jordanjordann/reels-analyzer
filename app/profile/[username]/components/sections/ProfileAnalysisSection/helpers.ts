export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function scoreRing(score: number): string {
  if (score >= 80) return "stroke-green-400";
  if (score >= 60) return "stroke-yellow-400";
  if (score >= 40) return "stroke-orange-400";
  return "stroke-red-400";
}

export function qualityBar(score: number) {
  const pct = score * 10;
  const color =
    pct >= 80
      ? "bg-green-400"
      : pct >= 60
        ? "bg-yellow-400"
        : pct >= 40
          ? "bg-orange-400"
          : "bg-red-400";
  return { pct, color };
}

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const then = new Date(normalized).getTime();
  if (isNaN(then)) return "just now";
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
