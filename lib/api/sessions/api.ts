import type { SessionListItem, SessionDetail } from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error((data as { error?: string }).error ?? response.statusText);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return data as T;
}

export async function getSessions(): Promise<SessionListItem[]> {
  const data = await fetchJson<{ sessions?: SessionListItem[]; error?: string }>("/api/sessions");
  if (!data.sessions) {
    throw new Error(data.error ?? "Unable to load sessions.");
  }
  return data.sessions;
}

export async function getSession(id: string): Promise<SessionDetail> {
  const data = await fetchJson<{ session?: SessionDetail; error?: string }>(`/api/sessions/${id}`);
  if (!data.session) {
    throw new Error(data.error ?? "Unable to load session.");
  }
  return data.session;
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}

export type { SessionListItem, MessageRecord, SessionDetail } from "./types";
