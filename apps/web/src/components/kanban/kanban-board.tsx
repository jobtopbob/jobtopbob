"use client";

import { useState, useMemo } from "react";
import { useStages } from "@/hooks/use-stages";
import { useJobs, type Job } from "@/hooks/use-jobs";
import { Toolbar } from "./toolbar";
import { BoardDndProvider } from "./board-dnd-provider";
import { KanbanColumn } from "./kanban-column";
import { AddJobSheet } from "./add-job-sheet";
import { JobDetailSheet } from "./job-detail-sheet";
import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoard() {
  const { data: stages, isLoading: stagesLoading } = useStages();
  const { data: jobsData, isLoading: jobsLoading } = useJobs();
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

  const isLoading = stagesLoading || jobsLoading;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Page Header */}
      <div className="px-7 pt-5">
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
      <div className="flex-1 overflow-hidden px-7 pb-4 pt-4">
        {isLoading ? (
          <div className="flex gap-4 h-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-xl h-full" />
            ))}
          </div>
        ) : (
          <BoardDndProvider>
            <div className="flex gap-4 h-full">
              {(stages ?? []).map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  jobs={jobsByStage.get(stage.id) ?? []}
                  onJobClick={setSelectedJob}
                />
              ))}
            </div>
          </BoardDndProvider>
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
