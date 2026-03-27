"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useUpdateJob } from "@/hooks/use-jobs";
import { toast } from "sonner";
import type { ReactNode } from "react";
import type { Stage } from "@/hooks/use-stages";

interface BoardDndProviderProps {
  children: ReactNode;
  stages?: Stage[];
  /** Called when a job is dropped onto an offer stage so the user can fill in details. */
  onOfferPrompt?: (jobId: string) => void;
}

export function BoardDndProvider({
  children,
  stages,
  onOfferPrompt,
}: BoardDndProviderProps) {
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
            onSuccess: () => {
              // Prompt the user to fill in offer details when moving to an offer stage.
              // The backend auto-creates a stub offer, but salary/equity/deadline still need input.
              if (stages && onOfferPrompt) {
                const targetStage = stages.find((s) => s.id === newStageId);
                if (targetStage?.mapped_status === "offer") {
                  toast("Job moved to Offer stage", {
                    action: {
                      label: "Add Offer Details",
                      onClick: () => onOfferPrompt(jobId),
                    },
                  });
                }
              }
            },
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
