import type { ContentSessionSummary, ContentMessage, ContentMemory } from "@/api/talents/content/types";

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
  talentId?: string;
  sessionId?: string;
};

export type MessageFeedbackProps = {
  talentId: string;
  sessionId: string;
};

export type ChatInputProps = {
  onSend: (content: string, file?: File | null) => void;
  disabled: boolean;
  placeholder?: string;
};

export type MemorySettingsSectionProps = {
  talentId: string;
};

export type EditMemoryModalProps = {
  memory: ContentMemory;
  talentId: string;
  onClose: () => void;
};
