"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, TrashIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { useContentMemories, useDeleteMemory, useClearMemories } from "@/api/talents/content/hooks";
import type { ContentMemory } from "@/api/talents/content/types";
import type { MemorySettingsSectionProps } from "../../types";
import { EditMemoryModal } from "../modals/EditMemoryModal";

const CATEGORY_LABELS: Record<string, string> = {
  format: "Format",
  tone: "Tone",
  structure: "Structure",
  language: "Language",
  avoidance: "Avoidance",
  topic_focus: "Topic Focus",
};

function groupByCategory(memories: ContentMemory[]) {
  const groups: Record<string, ContentMemory[]> = {};
  for (const m of memories) {
    if (!groups[m.category]) groups[m.category] = [];
    groups[m.category].push(m);
  }
  return groups;
}

export function MemorySettingsSection({ talentId }: MemorySettingsSectionProps) {
  const { data, isLoading } = useContentMemories(talentId);
  const deleteMemory = useDeleteMemory(talentId);
  const clearMemories = useClearMemories(talentId);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingMemory, setEditingMemory] = useState<ContentMemory | null>(null);

  const memories = data?.memories ?? [];
  const grouped = groupByCategory(memories);

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  function handleDelete(category: string, key: string) {
    deleteMemory.mutate({ category, key });
  }

  function handleClearAll() {
    if (confirm("Reset all learned preferences? This cannot be undone.")) {
      clearMemories.mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-background/50 p-4">
        <p className="text-sm text-muted-foreground">Loading memories...</p>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="rounded-xl border bg-background/50 p-4">
        <h3 className="mb-2 font-heading text-sm font-semibold tracking-tight">Memory Settings</h3>
        <p className="text-sm text-muted-foreground">
          No learned preferences yet. Preferences will be automatically extracted from your conversations.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-background/50">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-heading text-sm font-semibold tracking-tight">Memory Settings</h3>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearMemories.isPending}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
          >
            <RotateCcwIcon className="size-3.5" />
            Reset All
          </button>
        </div>

        <div className="border-t" />

        <div className="divide-y">
          {Object.entries(grouped).map(([category, items]) => {
            const isExpanded = expandedCategories[category] ?? true;
            return (
              <div key={category}>
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary/50"
                >
                  <span>{CATEGORY_LABELS[category] ?? category}</span>
                  {isExpanded ? (
                    <ChevronUpIcon className="size-4" />
                  ) : (
                    <ChevronDownIcon className="size-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3">
                    {items.map((memory) => (
                      <div
                        key={memory.key}
                        className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{memory.key}:</span>{" "}
                          <span className="text-muted-foreground">{memory.value}</span>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{memory.source}</span>
                            <span>&middot;</span>
                            <span>{Math.round(memory.confidence * 100)}%</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingMemory(memory)}
                            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(memory.category, memory.key)}
                            className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive hover:bg-secondary"
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          talentId={talentId}
          onClose={() => setEditingMemory(null)}
        />
      )}
    </>
  );
}
