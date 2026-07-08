"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, PencilIcon, CheckIcon, XIcon, SendIcon } from "lucide-react";
import { useSubmitFeedback } from "@/api/talents/content/hooks";
import type { MessageFeedbackProps } from "../../types";

export function MessageFeedback({ talentId, sessionId }: Omit<MessageFeedbackProps, "messageId">) {
  const submitFeedback = useSubmitFeedback(talentId, sessionId);
  const [state, setState] = useState<"idle" | "up" | "down" | "correction" | "submitted">("idle");
  const [feedbackText, setFeedbackText] = useState("");

  function handleUp() {
    setState("up");
    submitFeedback.mutate({ type: "up" }, { onSuccess: () => setState("submitted") });
  }

  function handleDown() {
    setState("down");
    setFeedbackText("");
  }

  function handleCorrection() {
    setState("correction");
    setFeedbackText("");
  }

  function handleSubmitFeedback() {
    if (!feedbackText.trim()) return;
    submitFeedback.mutate(
      { type: state === "down" ? "down" : "correction", text: feedbackText.trim() },
      { onSuccess: () => setState("submitted") },
    );
  }

  function handleCancel() {
    setState("idle");
    setFeedbackText("");
  }

  if (state === "submitted") {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckIcon className="size-3.5 text-green-400" />
        <span>Feedback received</span>
      </div>
    );
  }

  if (state === "down" || state === "correction") {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && feedbackText.trim()) handleSubmitFeedback();
              if (e.key === "Escape") handleCancel();
            }}
            placeholder={state === "down" ? "What's wrong with this response?" : "Type your correction..."}
            className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={submitFeedback.isPending}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSubmitFeedback}
            disabled={!feedbackText.trim() || submitFeedback.isPending}
            className="rounded-lg bg-accent p-1.5 text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <SendIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        type="button"
        onClick={handleUp}
        disabled={submitFeedback.isPending}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-green-400 disabled:opacity-50"
        title="Good response"
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={handleDown}
        disabled={submitFeedback.isPending}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-red-400 disabled:opacity-50"
        title="Something's wrong"
      >
        <ThumbsDown className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={handleCorrection}
        disabled={submitFeedback.isPending}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-amber-400 disabled:opacity-50"
        title="Suggest a correction"
      >
        <PencilIcon className="size-3.5" />
      </button>
    </div>
  );
}
