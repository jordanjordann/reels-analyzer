type AuthStatus = {
  pinConfigured: boolean;
  authenticated: boolean;
};

type SessionListItem = {
  id: string;
  username: string;
  title: string | null;
  lastPromptPreview: string | null;
  updatedAt: string;
};

type MessageRecord = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  rawGemini: string | null;
  createdAt: string;
};

type SessionDetail = {
  id: string;
  username: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: MessageRecord[];
};

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

export async function getAuthStatus(): Promise<AuthStatus> {
  return fetchJson<AuthStatus>("/api/auth/status");
}

export async function submitPin(pin: string, pinConfigured: boolean): Promise<{ ok: boolean }> {
  const endpoint = pinConfigured ? "/api/auth/verify" : "/api/auth/setup";
  return fetchJson<{ ok: boolean }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
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

export type { AuthStatus, SessionListItem, MessageRecord, SessionDetail };
