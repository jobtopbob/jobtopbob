"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useUpdateJob } from "@/hooks/use-jobs";
import { toast } from "sonner";
import type { ReactNode } from "react";

interface BoardDndProviderProps {
  children: ReactNode;
}

export function BoardDndProvider({ children }: BoardDndProviderProps) {
  const updateJob = useUpdateJob();

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;

        const source = event.operation.source;
        const target = event.operation.target;

        if (!source || !target) return;

        const jobId = source.id as string;
        const newStageId = target.id as string;
        const oldStageId = (source.data as { stageId?: string })?.stageId;

        // Same column — no-op
        if (oldStageId === newStageId) return;

        updateJob.mutate(
          { id: jobId, body: { stage_id: newStageId } },
          {
            onError: () => {
              toast.error("Failed to move job. Please try again.");
            },
          }
        );
      }}
    >
      {children}
    </DragDropProvider>
  );
}
