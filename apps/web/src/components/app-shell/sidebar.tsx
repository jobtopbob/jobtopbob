"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Building2,
  Gift,
  Wrench,
  FileBadge,
  Mail,
  Users,
  Settings,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      { label: "Applications", icon: FileText, href: "/dashboard" },
      { label: "Companies", icon: Building2, href: "/companies" },
      { label: "Offers", icon: Gift, href: "/offers" },
    ],
  },
  {
    label: "Tools",
    icon: Wrench,
    items: [
      { label: "Resumes", icon: FileBadge, href: "/resumes" },
      { label: "Smart Router", icon: Mail, href: "/smart-router" },
      { label: "Contacts", icon: Users, href: "/contacts" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    { "Job Tracking": true, Tools: true }
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  if (collapsed) {
    return (
      <aside className="flex flex-col w-16 h-full bg-[#1A1A2E] border-r border-[#2E2E45] shrink-0">
        <div className="flex items-center justify-center h-[60px] border-b border-[#2E2E45]">
          <button onClick={() => setCollapsed(false)} className="p-1">
            <PanelLeftOpen className="w-[18px] h-[18px] text-[#A0A3B1]" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col w-60 h-full bg-[#1A1A2E] border-r border-[#2E2E45] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 h-[60px] px-4 border-b border-[#2E2E45]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#FF8400] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-semibold leading-tight truncate">
              JobTopBob
            </span>
            <span className="text-[#A0A3B1] text-[10px] leading-tight truncate">
              Job Tracker
            </span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
        >
          <PanelLeftClose className="w-[18px] h-[18px] text-[#A0A3B1]" />
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
              ? "bg-[#2A2A42] text-white"
              : "text-[#A0A3B1] hover:bg-[#2A2A42]/50"
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
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-[#A0A3B1] text-base hover:bg-[#2A2A42]/50"
            >
              <group.icon className="w-6 h-6 shrink-0" />
              <span className="flex-1 text-left leading-6">{group.label}</span>
              {expandedGroups[group.label] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedGroups[group.label] && (
              <div className="mt-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-11 pl-12 pr-3 text-sm",
                      pathname === item.href
                        ? "text-white"
                        : "text-[#A0A3B1] hover:text-white/80"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
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
              ? "bg-[#2A2A42] text-white"
              : "text-[#A0A3B1] hover:bg-[#2A2A42]/50"
          )}
        >
          <Settings className="w-6 h-6 shrink-0" />
          <span className="leading-6">Settings</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-4">
        <div className="h-px bg-[#2E2E45]" />

        {/* Help */}
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-[#A0A3B1]">
          <LifeBuoy className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-sm">Help</span>
          <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-[#FF8400] text-white text-[10px] font-medium">
            3
          </span>
        </div>

        {/* Theme Toggle */}
        <div className="flex rounded-full bg-[#2A2A42] p-1">
          <button className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full bg-[#2E2E45] shadow-sm">
            <Sun className="w-3.5 h-3.5 text-[#A0A3B1]" />
            <span className="text-[#A0A3B1] text-xs">Light</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full bg-[#1A1A2E]">
            <Moon className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs">Dark</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
