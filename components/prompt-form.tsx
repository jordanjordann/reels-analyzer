"use client";

import { FormEvent } from "react";
import { LoaderCircleIcon, SendIcon, SparklesIcon } from "lucide-react";

import { UrlChipInput } from "@/components/url-chip-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export type AnalysisStage = "idle" | "fetching" | "uploading" | "analyzing";

export const STAGE_LABELS: Record<AnalysisStage, string> = {
  idle: "",
  fetching: "Fetching reel metadata...",
  uploading: "Uploading videos to Gemini...",
  analyzing: "Running analysis against rubric...",
};

export const PromptForm = function PromptForm({
  urls,
  setUrls,
  prompt,
  setPrompt,
  error,
  submitting,
  analysisStage,
  onSubmit,
}: {
  urls: string[];
  setUrls: (v: string[]) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  error: string | null;
  submitting: boolean;
  analysisStage: AnalysisStage;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const isWorking = submitting || analysisStage !== "idle";
  const buttonLabel = analysisStage !== "idle"
    ? STAGE_LABELS[analysisStage]
    : submitting
      ? "Saving analysis"
      : "Send prompt";

  return (
    <form className="enter-rise flex flex-col gap-5" onSubmit={onSubmit}>
      <Card className="border lab-panel">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Prompt panel</CardTitle>
          <CardDescription>Paste up to 10 reel URLs. The account is detected automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(error?.includes("URL"))}>
              <FieldLabel>Reel URLs</FieldLabel>
              <UrlChipInput urls={urls} onChange={setUrls} max={10} disabled={isWorking} />
              <FieldDescription>Press Enter to add. Paste multiple URLs to split automatically.</FieldDescription>
            </Field>

            <Field data-invalid={Boolean(error && !error.includes("URL"))}>
              <FieldLabel htmlFor="prompt">Analysis prompt</FieldLabel>
              <Textarea
                id="prompt"
                className="min-h-36 resize-none"
                placeholder="What recurring hook patterns does this creator use?"
                value={prompt}
                aria-invalid={Boolean(error && !error.includes("URL"))}
                disabled={isWorking}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <FieldDescription>Press Enter to submit. Use Shift+Enter for a new line.</FieldDescription>
              <div aria-live="polite">{error ? <FieldError>{error}</FieldError> : null}</div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Button className="h-12" disabled={isWorking || urls.length === 0} type="submit">
        {isWorking ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <SendIcon data-icon="inline-start" aria-hidden="true" />}
        {buttonLabel}
      </Button>

      <div className="flex items-start gap-3 rounded-2xl border bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground">
        <SparklesIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        Powered by Gemini 2.5 Flash — videos are uploaded to the File API for analysis against the hidden rubric.
      </div>
    </form>
  );
};
