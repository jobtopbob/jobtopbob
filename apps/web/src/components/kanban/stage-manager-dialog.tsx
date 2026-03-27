"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import {
  useStages,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
  type Stage,
} from "@/hooks/use-stages";
import { toast } from "sonner";

const STAGE_COLORS = [
  "#6B7280", "#3B82F6", "#8B5CF6", "#10B981",
  "#F59E0B", "#EF4444", "#EC4899", "#14B8A6",
];

const MAPPED_STATUSES = ["open", "interviewing", "offer", "accepted", "rejected", "closed"] as const;

interface StageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StageManagerDialog({ open, onOpenChange }: StageManagerDialogProps) {
  const { data: stages = [] } = useStages();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
  };

  const saveEdit = async (stage: Stage) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === stage.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateStage.mutateAsync({ id: stage.id, body: { name: trimmed } });
      setEditingId(null);
    } catch {
      toast.error("Failed to rename stage");
    }
  };

  const handleColorChange = async (stage: Stage, color: string) => {
    try {
      await updateStage.mutateAsync({ id: stage.id, body: { color } });
    } catch {
      toast.error("Failed to update color");
    }
  };

  const handleDelete = async (stage: Stage) => {
    if (!confirm(`Delete "${stage.name}"? Jobs in this stage will need to be reassigned.`)) return;
    try {
      await deleteStage.mutateAsync(stage.id);
      toast.success(`Deleted "${stage.name}"`);
    } catch {
      toast.error("Failed to delete stage");
    }
  };

  const handleAdd = async () => {
    const position = stages.length;
    try {
      await createStage.mutateAsync({
        name: "New Stage",
        position,
        color: STAGE_COLORS[position % STAGE_COLORS.length],
        mapped_status: "open",
      });
    } catch {
      toast.error("Failed to add stage");
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const reordered = [...stages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await reorderStages.mutateAsync(
        reordered.map((s, i) => ({ id: s.id, position: i }))
      );
    } catch {
      toast.error("Failed to reorder stages");
    }
  };

  const handleMappedStatusChange = async (stage: Stage, mappedStatus: string) => {
    const isTerminal = ["accepted", "rejected", "closed"].includes(mappedStatus);
    try {
      await updateStage.mutateAsync({
        id: stage.id,
        body: { mapped_status: mappedStatus, is_terminal: isTerminal },
      });
    } catch {
      toast.error("Failed to update status mapping");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Stages</DialogTitle>
          <DialogDescription>
            Customize your application pipeline stages.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto -mx-1 px-1 space-y-1.5">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-surface group"
            >
              <GripVertical className="w-4 h-4 text-text-muted shrink-0" />

              {/* Color picker */}
              <div className="relative shrink-0">
                <input
                  type="color"
                  value={stage.color ?? "#6B7280"}
                  onChange={(e) => handleColorChange(stage, e.target.value)}
                  className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
                />
                <span
                  className="block w-6 h-6 rounded-full border border-border-subtle cursor-pointer"
                  style={{ backgroundColor: stage.color ?? "#6B7280" }}
                />
              </div>

              {/* Name */}
              {editingId === stage.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveEdit(stage)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(stage);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="flex-1 min-w-0 px-2 py-1 text-xs font-medium bg-card border border-border-subtle rounded outline-none focus:border-brand"
                />
              ) : (
                <button
                  onClick={() => startEdit(stage)}
                  className="flex-1 min-w-0 text-left text-xs font-medium text-text-primary truncate hover:text-brand transition-colors"
                >
                  {stage.name}
                </button>
              )}

              {/* Mapped status */}
              <select
                value={stage.mapped_status ?? "open"}
                onChange={(e) => handleMappedStatusChange(stage, e.target.value)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border-subtle text-text-muted outline-none cursor-pointer"
              >
                {MAPPED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>

              {/* Reorder */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === stages.length - 1}
                  className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(stage)}
                className="p-1 shrink-0 text-text-muted hover:text-brand-red opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Stage
        </Button>
      </DialogContent>
    </Dialog>
  );
}
