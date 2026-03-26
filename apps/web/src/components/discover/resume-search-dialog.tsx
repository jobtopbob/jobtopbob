"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { useResumes } from "@/hooks/use-resumes";
import { useSearchFromResume } from "@/hooks/use-discover";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

const RESUMES_PER_PAGE = 5;

export function ResumeSearchDialog() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: resumes, isLoading: loadingResumes } = useResumes();
  const searchFromResume = useSearchFromResume();

  const totalPages = resumes ? Math.ceil(resumes.length / RESUMES_PER_PAGE) : 0;
  const paginatedResumes = resumes?.slice(
    page * RESUMES_PER_PAGE,
    (page + 1) * RESUMES_PER_PAGE
  );

  const handleSelect = (resumeId: string) => {
    setSelectedId(resumeId);
    searchFromResume.mutate(resumeId, {
      onSuccess: () => {
        toast.success("Analyzing resume... AI will extract search criteria.");
        setOpen(false);
        setSelectedId(null);
        setPage(0);
      },
      onError: (err) => {
        toast.error(err.message);
        setSelectedId(null);
      },
    });
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setPage(0);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className="group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <FileSearch className="h-4 w-4" />
        Search from Resume
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search from Resume</DialogTitle>
          <DialogDescription>
            Select a resume and AI will analyze it to find relevant job
            searches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {loadingResumes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !resumes || resumes.length === 0 ? (
            <div className="flex flex-col items-center py-6 px-4 text-center">
              <Image
                src="/icons/resume-empty.svg"
                alt=""
                width={64}
                height={64}
                className="mb-4 opacity-30"
              />
              <p className="text-sm font-medium text-foreground">
                No resumes yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
                Create a resume first so AI can analyze it and find relevant job
                searches for you.
              </p>
              <Link
                href="/resumes"
                onClick={() => setOpen(false)}
                className={buttonVariants({ size: "sm", className: "mt-4" })}
              >
                Go to Resumes
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {paginatedResumes?.map((resume) => {
                  const isSelected =
                    searchFromResume.isPending && selectedId === resume.id;
                  return (
                    <button
                      key={resume.id}
                      onClick={() => handleSelect(resume.id)}
                      disabled={searchFromResume.isPending}
                      className="w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {resume.name ?? "Untitled Resume"}
                        </p>
                        {resume.headline && (
                          <p className="text-xs text-muted-foreground">
                            {resume.headline}
                          </p>
                        )}
                        {resume.top_skills && resume.top_skills.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {resume.top_skills.slice(0, 5).join(", ")}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0 ml-auto mt-0.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || searchFromResume.isPending}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={
                      page >= totalPages - 1 || searchFromResume.isPending
                    }
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
