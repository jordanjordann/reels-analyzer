import { fetchJson } from "@/shared/api";
import type { ListSessionsResponse, SessionDetailResponse, SendMessageResponse, CreateSessionBody, SendMessageBody, ContentMessage, ContentMemory } from "./types";

type SendMessageStreamHandlers = {
  onUserMessage?: (message: ContentMessage) => void;
  onChunk?: (chunk: string) => void;
  onDone?: (response: SendMessageResponse) => void;
  onError?: (error: string) => void;
};

function parseSseEvent(eventText: string): { event: string; data: unknown } | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of eventText.split("\n")) {
    if (line.startsWith("event: ")) {
      event = line.slice("event: ".length);
    }
    if (line.startsWith("data: ")) {
      dataLines.push(line.slice("data: ".length));
    }
  }

  if (dataLines.length === 0) return null;

  return {
    event,
    data: JSON.parse(dataLines.join("\n")),
  };
}

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

export async function sendMessageStream(
  talentId: string,
  sessionId: string,
  payload: SendMessageBody | FormData,
  handlers: SendMessageStreamHandlers = {},
): Promise<SendMessageResponse> {
  const url = `/api/talents/${encodeURIComponent(talentId)}/content/sessions/${encodeURIComponent(sessionId)}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: payload instanceof FormData
      ? { Accept: "text/event-stream" }
      : { Accept: "text/event-stream", "Content-Type": "application/json" },
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response body is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneResponse: SendMessageResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventText of events) {
      const parsed = parseSseEvent(eventText);
      if (!parsed) continue;

      if (parsed.event === "userMessage") {
        handlers.onUserMessage?.(parsed.data as ContentMessage);
      }

      if (parsed.event === "chunk") {
        const data = parsed.data as { content?: string };
        if (data.content) handlers.onChunk?.(data.content);
      }

      if (parsed.event === "done") {
        doneResponse = parsed.data as SendMessageResponse;
        handlers.onDone?.(doneResponse);
      }

      if (parsed.event === "error") {
        const data = parsed.data as { error?: string };
        const error = data.error ?? "Streaming request failed.";
        handlers.onError?.(error);
        throw new Error(error);
      }
    }
  }

  if (!doneResponse) {
    throw new Error("Streaming response ended before completion.");
  }

  return doneResponse;
}

export async function getContentMemories(talentId: string): Promise<{ memories: ContentMemory[] }> {
  return fetchJson<{ memories: ContentMemory[] }>(`/api/talents/${encodeURIComponent(talentId)}/memories`);
}

export async function updateContentMemory(
  talentId: string,
  data: { category: string; key: string; value: string },
): Promise<{ success: boolean; value: string }> {
  return fetchJson<{ success: boolean; value: string }>(`/api/talents/${encodeURIComponent(talentId)}/memories`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteContentMemory(
  talentId: string,
  data: { category: string; key: string },
): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`/api/talents/${encodeURIComponent(talentId)}/memories`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function clearContentMemories(talentId: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`/api/talents/${encodeURIComponent(talentId)}/memories?all=true`, {
    method: "DELETE",
  });
}

export async function submitFeedback(
  talentId: string,
  sessionId: string,
  data: { type: "up" | "down" | "correction"; text?: string },
): Promise<{ success: boolean; memoriesUpdated: number }> {
  return fetchJson<{ success: boolean; memoriesUpdated: number }>(
    `/api/talents/${encodeURIComponent(talentId)}/content/sessions/${encodeURIComponent(sessionId)}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}
