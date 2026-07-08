import type { ContentSessionSummary, ContentMessage } from "@/api/talents/content/types";

export type ContentGeneratorSectionProps = {
  talentId: string;
};

export type SessionListProps = {
  talentId: string;
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
};

export type SessionCardProps = {
  session: ContentSessionSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPrefetch: (id: string) => void;
};

export type ChatSectionProps = {
  talentId: string;
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
  isSwitchingSession?: boolean;
};

export type ChatMessageListProps = {
  messages: ContentMessage[];
  isSending: boolean;
};

export type ChatInputProps = {
  onSend: (content: string, file?: File | null) => void;
  disabled: boolean;
  placeholder?: string;
};
