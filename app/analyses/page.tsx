"use client";

import { LayoutGridIcon } from "lucide-react";
import { useAnalysisUsers } from "@/api/analyses/hooks";
import { UserGrid } from "@/components/analyses/user-grid";

export default function AnalysesPage() {
  const { data, isFetching } = useAnalysisUsers();
  const users = data?.users ?? [];

  return (
    <div className="flex min-h-dvh flex-col gap-6 p-6 lg:p-8">
      <header className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-xl border bg-secondary text-accent">
          <LayoutGridIcon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em]">Analyses</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} account{users.length === 1 ? "" : "s"} analyzed
          </p>
        </div>
      </header>

      <UserGrid users={users} loading={isFetching && users.length === 0} />
    </div>
  );
}
