"use client";

import { cn } from "@/lib/utils";
import { User, Brain, Plug, Shield } from "lucide-react";

export type SettingsSection = "profile" | "ai" | "integrations" | "account";

const sections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "ai", label: "Artificial Intelligence", icon: Brain },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "account", label: "Account", icon: Shield },
];

interface SettingsNavProps {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}

export function SettingsNav({ active, onSelect }: SettingsNavProps) {
  return (
    <>
      {/* Desktop: vertical sidebar nav */}
      <nav className="hidden lg:flex flex-col gap-1 w-[220px] shrink-0">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
              active === s.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>

      {/* Mobile: horizontal scrollable tabs */}
      <nav className="flex lg:hidden gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              active === s.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>
    </>
  );
}
