"use client";

import { useCallback, useState } from "react";
import { XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { REEL_URL_REGEX } from "../../constants";
import { shortenUrl } from "../../helpers";

export function UrlChipInput({
  urls,
  onChange,
  max = 10,
  disabled = false,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addUrl = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      if (!REEL_URL_REGEX.test(trimmed)) {
        setError("Invalid Instagram reel URL");
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (urls.includes(trimmed)) {
        setError("URL already added");
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (urls.length >= max) {
        setError(`Max ${max} URLs allowed`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      onChange([...urls, trimmed]);
      setInputValue("");
      setError(null);
    },
    [urls, onChange, max]
  );

  const removeUrl = useCallback(
    (index: number) => {
      onChange(urls.filter((_, i) => i !== index));
      setError(null);
    },
    [urls, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addUrl(inputValue);
      }
    },
    [inputValue, addUrl]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      const parts = text.split(/[\s\n,]+/).filter(Boolean);

      if (parts.length > 1) {
        e.preventDefault();
        let added = 0;
        for (const part of parts) {
          if (urls.length + added >= max) break;
          if (REEL_URL_REGEX.test(part.trim()) && !urls.includes(part.trim())) {
            onChange([...urls, part.trim()]);
            added++;
          }
        }
        setInputValue("");
        if (added === 0) {
          setError("No valid URLs found in paste");
          setTimeout(() => setError(null), 3000);
        }
      }
    },
    [urls, onChange, max]
  );

  const isAtLimit = urls.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <span
            key={`${url}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-mono text-accent"
          >
            <span>{shortenUrl(url)}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeUrl(i)}
              className="rounded p-0.5 hover:bg-accent/20"
              title="Remove"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Input
          placeholder={isAtLimit ? `Max ${max} URLs reached` : "Paste Instagram reel URL..."}
          value={inputValue}
          disabled={disabled || isAtLimit}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="font-mono text-sm"
        />
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        {urls.length}/{max} reels
      </p>
    </div>
  );
}
