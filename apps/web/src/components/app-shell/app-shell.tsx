"use client";

import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Toaster } from "sonner";

interface AppShellProps {
  userName: string;
  children: React.ReactNode;
}

export function AppShell({ userName, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar userName={userName} />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
