"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "kanban" | "table" | "calendar";

interface ToolbarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  onAddJob: () => void;
}

const views: { id: View; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "table", label: "Table" },
  { id: "calendar", label: "Calendar" },
];

export function Toolbar({ activeView, onViewChange, onAddJob }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between h-[52px] px-4 lg:px-7">
      {/* Left: View Switcher — all tabs on desktop, hide "Kanban" below lg (list view replaces it) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-[#F5F5F7] p-1 h-9">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                activeView === view.id
                  ? "bg-white text-[#1A1A2E] shadow-sm"
                  : "text-[#8B8FA3] hover:text-[#1A1A2E]"
              )}
            >
              {view.id === "kanban" ? (
                <>
                  <span className="lg:hidden">List</span>
                  <span className="hidden lg:inline">Kanban</span>
                </>
              ) : (
                view.label
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="flex items-center gap-1.5 h-9 lg:h-10 px-3 lg:px-4 rounded-full border border-[#EBEBEF] bg-white text-xs lg:text-sm font-medium text-[#1A1A2E] shadow-sm hover:bg-[#F5F5F7]">
          Filter
        </button>
        <button className="flex items-center gap-1.5 h-9 lg:h-10 px-3 lg:px-4 rounded-full border border-[#EBEBEF] text-xs lg:text-sm font-medium text-[#1A1A2E] hover:bg-[#F5F5F7]">
          Sort
        </button>
        <button
          onClick={onAddJob}
          className="flex items-center gap-1.5 h-9 lg:h-10 px-3 lg:px-4 rounded-full bg-[#FF8400] text-xs lg:text-sm font-medium text-[#111111] hover:bg-[#FF8400]/90"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="hidden sm:inline">Add Job</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </div>
  );
}
