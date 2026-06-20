"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PromptForm, type AnalysisStage } from "@/components/prompt-form";
import { SESSION_KEYS } from "@/api/sessions/hooks";

export function NewAnalysisModal({
  defaultUsername,
}: {
  defaultUsername?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
    }, 150);
  }, [router]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose]);

  const runAnalysis = useCallback(async (cleanUrls: string[], cleanPrompt: string, existingSessionId?: string, confirmBudget?: boolean) => {
    setError(null);
    setSubmitting(true);
    setAnalysisStage("fetching");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: cleanUrls,
          prompt: cleanPrompt,
          sessionId: existingSessionId,
          confirmBudget,
        }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        error?: string;
        reelsAnalyzed?: number;
      };

      if (!response.ok || !data.sessionId) {
        const errMsg = data.error ?? "Unable to save prompt.";
        setError(errMsg);
        return;
      }

      if (data.reelsAnalyzed === 0) {
        setError("Found 0 usable reels. URLs may be invalid or reels are unavailable.");
      } else if (data.error) {
        setError(data.error);
      } else {
        setPrompt("");
        void queryClient.invalidateQueries({ queryKey: SESSION_KEYS.lists() });
        if (defaultUsername) {
          void queryClient.invalidateQueries({ queryKey: ["analyses", "user-reels", defaultUsername] });
        }
        handleClose();
      }
    } catch {
      setError("Unable to connect to the analyze endpoint.");
    } finally {
      setSubmitting(false);
      setAnalysisStage("idle");
    }
  }, [queryClient, defaultUsername, handleClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUrls = urls.filter((u) => u.trim());
    const cleanPrompt = prompt.trim();

    if (cleanUrls.length === 0) {
      setError("Add at least one Instagram reel URL before sending a prompt.");
      return;
    }

    if (!cleanPrompt) {
      setError("Enter a prompt to analyze.");
      return;
    }

    void runAnalysis(cleanUrls, cleanPrompt);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${isClosing ? "opacity-0" : "opacity-100"}`}
      onClick={handleClose}
    >
      <div
        className={`relative my-10 w-full max-w-xl transition-transform duration-150 ${isClosing ? "scale-95" : "scale-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.04em]">New Analysis</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <PromptForm
            urls={urls}
            setUrls={setUrls}
            prompt={prompt}
            setPrompt={setPrompt}
            error={error}
            submitting={submitting}
            analysisStage={analysisStage}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
