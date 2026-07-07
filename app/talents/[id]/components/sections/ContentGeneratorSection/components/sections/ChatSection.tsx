import { useState, useEffect, useRef } from "react";
import { useContentSession, useSendMessage, useCreateContentSession } from "@/api/talents/content/hooks";
import { sendMessage } from "@/api/talents/content/api";
import type { ContentMessage } from "@/api/talents/content/types";
import type { ChatSectionProps } from "../../types";
import { ChatMessageList } from "../messages/ChatMessageList";
import { ChatInput } from "../messages/ChatInput";

export function ChatSection({ talentId, sessionId, onSessionCreated }: ChatSectionProps) {
  const { data, isFetching } = useContentSession(talentId, sessionId);
  const { mutate: sendMsg, isPending: isSending } = useSendMessage(talentId, sessionId ?? "");
  const { mutate: createSession } = useCreateContentSession(talentId);
  const [optimisticMessages, setOptimisticMessages] = useState<ContentMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingFirstSession, setIsCreatingFirstSession] = useState(false);

  const messages = data?.session?.messages ?? [];
  const combinedMessages = [...messages, ...optimisticMessages];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combinedMessages.length]);

  function handleSend(content: string, file?: File | null) {
    console.log("=== CHAT SEND ===");
    console.log("Message:", content);
    console.log("Session ID:", sessionId);
    console.log("Talent ID:", talentId);
    console.log("File:", file?.name ?? "(none)");

    if (sessionId) {
      const tempId = `temp-${Date.now()}`;
      setOptimisticMessages((prev) => [
        ...prev,
        { id: tempId, sessionId, role: "user" as const, content, createdAt: new Date().toISOString() },
      ]);

      const sendPayload = file
        ? (() => {
            const fd = new FormData();
            fd.append("content", content);
            fd.append("file", file);
            return fd;
          })()
        : { content };

      sendMsg(
        sendPayload,
        {
          onSuccess: () => setOptimisticMessages([]),
          onError: () => setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId)),
        },
      );
    } else {
      setIsCreatingFirstSession(true);

      if (file) {
        const formData = new FormData();
        formData.append("mode", "custom");
        formData.append("file", file);

        createSession(formData, {
          onSuccess: async (data) => {
            const newSessionId = data.session.id;
            try {
              await sendMessage(talentId, newSessionId, { content });
              onSessionCreated(newSessionId);
            } catch {
              onSessionCreated(newSessionId);
            } finally {
              setIsCreatingFirstSession(false);
            }
          },
          onError: () => setIsCreatingFirstSession(false),
        });
      } else {
        createSession({ mode: "custom" }, {
          onSuccess: async (data) => {
            const newSessionId = data.session.id;
            try {
              await sendMessage(talentId, newSessionId, { content });
              onSessionCreated(newSessionId);
            } catch {
              onSessionCreated(newSessionId);
            } finally {
              setIsCreatingFirstSession(false);
            }
          },
          onError: () => setIsCreatingFirstSession(false),
        });
      }
    }
  }

  const isLoading = isFetching && messages.length === 0;
  const isDisabled = isSending || isCreatingFirstSession;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <div className="size-8 animate-pulse rounded-lg bg-secondary" />
        <p className="text-sm">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessageList messages={combinedMessages} isSending={isDisabled} />
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={isDisabled} />
    </div>
  );
}
