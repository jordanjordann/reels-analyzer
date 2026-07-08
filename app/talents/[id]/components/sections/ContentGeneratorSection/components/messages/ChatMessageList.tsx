import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/shared/utils";
import type { ChatMessageListProps } from "../../types";
import { MessageFeedback } from "./MessageFeedback";

export function ChatMessageList({ messages, isSending, talentId, sessionId }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs">Start by typing a message below</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-secondary text-foreground rounded-br-md"
                : "bg-background border border-border text-foreground rounded-bl-md",
            )}
          >
            {msg.role === "user" ? (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            ) : (
              <>
                <div className="prose prose-sm prose-invert max-w-none prose-p:mb-2 prose-ul:mb-2 prose-ol:mb-2 prose-li:mb-1 prose-headings:mb-2 prose-code:bg-secondary/50 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-pre:bg-secondary/50 prose-pre:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {!msg.id.startsWith("temp-") && talentId && sessionId && (
                  <MessageFeedback talentId={talentId} sessionId={sessionId} />
                )}
              </>
            )}
          </div>
        </div>
      ))}
      {isSending && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-1.5">
              <div className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
              <div className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
              <div className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
