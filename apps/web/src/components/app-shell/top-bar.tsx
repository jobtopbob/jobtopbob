"use client";

import { Search, Bell, ChevronDown, LogOut, PanelLeftOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useSidebar } from "./sidebar-context";

interface TopBarProps {
  userName: string;
}

export function TopBar({ userName: initialUserName }: TopBarProps) {
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebar();
  const { data: session } = authClient.useSession();

  // Prefer live session data over the server-rendered prop
  const userName = session?.user?.name || initialUserName;
  const userImage = session?.user?.image;
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center h-14 px-3 sm:px-6 bg-background border-b border-border-subtle shrink-0">
      {/* Expand button (shown when sidebar is collapsed) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-7 h-7 rounded-lg mr-3 shrink-0"
        >
          <PanelLeftOpen className="w-[18px] h-[18px] text-text-tertiary" />
        </button>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 w-full max-w-[280px] px-3 py-2 rounded-xl bg-surface border border-border-subtle">
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <span className="text-sm text-text-muted">
          Search or type a command...
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bell */}
      <Bell className="w-5 h-5 text-text-muted" />

      {/* User Section */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-3 pl-4 outline-none cursor-pointer"
          render={
            <button>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium overflow-hidden">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-text-primary">
                {userName}
              </span>
              <ChevronDown className="hidden sm:block w-4 h-4 text-text-muted" />
            </button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
