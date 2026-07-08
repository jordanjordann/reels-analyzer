import type { ContentSessionSummary } from "@/api/talents/content/types";

export function formatSessionPreview(session: ContentSessionSummary): string {
  if (session.lastMessagePreview) {
    return session.lastMessagePreview;
  }
  return "New session";
}

export function formatSessionTime(dateStr: string): string {
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
