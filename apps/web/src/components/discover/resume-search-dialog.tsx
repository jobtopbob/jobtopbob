"use client";

import { useState } from "react";
import { FileSearch, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useResumes } from "@/hooks/use-resumes";
import { useSearchFromResume } from "@/hooks/use-discover";
import { toast } from "sonner";

export function ResumeSearchDialog() {
  const [open, setOpen] = useState(false);
  const { data: resumes, isLoading: loadingResumes } = useResumes();
  const searchFromResume = useSearchFromResume();

  const handleSelect = (resumeId: string) => {
    searchFromResume.mutate(resumeId, {
      onSuccess: () => {
        toast.success("Analyzing resume... AI will extract search criteria.");
        setOpen(false);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <FileSearch className="h-4 w-4" />
        Search from Resume
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search from Resume</DialogTitle>
          <DialogDescription>
            Select a resume and AI will analyze it to find relevant job searches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {loadingResumes ? (
            <p className="text-sm text-muted-foreground">Loading resumes...</p>
          ) : !resumes || resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resumes found. Add a resume in the Resumes section first.
            </p>
          ) : (
            resumes.map((resume) => (
              <button
                key={resume.id}
                onClick={() => handleSelect(resume.id)}
                disabled={searchFromResume.isPending}
                className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors disabled:opacity-50"
              >
                <FileText className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {resume.name ?? "Untitled Resume"}
                  </p>
                  {resume.headline && (
                    <p className="text-xs text-muted-foreground truncate">
                      {resume.headline}
                    </p>
                  )}
                  {resume.top_skills && resume.top_skills.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {resume.top_skills.slice(0, 5).join(", ")}
                    </p>
                  )}
                </div>
                {searchFromResume.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 ml-auto" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
