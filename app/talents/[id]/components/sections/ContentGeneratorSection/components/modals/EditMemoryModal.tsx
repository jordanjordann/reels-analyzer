"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { useUpdateMemory } from "@/api/talents/content/hooks";
import type { EditMemoryModalProps } from "../../types";

export function EditMemoryModal({ memory, talentId, onClose }: EditMemoryModalProps) {
  const updateMemory = useUpdateMemory(talentId);
  const [value, setValue] = useState(memory.value);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;

    updateMemory.mutate(
      { category: memory.category, key: memory.key, value: value.trim() },
      { onSuccess: () => handleClose() },
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${isClosing ? "opacity-0" : "opacity-100"}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-md transition-transform duration-150 ${isClosing ? "scale-95" : "scale-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-xl border bg-background px-6 py-4 shadow-xl">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.04em]">Edit Preference</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-2 rounded-xl border bg-background px-6 pb-6 pt-4 shadow-xl">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key
              </label>
              <p className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm font-mono">
                {memory.category}:{memory.key}
              </p>
            </div>

            <div>
              <label htmlFor="memory-value" className="mb-1.5 block text-sm font-medium">
                Value
              </label>
              <textarea
                id="memory-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={updateMemory.isPending}
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Source: {memory.source}</span>
              <span>Confidence: {Math.round(memory.confidence * 100)}%</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                disabled={updateMemory.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMemory.isPending || !value.trim()}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {updateMemory.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
