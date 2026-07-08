import { useQueryClient } from "@tanstack/react-query";
import { getContentSession } from "@/api/talents/content/api";
import { useContentSessions, useDeleteContentSession } from "@/api/talents/content/hooks";
import { CONTENT_KEYS } from "@/api/talents/content/constants";
import type { SessionListProps } from "../../types";
import { SessionCard } from "../cards/SessionCard";

export function SessionList({ talentId, activeSessionId, onSelect, onDelete }: SessionListProps) {
  const queryClient = useQueryClient();
  const { data, isFetching } = useContentSessions(talentId);
  const { mutate: deleteSession } = useDeleteContentSession(talentId);
  const sessions = data?.sessions ?? [];

  function prefetchSession(sessionId: string) {
    void queryClient.prefetchQuery({
      queryKey: CONTENT_KEYS.session(talentId, sessionId),
      queryFn: () => getContentSession(talentId, sessionId),
      staleTime: 60_000,
    });
  }

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
          onPrefetch={prefetchSession}
          onDelete={(id: string) => {
            if (activeSessionId === id) onSelect("");
            onDelete(id);
            deleteSession(id);
          }}
        />
      ))}
    </div>
  );
}
