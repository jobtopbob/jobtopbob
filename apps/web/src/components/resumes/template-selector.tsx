"use client";

import { cn } from "@/lib/utils";

interface TemplateLayout {
  name: string;
  accent: string;
  render: () => React.ReactNode;
}

// Reusable layout blocks
function ContentLines({ color = "bg-foreground/10" }: { color?: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <div className={cn("h-[2px] w-full rounded-[1px]", color)} />
      <div className={cn("h-[1.5px] w-full rounded-[1px]", color)} />
      <div className={cn("h-[1.5px] w-4/5 rounded-[1px]", color)} />
    </div>
  );
}

function SectionBlock({ accent, label = true }: { accent: string; label?: boolean }) {
  return (
    <div className="flex flex-col gap-[3px]">
      {label && <div className={cn("h-[2px] w-2/5 rounded-[1px]", accent)} />}
      <ContentLines />
    </div>
  );
}

const TEMPLATES: TemplateLayout[] = [
  {
    name: "azurill",
    accent: "bg-blue-500",
    render: () => (
      <div className="flex flex-col gap-[5px] p-[6px]">
        {/* Centered header */}
        <div className="flex flex-col items-center gap-[2px] pb-[3px] border-b border-foreground/10">
          <div className="h-[3px] w-3/5 rounded-[1px] bg-blue-500/60" />
          <div className="h-[1.5px] w-2/5 rounded-[1px] bg-foreground/15" />
        </div>
        <SectionBlock accent="bg-blue-500/50" />
        <SectionBlock accent="bg-blue-500/50" />
        <SectionBlock accent="bg-blue-500/50" />
      </div>
    ),
  },
  {
    name: "bronzor",
    accent: "bg-amber-600",
    render: () => (
      <div className="flex h-full">
        {/* Left sidebar */}
        <div className="w-[35%] bg-amber-800/10 p-[5px] flex flex-col gap-[4px]">
          <div className="h-[3px] w-full rounded-[1px] bg-amber-600/50" />
          <div className="h-[1.5px] w-4/5 rounded-[1px] bg-foreground/10" />
          <div className="mt-[2px] h-[2px] w-3/5 rounded-[1px] bg-amber-600/40" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
          <div className="h-[1.5px] w-3/4 rounded-[1px] bg-foreground/10" />
        </div>
        {/* Right content */}
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <SectionBlock accent="bg-amber-600/50" />
          <SectionBlock accent="bg-amber-600/50" />
        </div>
      </div>
    ),
  },
  {
    name: "chikorita",
    accent: "bg-green-600",
    render: () => (
      <div className="flex flex-col gap-[5px] p-[6px]">
        {/* Left-aligned header with green accent */}
        <div className="flex items-start gap-[4px] pb-[3px] border-b-2 border-green-500/30">
          <div className="flex flex-col gap-[2px]">
            <div className="h-[3px] w-12 rounded-[1px] bg-green-600/60" />
            <div className="h-[1.5px] w-8 rounded-[1px] bg-foreground/15" />
          </div>
        </div>
        <SectionBlock accent="bg-green-600/50" />
        <SectionBlock accent="bg-green-600/50" />
        <SectionBlock accent="bg-green-600/50" />
      </div>
    ),
  },
  {
    name: "ditgar",
    accent: "bg-purple-600",
    render: () => (
      <div className="flex flex-col h-full">
        {/* Full-width header band */}
        <div className="bg-purple-700/15 p-[5px] flex flex-col gap-[2px]">
          <div className="h-[3px] w-3/5 rounded-[1px] bg-purple-600/60" />
          <div className="h-[1.5px] w-2/5 rounded-[1px] bg-foreground/15" />
        </div>
        {/* Two-column content */}
        <div className="flex flex-1 gap-[3px] p-[5px]">
          <div className="flex-1 flex flex-col gap-[4px]">
            <div className="h-[2px] w-3/5 rounded-[1px] bg-purple-600/40" />
            <ContentLines />
          </div>
          <div className="w-[40%] flex flex-col gap-[4px]">
            <div className="h-[2px] w-3/5 rounded-[1px] bg-purple-600/40" />
            <ContentLines />
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "ditto",
    accent: "bg-pink-500",
    render: () => (
      <div className="flex flex-col gap-[5px] p-[6px]">
        {/* Minimal header */}
        <div className="flex flex-col gap-[2px] pb-[2px]">
          <div className="h-[3px] w-2/5 rounded-[1px] bg-pink-500/60" />
          <div className="h-[1.5px] w-3/5 rounded-[1px] bg-foreground/12" />
        </div>
        {/* Clean single column */}
        <SectionBlock accent="bg-pink-500/40" />
        <SectionBlock accent="bg-pink-500/40" />
        <SectionBlock accent="bg-pink-500/40" />
      </div>
    ),
  },
  {
    name: "gengar",
    accent: "bg-violet-600",
    render: () => (
      <div className="flex flex-col h-full">
        {/* Dark header */}
        <div className="bg-violet-900/20 p-[5px] flex flex-col items-center gap-[2px]">
          <div className="h-[3px] w-2/5 rounded-[1px] bg-violet-400/60" />
          <div className="h-[1.5px] w-3/5 rounded-[1px] bg-violet-300/20" />
        </div>
        {/* Content */}
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <SectionBlock accent="bg-violet-600/50" />
          <SectionBlock accent="bg-violet-600/50" />
        </div>
      </div>
    ),
  },
  {
    name: "glalie",
    accent: "bg-cyan-600",
    render: () => (
      <div className="flex h-full">
        {/* Left color block sidebar */}
        <div className="w-[30%] bg-cyan-700/15 p-[4px] flex flex-col gap-[3px]">
          <div className="w-5 h-5 rounded-full bg-cyan-600/20 self-center mb-[2px]" />
          <div className="h-[2px] w-full rounded-[1px] bg-cyan-600/40" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
          <div className="h-[1.5px] w-3/4 rounded-[1px] bg-foreground/10" />
          <div className="mt-[2px] h-[2px] w-full rounded-[1px] bg-cyan-600/40" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
        </div>
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <SectionBlock accent="bg-cyan-600/50" />
          <SectionBlock accent="bg-cyan-600/50" />
        </div>
      </div>
    ),
  },
  {
    name: "kakuna",
    accent: "bg-yellow-600",
    render: () => (
      <div className="flex flex-col h-full">
        {/* Header with line accent */}
        <div className="p-[5px] pb-[3px] border-b-2 border-yellow-500/40">
          <div className="h-[3px] w-1/2 rounded-[1px] bg-yellow-600/60" />
          <div className="h-[1.5px] w-2/3 rounded-[1px] bg-foreground/12 mt-[2px]" />
        </div>
        {/* Compact two-column */}
        <div className="flex gap-[4px] flex-1 p-[5px]">
          <div className="flex-1 flex flex-col gap-[4px]">
            <SectionBlock accent="bg-yellow-600/50" />
          </div>
          <div className="flex-1 flex flex-col gap-[4px]">
            <SectionBlock accent="bg-yellow-600/50" />
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "lapras",
    accent: "bg-sky-600",
    render: () => (
      <div className="flex flex-col h-full">
        {/* Large header area */}
        <div className="bg-sky-600/10 p-[6px] flex flex-col gap-[2px]">
          <div className="h-[4px] w-3/5 rounded-[1px] bg-sky-600/50" />
          <div className="h-[1.5px] w-2/5 rounded-[1px] bg-foreground/15" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/8 mt-[2px]" />
        </div>
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <SectionBlock accent="bg-sky-600/50" />
          <SectionBlock accent="bg-sky-600/50" />
        </div>
      </div>
    ),
  },
  {
    name: "leafish",
    accent: "bg-emerald-600",
    render: () => (
      <div className="flex flex-col gap-[5px] p-[6px]">
        {/* Clean header with accent line */}
        <div className="flex flex-col gap-[2px]">
          <div className="h-[3px] w-1/2 rounded-[1px] bg-emerald-600/60" />
          <div className="h-[1px] w-full bg-emerald-500/30 mt-[1px]" />
        </div>
        <SectionBlock accent="bg-emerald-600/50" />
        <SectionBlock accent="bg-emerald-600/50" />
        <SectionBlock accent="bg-emerald-600/50" />
      </div>
    ),
  },
  {
    name: "onyx",
    accent: "bg-stone-700",
    render: () => (
      <div className="flex h-full">
        {/* Classic left sidebar */}
        <div className="w-[32%] bg-stone-800/10 p-[5px] flex flex-col gap-[3px]">
          <div className="h-[3px] w-full rounded-[1px] bg-stone-700/50" />
          <div className="h-[1.5px] w-3/4 rounded-[1px] bg-foreground/10" />
          <div className="mt-[3px] h-[2px] w-4/5 rounded-[1px] bg-stone-700/35" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
          <div className="h-[1.5px] w-2/3 rounded-[1px] bg-foreground/10" />
          <div className="mt-[3px] h-[2px] w-4/5 rounded-[1px] bg-stone-700/35" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
        </div>
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <SectionBlock accent="bg-stone-700/45" />
          <SectionBlock accent="bg-stone-700/45" />
        </div>
      </div>
    ),
  },
  {
    name: "pikachu",
    accent: "bg-orange-500",
    render: () => (
      <div className="flex h-full">
        {/* Main content left */}
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <div className="flex flex-col gap-[2px] pb-[3px]">
            <div className="h-[3.5px] w-3/5 rounded-[1px] bg-orange-500/60" />
            <div className="h-[1.5px] w-2/5 rounded-[1px] bg-foreground/15" />
          </div>
          <SectionBlock accent="bg-orange-500/50" />
          <SectionBlock accent="bg-orange-500/50" />
        </div>
        {/* Right sidebar */}
        <div className="w-[30%] bg-orange-500/8 p-[4px] flex flex-col gap-[3px]">
          <div className="h-[2px] w-4/5 rounded-[1px] bg-orange-500/40" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
          <div className="h-[1.5px] w-3/4 rounded-[1px] bg-foreground/10" />
          <div className="mt-[2px] h-[2px] w-4/5 rounded-[1px] bg-orange-500/40" />
          <div className="h-[1.5px] w-full rounded-[1px] bg-foreground/10" />
        </div>
      </div>
    ),
  },
  {
    name: "rhyhorn",
    accent: "bg-red-600",
    render: () => (
      <div className="flex flex-col h-full">
        {/* Bold header */}
        <div className="bg-red-700/12 p-[5px] flex flex-col gap-[2px]">
          <div className="h-[4px] w-2/5 rounded-[1px] bg-red-600/60" />
          <div className="h-[1.5px] w-3/5 rounded-[1px] bg-foreground/12" />
        </div>
        {/* Single column with bold section headers */}
        <div className="flex-1 p-[5px] flex flex-col gap-[5px]">
          <SectionBlock accent="bg-red-600/50" />
          <SectionBlock accent="bg-red-600/50" />
          <SectionBlock accent="bg-red-600/50" />
        </div>
      </div>
    ),
  },
];

interface TemplateSelectorProps {
  value: string;
  onChange: (template: string) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
      {TEMPLATES.map((template) => (
        <button
          key={template.name}
          type="button"
          onClick={() => onChange(template.name)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border-2 p-1.5 cursor-pointer transition-all duration-200",
            value === template.name
              ? "border-primary ring-2 ring-primary/20 bg-primary/5"
              : "border-border-subtle hover:border-primary/40 hover:shadow-sm"
          )}
        >
          <div className="w-full aspect-[3/4] rounded-md bg-card border border-border-subtle overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            {template.render()}
          </div>
          <span className="text-[11px] font-medium text-text-secondary capitalize">
            {template.name}
          </span>
        </button>
      ))}
    </div>
  );
}

export { TEMPLATES };
