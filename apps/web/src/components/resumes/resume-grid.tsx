"use client";

import { FileText, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeCard } from "./resume-card";
import { ResumeCardSkeleton } from "./resume-card-skeleton";
import type { Resume } from "@/hooks/use-resumes";

interface ResumeGridProps {
  resumes: Resume[];
  isLoading: boolean;
  onCreateClick: () => void;
  onEdit: (resume: Resume) => void;
  onDuplicate: (resume: Resume) => void;
  onExportPDF: (resume: Resume) => void;
  onSetBase: (resume: Resume) => void;
  onDelete: (resume: Resume) => void;
}

export function ResumeGrid({
  resumes,
  isLoading,
  onCreateClick,
  onEdit,
  onDuplicate,
  onExportPDF,
  onSetBase,
  onDelete,
}: ResumeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <ResumeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-text-primary">
          No resumes yet
        </h3>
        <p className="text-sm text-text-muted mt-1 mb-6 max-w-sm">
          Create your first resume in the Resume Builder. Once created, it will
          appear here automatically when you sync.
        </p>
        <Button onClick={onCreateClick} className="gap-1.5">
          <ExternalLink className="w-4 h-4" />
          Open Resume Builder
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Create New card */}
      <button
        onClick={onCreateClick}
        className="rounded-xl border-2 border-dashed border-border-subtle bg-transparent flex flex-col items-center justify-center gap-3 min-h-[280px] text-text-muted hover:border-primary/50 hover:text-primary transition-all duration-200 hover:bg-primary/5 cursor-pointer"
      >
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium">Create in Builder</span>
      </button>

      {/* Resume cards */}
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onEdit={() => onEdit(resume)}
          onDuplicate={() => onDuplicate(resume)}
          onExportPDF={() => onExportPDF(resume)}
          onSetBase={() => onSetBase(resume)}
          onDelete={() => onDelete(resume)}
        />
      ))}
    </div>
  );
}
