"use client";

import { FormEvent } from "react";
import { LoaderCircleIcon, SendIcon, SparklesIcon } from "lucide-react";

import { UrlChipInput } from "../inputs/UrlChipInput";
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
import { STAGE_LABELS } from "../../constants";
import type { AnalysisStage } from "../../types";

export function PromptForm({
  urls,
  setUrls,
  error,
  submitting,
  analysisStage,
  onSubmit,
}: {
  urls: string[];
  setUrls: (v: string[]) => void;
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
      : "Start analysis";

  return (
    <form className="enter-rise flex flex-col gap-5" onSubmit={onSubmit}>
      <Card className="border lab-panel">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-[-0.04em]">Prompt panel</CardTitle>
          <CardDescription>Paste up to 10 reel URLs. The account is detected automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel>Reel URLs</FieldLabel>
              <UrlChipInput urls={urls} onChange={setUrls} max={10} disabled={isWorking} />
              <FieldDescription>Press Enter to add. Paste multiple URLs to split automatically.</FieldDescription>
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
}
