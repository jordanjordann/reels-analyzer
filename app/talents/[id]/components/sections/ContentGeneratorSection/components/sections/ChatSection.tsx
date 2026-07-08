import { useDeferredValue, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CONTENT_KEYS, useContentSession, useCreateContentSession } from "@/api/talents/content/hooks";
import { sendMessageStream } from "@/api/talents/content/api";
import type { ContentMessage, SessionDetailResponse } from "@/api/talents/content/types";
import type { ChatSectionProps } from "../../types";
import { ChatMessageList } from "../messages/ChatMessageList";
import { ChatInput } from "../messages/ChatInput";

export function ChatSection({ talentId, sessionId, onSessionCreated, isSwitchingSession = false }: ChatSectionProps) {
  const queryClient = useQueryClient();
  const { data, isFetching } = useContentSession(talentId, sessionId);
  const { mutate: createSession } = useCreateContentSession(talentId);
  const [optimisticMessages, setOptimisticMessages] = useState<ContentMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingFirstSession, setIsCreatingFirstSession] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const messages = data?.session?.messages ?? [];
  const combinedMessages = [...messages, ...optimisticMessages];
  const deferredMessages = useDeferredValue(combinedMessages);
  const messageContentLength = combinedMessages.reduce((total, msg) => total + msg.content.length, 0);
  const hasStreamingAssistantContent = optimisticMessages.some((msg) => msg.role === "assistant" && msg.content.length > 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combinedMessages.length, messageContentLength]);

  function buildSendPayload(content: string, file?: File | null) {
    if (!file) return { content };

    const formData = new FormData();
    formData.append("content", content);
    formData.append("file", file);
    return formData;
  }

  async function streamMessage(activeSessionId: string, content: string, file?: File | null) {
    const userTempId = `temp-user-${Date.now()}`;
    const assistantTempId = `temp-assistant-${Date.now()}`;

    setIsStreaming(true);
    setOptimisticMessages((prev) => [
      ...prev,
      { id: userTempId, sessionId: activeSessionId, role: "user" as const, content, createdAt: new Date().toISOString() },
    ]);

    try {
      await sendMessageStream(talentId, activeSessionId, buildSendPayload(content, file), {
        onChunk: (chunk) => {
          setOptimisticMessages((prev) => {
            const hasAssistant = prev.some((msg) => msg.id === assistantTempId);
            if (!hasAssistant) {
              return [
                ...prev,
                { id: assistantTempId, sessionId: activeSessionId, role: "assistant" as const, content: chunk, createdAt: new Date().toISOString() },
              ];
            }

            return prev.map((msg) => (
              msg.id === assistantTempId ? { ...msg, content: msg.content + chunk } : msg
            ));
          });
        },
        onDone: (response) => {
          setOptimisticMessages([]);
          queryClient.setQueryData<SessionDetailResponse>(CONTENT_KEYS.session(talentId, activeSessionId), (old) => {
            if (!old?.session) return old;

            const messages = old.session.messages.filter(
              (msg) => msg.id !== response.assistantMessage.id,
            );

            return {
              ...old,
              session: {
                ...old.session,
                messages: [...messages, response.assistantMessage],
              },
            };
          });
          void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.session(talentId, activeSessionId) });
          void queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.sessions(talentId) });
        },
      });
    } catch (error) {
      console.error("Failed to stream content message", error);
      setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== userTempId && msg.id !== assistantTempId));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSend(content: string, file?: File | null) {
    console.log("=== CHAT SEND ===");
    console.log("Message:", content);
    console.log("Session ID:", sessionId);
    console.log("Talent ID:", talentId);
    console.log("File:", file?.name ?? "(none)");

    if (sessionId) {
      void streamMessage(sessionId, content, file);
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
              onSessionCreated(newSessionId);
              await streamMessage(newSessionId, content);
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
              onSessionCreated(newSessionId);
              await streamMessage(newSessionId, content);
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

  const isLoading = (isFetching || isSwitchingSession) && messages.length === 0;
  const isDisabled = isStreaming || isCreatingFirstSession;

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
        <ChatMessageList messages={deferredMessages} isSending={isDisabled && !hasStreamingAssistantContent} />
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={isDisabled} />
    </div>
  );
}
