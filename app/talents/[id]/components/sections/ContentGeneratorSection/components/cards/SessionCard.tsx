import { MessageSquareIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils";
import type { SessionCardProps } from "../../types";
import { formatSessionPreview, formatSessionTime } from "../../helpers";

export function SessionCard({ session, isActive, onSelect, onDelete }: SessionCardProps) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors",
        isActive ? "bg-secondary" : "hover:bg-secondary/50",
      )}
      onClick={() => onSelect(session.id)}
    >
      <div className="mt-0.5 shrink-0">
        <MessageSquareIcon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{formatSessionPreview(session)}</p>
        <p className="text-xs text-muted-foreground">{formatSessionTime(session.updatedAt)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400"
      >
        <Trash2Icon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
