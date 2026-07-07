import { fetchJson } from "@/shared/api";
import type { ListSessionsResponse, SessionDetailResponse, SendMessageResponse, CreateSessionBody, SendMessageBody } from "./types";

export async function getContentSessions(talentId: string): Promise<ListSessionsResponse> {
  return fetchJson<ListSessionsResponse>(`/api/talents/${encodeURIComponent(talentId)}/content/sessions`);
}

export async function createContentSession(talentId: string, body: CreateSessionBody | FormData): Promise<{ session: { id: string } }> {
  if (body instanceof FormData) {
    return fetchJson<{ session: { id: string } }>(`/api/talents/${encodeURIComponent(talentId)}/content/sessions`, {
      method: "POST",
      body,
    });
  }
  return fetchJson<{ session: { id: string } }>(`/api/talents/${encodeURIComponent(talentId)}/content/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getContentSession(talentId: string, sessionId: string): Promise<SessionDetailResponse> {
  return fetchJson<SessionDetailResponse>(
    `/api/talents/${encodeURIComponent(talentId)}/content/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export async function deleteContentSession(talentId: string, sessionId: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(
    `/api/talents/${encodeURIComponent(talentId)}/content/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}

export async function sendMessage(talentId: string, sessionId: string, payload: SendMessageBody | FormData): Promise<SendMessageResponse> {
  if (payload instanceof FormData) {
    return fetchJson<SendMessageResponse>(
      `/api/talents/${encodeURIComponent(talentId)}/content/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: "POST",
        body: payload,
      },
    );
  }
  return fetchJson<SendMessageResponse>(
    `/api/talents/${encodeURIComponent(talentId)}/content/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
