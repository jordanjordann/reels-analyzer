"use client";

import { Sidebar } from "./sidebar";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="pl-64 min-h-dvh">{children}</main>
    </>
  );
}
