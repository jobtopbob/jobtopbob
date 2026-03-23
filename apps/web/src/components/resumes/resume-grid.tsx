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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {/* Overlapping document icon composition */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute w-16 h-20 rounded-xl bg-surface border border-border-subtle left-1/2 top-1/2 -translate-x-[55%] -translate-y-[55%] rotate-[-6deg]" />
          <div className="absolute w-16 h-20 rounded-xl bg-card border border-border-subtle shadow-sm left-1/2 top-1/2 -translate-x-[50%] -translate-y-[50%] rotate-[3deg]" />
          <div className="absolute w-16 h-20 rounded-xl bg-card border border-border-subtle shadow-md left-1/2 top-1/2 -translate-x-[45%] -translate-y-[45%] flex items-center justify-center">
            <FileText className="w-7 h-7 text-text-muted" />
          </div>
        </div>
        <h3 className="font-heading text-xl font-semibold text-text-primary">
          Start building your resume collection
        </h3>
        <p className="text-sm text-text-muted mt-2 mb-8 max-w-md leading-relaxed">
          Create your first resume in the Resume Builder. Your resumes will sync
          automatically and appear here, ready for tailoring to specific job
          applications.
        </p>
        <Button onClick={onCreateClick} size="lg" className="gap-2">
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
        className="group/create rounded-xl bg-gradient-to-br from-brand/20 via-brand-blue/20 to-brand-green/20 p-[1px] min-h-[320px] cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      >
        <div className="rounded-[11px] bg-card h-full flex flex-col items-center justify-center gap-4 transition-colors duration-200 group-hover/create:bg-card/80">
          <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center transition-transform duration-200 group-hover/create:scale-110">
            <Plus className="w-7 h-7 text-text-muted group-hover/create:text-primary transition-colors duration-200" />
          </div>
          <div className="text-center">
            <span className="text-sm font-semibold text-text-primary block">
              Create New Resume
            </span>
            <span className="text-xs text-text-muted mt-0.5 block">
              Open the Resume Builder
            </span>
          </div>
        </div>
      </button>

      {/* Resume cards */}
      {resumes.map((resume, i) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          index={i + 1}
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
