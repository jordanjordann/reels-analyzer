import { useContentSessions, useDeleteContentSession } from "@/api/talents/content/hooks";
import { cn } from "@/shared/utils";
import type { SessionListProps } from "../../types";
import { SessionCard } from "../cards/SessionCard";

export function SessionList({ talentId, activeSessionId, onSelect, onDelete }: SessionListProps) {
  const { data, isFetching } = useContentSessions(talentId);
  const { mutate: deleteSession } = useDeleteContentSession(talentId);
  const sessions = data?.sessions ?? [];

  if (isFetching) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onSelect={onSelect}
              onDelete={(id: string) => {
            if (activeSessionId === id) onSelect("");
            deleteSession(id);
          }}
        />
      ))}
    </div>
  );
}
