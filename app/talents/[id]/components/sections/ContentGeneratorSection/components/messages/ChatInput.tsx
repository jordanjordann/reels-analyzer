import { useState, useRef, useEffect, useCallback } from "react";
import { SendIcon, PaperclipIcon, XIcon, FileTextIcon } from "lucide-react";
import { cn } from "@/shared/utils";
import type { ChatInputProps } from "../../types";

const ALLOWED_TYPES = ["text/plain", "text/markdown", "text/csv", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ChatInput({ onSend, disabled, placeholder = "Type a message..." }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  function handleFileSelect(file: File) {
    setFileError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError(`Unsupported type. Allowed: .txt, .md, .csv, .pdf`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    setSelectedFile(file);
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if ((!trimmed && !selectedFile) || disabled) return;
    onSend(trimmed || "Analyze the attached file", selectedFile);
    setValue("");
    setSelectedFile(null);
    setFileError(null);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [value, selectedFile, disabled],
  );

  return (
    <div className="border-t border-border bg-background p-3">
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground">{selectedFile.name}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setFileError(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {fileError && (
        <p className="mb-2 text-xs text-red-400">{fileError}</p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          <PaperclipIcon className="size-4" aria-hidden="true" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || (!value.trim() && !selectedFile)}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50",
          )}
        >
          <SendIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
