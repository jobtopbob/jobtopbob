"use client";

import { FileText, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeCard } from "./resume-card";
import { ResumeCardSkeleton } from "./resume-card-skeleton";
import type { Resume, ResumeConfig } from "@/hooks/use-resumes";

interface ResumeGridProps {
  resumes: Resume[];
  isLoading: boolean;
  config?: ResumeConfig;
  onCreateClick: () => void;
  onEdit: (resume: Resume) => void;
  onExportPDF: (resume: Resume) => void;
  onSetBase: (resume: Resume) => void;
  onDelete: (resume: Resume) => void;
}

export function ResumeGrid({
  resumes,
  isLoading,
  config,
  onCreateClick,
  onEdit,
  onExportPDF,
  onSetBase,
  onDelete,
}: ResumeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {config?.builder_configured ? (
          <>
            <h3 className="font-heading text-xl font-semibold text-text-primary">
              Start building your resume collection
            </h3>
            <p className="text-sm text-text-muted mt-2 mb-8 max-w-md leading-relaxed">
              Create your first resume in the Resume Builder. Your resumes will
              sync automatically and appear here, ready for tailoring to
              specific job applications.
            </p>
            <Button onClick={onCreateClick} size="lg" className="gap-2">
              Open Resume Builder
            </Button>
          </>
        ) : (
          <>
            <h3 className="font-heading text-xl font-semibold text-text-primary">
              Resume Builder not set up yet
            </h3>
            <p className="text-sm text-text-muted mt-2 mb-4 max-w-md leading-relaxed">
              Configure the Resume Builder service in your environment to start
              creating and managing resumes. Check your{" "}
              <code className="text-xs bg-surface px-1.5 py-0.5 rounded">
                .env
              </code>{" "}
              and{" "}
              <code className="text-xs bg-surface px-1.5 py-0.5 rounded">
                docker-compose.yml
              </code>{" "}
              files.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Create New card */}
      {config?.builder_configured ? (
        <button
          onClick={onCreateClick}
          className="group/create rounded-2xl bg-card shadow-sm min-h-[340px] cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
          <div className="rounded-2xl h-full flex flex-col items-center justify-center gap-5 transition-colors duration-300">
            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center transition-transform duration-300 group-hover/create:scale-110">
              <Plus className="w-8 h-8 text-text-muted group-hover/create:text-primary transition-colors duration-300" />
            </div>
            <div className="text-center">
              <span className="text-[15px] font-semibold text-text-primary block">
                Create New Resume
              </span>
              <span className="text-xs text-text-muted mt-1 block">
                Open the Resume Builder
              </span>
            </div>
          </div>
        </button>
      ) : (
        <div className="rounded-2xl bg-card shadow-sm border border-dashed border-border-subtle min-h-[340px] flex flex-col items-center justify-center gap-5 p-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <div className="text-center">
            <span className="text-[15px] font-semibold text-text-primary block">
              Builder not configured
            </span>
            <span className="text-xs text-text-muted mt-1 block">
              Set up the Resume Builder to create resumes
            </span>
          </div>
        </div>
      )}

      {/* Resume cards */}
      {resumes.map((resume, i) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          index={i + 1}
          config={config}
          onEdit={() => onEdit(resume)}
          onExportPDF={() => onExportPDF(resume)}
          onSetBase={() => onSetBase(resume)}
          onDelete={() => onDelete(resume)}
        />
      ))}
    </div>
  );
}
