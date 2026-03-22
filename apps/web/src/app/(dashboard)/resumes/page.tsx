"use client";

import { useState } from "react";
import {
  useResumes,
  useExportResumePDF,
  useSetBaseResume,
  useCreateResume,
  type Resume,
} from "@/hooks/use-resumes";
import { ResumeGrid } from "@/components/resumes/resume-grid";
import { CreateResumeDialog } from "@/components/resumes/create-resume-dialog";
import { DeleteResumeDialog } from "@/components/resumes/delete-resume-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const BUILDER_URL =
  process.env.NEXT_PUBLIC_RESUME_BUILDER_URL ?? "http://localhost:3010";

export default function ResumesPage() {
  const { data: resumes, isLoading } = useResumes();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);

  const exportPDF = useExportResumePDF();
  const setBase = useSetBaseResume();
  const createResume = useCreateResume();

  const baseResume = resumes?.find((r) => r.is_base);

  const handleEdit = (resume: Resume) => {
    const url = resume.rxresume_id
      ? `${BUILDER_URL}/builder/${resume.rxresume_id}`
      : BUILDER_URL;
    window.open(url, "_blank");
  };

  const handleDuplicate = (resume: Resume) => {
    createResume.mutate(
      { name: `${resume.name} (copy)` },
      {
        onSuccess: () => toast.success("Resume duplicated"),
        onError: () => toast.error("Failed to duplicate resume"),
      }
    );
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
              Manage and tailor your resumes for different job applications.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Resume
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4">
          <div className="flex-1 rounded-xl bg-card border border-border-subtle p-5">
            <span className="text-[13px] font-medium text-text-muted">
              Total Resumes
            </span>
            <div className="text-[28px] font-bold leading-none text-text-primary mt-2">
              {isLoading ? "--" : (resumes?.length ?? 0)}
            </div>
          </div>
          <div className="flex-1 rounded-xl bg-card border border-border-subtle p-5">
            <span className="text-[13px] font-medium text-text-muted">
              Base Resume
            </span>
            <div className="text-[28px] font-bold leading-none text-text-primary mt-2 truncate">
              {isLoading ? "--" : (baseResume?.name ?? "Not set")}
            </div>
          </div>
        </div>

        {/* Resume Grid */}
        <ResumeGrid
          resumes={resumes ?? []}
          isLoading={isLoading}
          onCreateClick={() => setCreateOpen(true)}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onExportPDF={handleExportPDF}
          onSetBase={handleSetBase}
          onDelete={(resume) => setDeleteTarget(resume)}
        />

        {/* Dialogs */}
        <CreateResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
        <DeleteResumeDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resume={deleteTarget}
        />
      </div>
    </div>
  );
}
