"use client";

import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { usePathname } from "next/navigation";
import {
  SquaresFourIcon,
  CompassIcon,
  BriefcaseIcon,
  FileTextIcon,
  BuildingsIcon,
  HandCoinsIcon,
  WrenchIcon,
  EnvelopeIcon,
  UsersIcon,
  BookOpenIcon,
  GearIcon,
  SidebarSimpleIcon,
  SunIcon,
  MoonIcon,
  CaretDownIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useUnconfirmedCount } from "@/hooks/use-email";

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
    icon: BriefcaseIcon,
    items: [
      { label: "Applications", icon: BriefcaseIcon, href: "/applications" },
      { label: "Offers", icon: HandCoinsIcon, href: "/offers" },
    ],
  },
  {
    label: "Tools",
    icon: WrenchIcon,
    items: [
      { label: "Resumes", icon: FileTextIcon, href: "/resumes" },
      { label: "Resources", icon: BookOpenIcon, href: "/resources" },
      { label: "Email Integration", icon: EnvelopeIcon, href: "/email-integration" },
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

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLButtonElement>(null);
  const darkRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const activeBtn = resolvedTheme === "light" ? lightRef.current : darkRef.current;
    if (!container || !activeBtn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    setPillStyle({ left: bRect.left - cRect.left, width: bRect.width });
  }, [resolvedTheme]);

  useEffect(() => {
    measure();
  }, [measure]);

  if (collapsed) return null;

  // pillStyle is null on server / before first measure — use that as the "mounted" signal
  // to avoid hydration mismatch. Both buttons render with the default color on the server.
  const isLight = pillStyle !== null && resolvedTheme === "light";
  const isDark = pillStyle !== null && resolvedTheme === "dark";

  return (
    <div ref={containerRef} className="relative flex rounded-full bg-sidebar-accent p-1">
      {pillStyle && (
        <span
          className="absolute top-1 bottom-1 rounded-full bg-sidebar-border shadow-sm transition-[left,width] duration-200 ease-out"
          style={{ left: pillStyle.left, width: pillStyle.width }}
        />
      )}
      <button
        ref={lightRef}
        onClick={() => setTheme("light")}
        className="relative z-10 flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full"
      >
        <SunIcon className={cn("w-4 h-4 transition-colors duration-200", isLight ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")} />
        <span className={cn("text-xs font-medium transition-colors duration-200", isLight ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")}>Light</span>
      </button>
      <button
        ref={darkRef}
        onClick={() => setTheme("dark")}
        className="relative z-10 flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full"
      >
        <MoonIcon className={cn("w-4 h-4 transition-colors duration-200", isDark ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")} />
        <span className={cn("text-xs font-medium transition-colors duration-200", isDark ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")}>Dark</span>
      </button>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >({ "Job Tracking": true, Tools: true });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity duration-300",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => setCollapsed(true)}
      />

      <aside
        className={cn(
          "flex flex-col h-full bg-sidebar border-r border-sidebar-border shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
          // Mobile: fixed overlay, slides in/out
          collapsed
            ? "fixed inset-y-0 left-0 z-50 w-60 -translate-x-full lg:translate-x-0 lg:static lg:z-auto lg:w-16"
            : "fixed inset-y-0 left-0 z-50 w-60 translate-x-0 lg:static lg:z-auto lg:w-60",
          // Mobile slide transition
          "transition-[width,transform] duration-300 ease-out"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-[60px] border-b border-sidebar-border shrink-0 transition-[padding] duration-300",
          collapsed ? "lg:justify-center lg:px-0 px-4 justify-between gap-2" : "justify-between gap-2 px-4"
        )}>
          <div className={cn(
            "flex items-center min-w-0",
            collapsed ? "lg:gap-0 gap-2.5" : "gap-2.5"
          )}>
            <AppLogo size={28} />
            <span className={cn(
              "text-sidebar-accent-foreground text-[15px] font-bold leading-none truncate transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
              collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[120px] opacity-100" : "max-w-[120px] opacity-100"
            )}>
              JobTopBob
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-opacity duration-200",
              collapsed ? "lg:hidden" : ""
            )}
          >
            <SidebarSimpleIcon className="w-[18px] h-[18px] text-sidebar-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-3 transition-[padding] duration-300",
          collapsed ? "lg:px-[10px] px-4 space-y-2" : "px-4 space-y-2"
        )}>
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center rounded-xl transition-colors duration-200",
              collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 lg:gap-0 gap-3 px-3 py-3" : "gap-3 px-3 py-3",
              pathname === "/dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Dashboard"
          >
            <SquaresFourIcon className="w-5 h-5 shrink-0" />
            <span className={cn(
              "leading-6 transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
              collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[150px] opacity-100" : "max-w-[150px] opacity-100"
            )}>
              Dashboard
            </span>
          </Link>

          {/* Discover */}
          <Link
            href="/discover"
            className={cn(
              "flex items-center rounded-xl transition-colors duration-200",
              collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 lg:gap-0 gap-3 px-3 py-3" : "gap-3 px-3 py-3",
              pathname === "/discover"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Discover"
          >
            <CompassIcon className="w-5 h-5 shrink-0" />
            <span className={cn(
              "leading-6 transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
              collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[150px] opacity-100" : "max-w-[150px] opacity-100"
            )}>
              Discover
            </span>
          </Link>

          {/* Nav Groups */}
          {navGroups.map((group) => (
            <div key={group.label}>
              {/* Group header — shows as icon-only button when collapsed on desktop */}
              <button
                onClick={() => !collapsed && toggleGroup(group.label)}
                className={cn(
                  "flex items-center w-full rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors duration-200",
                  collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 lg:gap-0 gap-3 px-3 py-3" : "gap-3 px-3 py-3"
                )}
                title={group.label}
              >
                <group.icon className="w-5 h-5 shrink-0" />
                <span className={cn(
                  "flex-1 text-left text-sm font-semibold leading-5 transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
                  collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[150px] opacity-100" : "max-w-[150px] opacity-100"
                )}>
                  {group.label}
                </span>
                <span className={cn(
                  "transition-[opacity,max-width] duration-200 ease-out overflow-hidden",
                  collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[16px] opacity-100" : "max-w-[16px] opacity-100"
                )}>
                  {expandedGroups[group.label] ? (
                    <CaretDownIcon className="w-4 h-4" />
                  ) : (
                    <CaretRightIcon className="w-4 h-4" />
                  )}
                </span>
              </button>

              {/* Collapsed desktop: show flat icon links */}
              <div className={cn(
                "hidden",
                collapsed && "lg:flex lg:flex-col lg:items-center lg:gap-1"
              )}>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-full py-2.5 rounded-xl shrink-0 transition-colors duration-200",
                      pathname === item.href
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                    title={item.label}
                  >
                    <item.icon className="w-5 h-5" />
                  </Link>
                ))}
              </div>

              {/* Expanded: tree items with grid-rows animation */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  collapsed ? "lg:hidden" : "",
                  expandedGroups[group.label] ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  {group.items.map((item, index) => (
                    <div key={item.href} className="flex items-center h-11">
                      <TreeIndicator
                        isLast={index === group.items.length - 1}
                      />
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 flex-1 px-3 py-3 rounded-xl text-sm transition-colors duration-200",
                          pathname === item.href
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:text-sidebar-accent-foreground/80"
                        )}
                      >
                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                        <span>{item.label}</span>
                        {item.href === "/email-integration" && (
                          <EmailBadge />
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Contacts */}
          <Link
            href="/contacts"
            className={cn(
              "flex items-center rounded-xl transition-colors duration-200",
              collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 lg:gap-0 gap-3 px-3 py-3" : "gap-3 px-3 py-3",
              pathname === "/contacts"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Contacts"
          >
            <UsersIcon className="w-5 h-5 shrink-0" />
            <span className={cn(
              "leading-6 transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
              collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[150px] opacity-100" : "max-w-[150px] opacity-100"
            )}>
              Contacts
            </span>
          </Link>

          {/* Companies */}
          <Link
            href="/companies"
            className={cn(
              "flex items-center rounded-xl transition-colors duration-200",
              collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 lg:gap-0 gap-3 px-3 py-3" : "gap-3 px-3 py-3",
              pathname === "/companies"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Companies"
          >
            <BuildingsIcon className="w-5 h-5 shrink-0" />
            <span className={cn(
              "leading-6 transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
              collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[150px] opacity-100" : "max-w-[150px] opacity-100"
            )}>
              Companies
            </span>
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-xl transition-colors duration-200",
              collapsed ? "lg:justify-center lg:px-0 lg:py-2.5 lg:gap-0 gap-3 px-3 py-3" : "gap-3 px-3 py-3",
              pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            title="Settings"
          >
            <GearIcon className="w-5 h-5 shrink-0" />
            <span className={cn(
              "leading-6 transition-[opacity,max-width] duration-200 ease-out overflow-hidden whitespace-nowrap",
              collapsed ? "lg:max-w-0 lg:opacity-0 max-w-[150px] opacity-100" : "max-w-[150px] opacity-100"
            )}>
              Settings
            </span>
          </Link>
        </nav>

        {/* Footer */}
        <div className={cn(
          "pb-4 space-y-4 transition-[padding] duration-300",
          collapsed ? "lg:px-[10px] px-4" : "px-4"
        )}>
          <div className="h-px bg-sidebar-border" />

          {/* Theme Toggle */}
          <ThemeToggle collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}

function EmailBadge() {
  const { data } = useUnconfirmedCount();
  if (!data?.count) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {data.count > 99 ? "99+" : data.count}
    </span>
  );
}
