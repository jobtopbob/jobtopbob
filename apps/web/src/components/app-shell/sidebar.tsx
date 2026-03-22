"use client";

import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Building2,
  HandCoins,
  Wrench,
  Mail,
  Users,
  Settings,
  LifeBuoy,
  PanelLeftClose,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Job Tracking",
    icon: Briefcase,
    items: [
      { label: "Applications", icon: Briefcase, href: "/applications" },
      { label: "Companies", icon: Building2, href: "/companies" },
      { label: "Offers", icon: HandCoins, href: "/offers" },
    ],
  },
  {
    label: "Tools",
    icon: Wrench,
    items: [
      { label: "Resumes", icon: FileText, href: "/resumes" },
      { label: "Smart Router", icon: Mail, href: "/smart-router" },
      { label: "Contacts", icon: Users, href: "/contacts" },
    ],
  },
];

function TreeIndicator({ isLast }: { isLast: boolean }) {
  return (
    <div className="w-9 h-11 shrink-0 relative">
      {/* Vertical line */}
      <div
        className={cn(
          "absolute left-4 top-0 w-0.5 bg-sidebar-border",
          isLast ? "h-5" : "h-full"
        )}
      />
      {/* Curve connector */}
      <svg
        className="absolute left-[15px] top-5"
        width="13"
        height="12"
        viewBox="0 0 13 12"
        fill="none"
      >
        <path
          d="M1 0C1 6 1 11 12 11"
          className="text-sidebar-border"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >({ "Job Tracking": true, Tools: true });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  if (collapsed) {
    return (
      <aside className="hidden lg:flex flex-col w-16 h-full bg-sidebar border-r border-sidebar-border shrink-0">
        {/* Header - logo icon only */}
        <div className="flex items-center justify-center h-[60px] border-b border-sidebar-border">
          <AppLogo size={28} />
        </div>

        {/* Navigation - icon only */}
        <nav className="flex-1 flex flex-col items-center gap-2 py-3 overflow-y-auto">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-xl shrink-0",
              pathname === "/dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Dashboard"
          >
            <LayoutDashboard className="w-6 h-6" />
          </Link>

          {navGroups.map((group) =>
            group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-xl shrink-0",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                title={item.label}
              >
                <item.icon className="w-[18px] h-[18px]" />
              </Link>
            ))
          )}

          <Link
            href="/settings"
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-xl shrink-0",
              pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </Link>
        </nav>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <div className="w-6 h-px bg-sidebar-border" />
          <div className="flex items-center justify-center w-11 h-11 rounded-xl text-sidebar-foreground">
            <LifeBuoy className="w-5 h-5" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={() => setCollapsed(true)}
      />
    <aside className="fixed inset-y-0 left-0 z-50 lg:static lg:z-auto flex flex-col w-60 h-full bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 h-[60px] px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <AppLogo size={28} />
          <span className="text-sidebar-accent-foreground text-[15px] font-bold leading-none truncate">
            JobTopBob
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
        >
          <PanelLeftClose className="w-[18px] h-[18px] text-sidebar-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl text-base",
            pathname === "/dashboard"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <LayoutDashboard className="w-6 h-6 shrink-0" />
          <span className="leading-6">Dashboard</span>
        </Link>

        {/* Nav Groups */}
        {navGroups.map((group) => (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <group.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left text-sm font-semibold leading-5">
                {group.label}
              </span>
              {expandedGroups[group.label] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedGroups[group.label] && (
              <div>
                {group.items.map((item, index) => (
                  <div key={item.href} className="flex items-center h-11">
                    <TreeIndicator
                      isLast={index === group.items.length - 1}
                    />
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 flex-1 px-3 py-3 rounded-xl text-sm",
                        pathname === item.href
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:text-sidebar-accent-foreground/80"
                      )}
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl text-base",
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Settings className="w-6 h-6 shrink-0" />
          <span className="leading-6">Settings</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-4">
        <div className="h-px bg-sidebar-border" />

        {/* Help */}
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sidebar-foreground">
          <LifeBuoy className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-sm">Help</span>
          <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
            3
          </span>
        </div>

        {/* Theme Toggle */}
        <div className="flex rounded-full bg-sidebar-accent p-1">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full",
              mounted && resolvedTheme === "light"
                ? "bg-sidebar-border shadow-sm"
                : "bg-sidebar"
            )}
          >
            <Sun className={cn("w-4 h-4", mounted && resolvedTheme === "light" ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")} />
            <span className={cn("text-xs font-medium", mounted && resolvedTheme === "light" ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")}>Light</span>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full",
              mounted && resolvedTheme === "dark"
                ? "bg-sidebar-border shadow-sm"
                : "bg-sidebar"
            )}
          >
            <Moon className={cn("w-4 h-4", mounted && resolvedTheme === "dark" ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")} />
            <span className={cn("text-xs font-medium", mounted && resolvedTheme === "dark" ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")}>Dark</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
