"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useResumes,
  useExportResumePDF,
  useSetBaseResume,
  useSyncResumes,
  type Resume,
} from "@/hooks/use-resumes";
import { ResumeGrid } from "@/components/resumes/resume-grid";
import { DeleteResumeDialog } from "@/components/resumes/delete-resume-dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  RefreshCw,
  FileText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BUILDER_URL =
  process.env.NEXT_PUBLIC_RESUME_BUILDER_URL ?? "http://localhost:3010";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-card border border-border-subtle p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-text-muted" />
        </div>
        <div className="min-w-0">
          <span className="text-[13px] font-medium text-text-muted block">
            {label}
          </span>
          <div className="text-2xl font-bold leading-none text-text-primary mt-1 truncate">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const { data: resumes, isLoading } = useResumes();
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);

  const exportPDF = useExportResumePDF();
  const setBase = useSetBaseResume();
  const syncResumes = useSyncResumes();

  const baseResume = resumes?.find((r) => r.is_base);

  // Auto-refresh when user returns to this tab (e.g., after editing in RxResume)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["resumes"] });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);

  const openBuilder = () => {
    window.open(BUILDER_URL, "_blank");
  };

  const handleEdit = (resume: Resume) => {
    const url = resume.rxresume_id
      ? `${BUILDER_URL}/builder/${resume.rxresume_id}`
      : BUILDER_URL;
    window.open(url, "_blank");
  };

  const handleDuplicate = (resume: Resume) => {
    // Duplicate opens the builder — user can duplicate from within RxResume
    if (resume.rxresume_id) {
      window.open(`${BUILDER_URL}/builder/${resume.rxresume_id}`, "_blank");
    } else {
      window.open(BUILDER_URL, "_blank");
    }
  };

  const handleExportPDF = (resume: Resume) => {
    exportPDF.mutate(resume.id, {
      onSuccess: (data) => {
        window.open(data.url, "_blank");
        toast.success("PDF exported");
      },
      onError: () => toast.error("Failed to export PDF"),
    });
  };

  const handleSetBase = (resume: Resume) => {
    setBase.mutate(resume.id, {
      onSuccess: () => toast.success(`"${resume.name}" set as base resume`),
      onError: () => toast.error("Failed to set base resume"),
    });
  };

  const handleSync = () => {
    syncResumes.mutate(undefined, {
      onSuccess: (data) => {
        switch (data.sync_status) {
          case "synced":
            toast.success(
              data.resumes.length > 0
                ? `Synced ${data.resumes.length} resume${data.resumes.length === 1 ? "" : "s"}`
                : "Sync complete — no resumes found in Resume Builder"
            );
            break;
          case "skipped":
            toast.warning(
              data.sync_message ??
                "Sync skipped — Resume Builder is not configured"
            );
            break;
          case "failed":
            toast.error(
              data.sync_message ?? "Sync failed — showing local resumes only"
            );
            break;
        }
      },
      onError: () => toast.error("Failed to sync resumes"),
    });
  };

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col gap-6 p-7 pt-7 overflow-y-auto">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-4xl font-bold text-text-primary tracking-tight"
              style={{ letterSpacing: -1 }}
            >
              Resumes
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              Sync from the builder, tailor for specific roles, and export when
              ready.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSync}
              disabled={syncResumes.isPending}
              title="Sync from Resume Builder"
            >
              <RefreshCw
                className={cn(
                  "w-4 h-4",
                  syncResumes.isPending && "animate-spin"
                )}
              />
            </Button>
            <Button onClick={openBuilder} className="gap-1.5">
              <ExternalLink className="w-4 h-4" />
              Open Builder
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-4">
          <StatCard
            icon={FileText}
            label="Total Resumes"
            value={isLoading ? "--" : String(resumes?.length ?? 0)}
          />
          <StatCard
            icon={Star}
            label="Base Resume"
            value={isLoading ? "--" : (baseResume?.name ?? "Not set")}
          />
        </div>

        {/* Resume Grid */}
        <ResumeGrid
          resumes={resumes ?? []}
          isLoading={isLoading}
          onCreateClick={openBuilder}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onExportPDF={handleExportPDF}
          onSetBase={handleSetBase}
          onDelete={(resume) => setDeleteTarget(resume)}
        />

        {/* Dialogs */}
        <DeleteResumeDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resume={deleteTarget}
        />
      </div>
    </div>
  );
}
