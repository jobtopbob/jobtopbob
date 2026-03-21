"use client";

import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStages } from "@/hooks/use-stages";
import { useJobs, type Job } from "@/hooks/use-jobs";
import { Toolbar } from "./toolbar";
import { BoardDndProvider } from "./board-dnd-provider";
import { KanbanColumn } from "./kanban-column";
import { AddJobSheet } from "./add-job-sheet";
import { JobDetailSheet } from "./job-detail-sheet";
import { MobileJobList } from "./mobile-job-list";
import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoard() {
  const { data: stages, isLoading: stagesLoading, error: stagesError } = useStages();
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useJobs();
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeView, setActiveView] = useState<"kanban" | "table" | "calendar">(
    "kanban"
  );

  const jobsByStage = useMemo(() => {
    const map = new Map<string, Job[]>();
    if (!stages || !jobsData?.data) return map;

    for (const stage of stages) {
      map.set(stage.id, []);
    }
    for (const job of jobsData.data) {
      const stageId = job.stage_id;
      if (stageId && map.has(stageId)) {
        map.get(stageId)!.push(job);
      }
    }
    return map;
  }, [stages, jobsData]);

  const queryClient = useQueryClient();
  const isLoading = stagesLoading || jobsLoading;
  const hasError = stagesError || jobsError;

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["stages"] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Page Header */}
      <div className="px-4 lg:px-7 pt-5">
        <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
          Applications
        </h1>
        <p className="text-[13px] text-[#8B8FA3] mt-1.5">
          Track and manage your job applications across stages.
        </p>
      </div>

      {/* Toolbar */}
      <Toolbar
        activeView={activeView}
        onViewChange={setActiveView}
        onAddJob={() => setAddJobOpen(true)}
      />

      {/* Kanban Columns */}
      <div className="flex-1 overflow-hidden px-4 lg:px-7 pb-4 pt-4">
        {isLoading ? (
          <div className="flex gap-4 h-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-xl h-full" />
            ))}
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-[#1A1A2E] font-medium">
                Unable to load your pipeline
              </p>
              <p className="text-xs text-[#8B8FA3] mt-1">
                Check that the API server is running and try again.
              </p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 rounded-full bg-[#FF8400] text-sm font-medium text-[#111111] hover:bg-[#FF8400]/90"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (stages ?? []).length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-[#1A1A2E] font-medium">
                No stages found
              </p>
              <p className="text-xs text-[#8B8FA3] mt-1">
                Stages could not be loaded. Please refresh or contact support.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop: kanban columns with horizontal scroll */}
            <BoardDndProvider>
              <div className="hidden lg:flex gap-4 h-full overflow-x-auto pr-2">
                {stages!.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    jobs={jobsByStage.get(stage.id) ?? []}
                    onJobClick={setSelectedJob}
                  />
                ))}
              </div>
            </BoardDndProvider>

            {/* Mobile: grouped list view */}
            <div className="lg:hidden h-full overflow-y-auto">
              <MobileJobList
                stages={stages!}
                jobsByStage={jobsByStage}
                onJobClick={setSelectedJob}
              />
            </div>
          </>
        )}
      </div>

      {/* Sheets */}
      <AddJobSheet
        open={addJobOpen}
        onOpenChange={setAddJobOpen}
        stages={stages ?? []}
      />
      <JobDetailSheet
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        stages={stages ?? []}
      />
    </div>
  );
}
