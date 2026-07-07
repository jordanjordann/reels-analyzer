const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function formatViews(count: number | null) {
  if (count == null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

export function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500/90 text-white";
  if (score >= 60) return "bg-yellow-500/90 text-white";
  if (score >= 40) return "bg-orange-500/90 text-white";
  return "bg-red-500/90 text-white";
}
