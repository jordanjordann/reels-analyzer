export type ContentSessionSummary = {
  id: string;
  mode: "custom";
  contentType: "video" | "carousel" | null;
  topic: string;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ContentSessionDetail = ContentSessionSummary & {
  messages: ContentMessage[];
};

export type ListSessionsResponse = { sessions: ContentSessionSummary[] };
export type SessionDetailResponse = { session: ContentSessionDetail | null };
export type SendMessageResponse = { userMessage: ContentMessage; assistantMessage: ContentMessage };

export type CreateSessionBody = {
  mode?: "custom";
  contentType?: "video" | "carousel";
  topic?: string;
  extraContext?: string;
};

export type SendMessageBody = {
  content: string;
};

export type MemoryCategory =
  | "format"
  | "tone"
  | "structure"
  | "language"
  | "avoidance"
  | "topic_focus";

export type MemorySource = "explicit" | "implicit" | "correction";

export type ContentMemory = {
  id: string;
  talentId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  source: MemorySource;
  lastSeenAt: string;
  createdAt: string;
};

export type ExtractedMemory = {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  source: MemorySource;
};
