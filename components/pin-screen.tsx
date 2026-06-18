"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import {
  ActivityIcon,
  BadgeCheckIcon,
  DatabaseIcon,
  FingerprintIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input";

const capabilities = [
  "PIN-gated workspace",
  "Persistent research history",
  "Video-native Gemini analysis",
];

type AuthStatus = {
  pinConfigured: boolean;
  authenticated: boolean;
};

type PinScreenProps = {
  onUnlocked: () => void;
};

export function PinScreen({ onUnlocked }: PinScreenProps) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch("/api/auth/status");
        const data = (await response.json()) as AuthStatus & { error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(data.error ?? "Unable to read auth status.");
          return;
        }

        setStatus(data);
        if (data.authenticated) {
          onUnlocked();
        }
      } catch {
        if (!cancelled) {
          setError("Unable to connect to the auth endpoint.");
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [onUnlocked]);

  function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError("Enter a 4-digit PIN.");
      setPin("");
      return;
    }

    startTransition(async () => {
      const endpoint = status?.pinConfigured ? "/api/auth/verify" : "/api/auth/setup";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = (await response.json()) as { ok: boolean; error?: string };

        if (!response.ok || !data.ok) {
          setError(data.error ?? "PIN failed.");
          setPin("");
          return;
        }

        onUnlocked();
      } catch {
        setError("Unable to submit PIN.");
        setPin("");
      }
    });
  }

  const mode = status?.pinConfigured ? "unlock" : "setup";
  const title = mode === "setup" ? "Initialize private analysis vault" : "Unlock analysis vault";
  const description =
    mode === "setup"
      ? "Create the local operator PIN before any Reel metadata, prompts, or model outputs are stored."
      : "Authenticate to resume the Reels intelligence workspace and continue previous analysis sessions.";

  return (
    <main className="lab-frame relative min-h-dvh overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="lab-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-xl items-center justify-center lg:min-h-[calc(100dvh-4rem)]">
        <Card className="enter-rise scanline w-full border lab-panel-strong">
          <CardHeader className="gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl border bg-secondary text-accent">
                <LockKeyholeIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="rounded-full border bg-secondary px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {status ? "Secure route ready" : "Syncing status"}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardTitle className="font-heading text-3xl tracking-[-0.04em] sm:text-4xl">{title}</CardTitle>
              <CardDescription className="text-base leading-7">{description}</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={submitPin}>
            <CardContent className="flex flex-col gap-6">
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="pin">4-digit operator PIN</FieldLabel>
                  <Input
                    id="pin"
                    className="h-14 font-mono text-xl tracking-[0.8em]"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    placeholder="0000"
                    type="password"
                    value={pin}
                    aria-invalid={Boolean(error)}
                    disabled={!status || isPending}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                  <FieldDescription>
                    Bcrypt-hashed in the local database, then exchanged for an HTTP-only session cookie.
                  </FieldDescription>
                  <div aria-live="polite">{error ? <FieldError>{error}</FieldError> : null}</div>
                </Field>
              </FieldGroup>

              <div className="grid gap-2 rounded-2xl border bg-secondary/50 p-3">
                {capabilities.map((capability, index) => (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground" key={capability}>
                    {index === 0 ? (
                      <ShieldCheckIcon className="size-4 text-accent" aria-hidden="true" />
                    ) : index === 1 ? (
                      <DatabaseIcon className="size-4 text-primary" aria-hidden="true" />
                    ) : (
                      <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
                    )}
                    <span>{capability}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="h-12 w-full" disabled={!status || isPending || pin.length !== 4} type="submit">
                {isPending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
                {isPending ? "Verifying secure session" : mode === "setup" ? "Create vault PIN" : "Unlock workspace"}
              </Button>
              <div className="flex w-full items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <FingerprintIcon className="size-3.5" aria-hidden="true" />
                  Local operator access
                </span>
                <span className="flex items-center gap-2">
                  <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
                  No telemetry
                </span>
                <span className="flex items-center gap-2">
                  <ActivityIcon className="size-3.5" aria-hidden="true" />
                  Phase 1 ready
                </span>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
