export type SessionListItem = {
  id: string;
  username: string;
  title: string | null;
  lastPromptPreview: string | null;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  rawGemini: string | null;
  createdAt: string;
};

export type SessionDetail = {
  id: string;
  username: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: MessageRecord[];
};
