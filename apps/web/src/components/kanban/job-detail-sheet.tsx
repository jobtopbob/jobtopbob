"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUpdateJob, useDeleteJob, type Job } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import type { Tag } from "@/hooks/use-tags";
import { toast } from "sonner";
import {
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface JobDetailSheetProps {
  job: Job | null;
  onClose: () => void;
  stages: Stage[];
}

function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (!min && !max) return "Not specified";
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobDetailSheet({ job, onClose, stages }: JobDetailSheetProps) {
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  if (!job) return null;

  const handleStageChange = (stageId: string | null) => {
    if (!stageId) return;
    updateJob.mutate(
      { id: job.id, body: { stage_id: stageId } },
      {
        onError: () => toast.error("Failed to update stage"),
      }
    );
  };

  const handleDelete = () => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        toast.success("Job deleted");
        onClose();
      },
      onError: () => toast.error("Failed to delete job"),
    });
  };

  const tags = (job.tags ?? []) as Tag[];
  const currentStage = stages.find((s) => s.id === job.stage_id);

  return (
    <Sheet open={!!job} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader className="space-y-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#8B8FA3]">
            <span>Applications</span>
            <span>/</span>
            {job.company_logo_url && (
              <img
                src={job.company_logo_url}
                alt=""
                className="w-4 h-4 rounded-sm object-contain"
              />
            )}
            <span>{job.company_name ?? "Unknown"}</span>
            <span>/</span>
            <span className="text-[#1A1A2E] font-medium">{job.title}</span>
          </div>
          <SheetTitle className="text-xl">{job.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stage selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8B8FA3] w-20">Stage</span>
            <Select
              value={job.stage_id ?? ""}
              onValueChange={handleStageChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#1A1A2E]">
              Job Details
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-[#8B8FA3] shrink-0" />
                <span className="text-sm text-[#8B8FA3] w-20">Company</span>
                <span className="text-sm text-[#1A1A2E]">
                  {job.company_name ?? "Not specified"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-[#8B8FA3] shrink-0" />
                <span className="text-sm text-[#8B8FA3] w-20">Salary</span>
                <span className="text-sm text-[#1A1A2E]">
                  {formatSalaryRange(job.salary_min, job.salary_max)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#8B8FA3] shrink-0" />
                <span className="text-sm text-[#8B8FA3] w-20">Location</span>
                <span className="text-sm text-[#1A1A2E]">
                  {job.location ?? "Not specified"}
                  {job.location_type && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[10px] text-[#8B8FA3] font-medium uppercase">
                      {job.location_type}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#8B8FA3] shrink-0" />
                <span className="text-sm text-[#8B8FA3] w-20">Applied</span>
                <span className="text-sm text-[#1A1A2E]">
                  {formatDate(job.applied_at)}
                </span>
              </div>

              {job.source_url && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-[#8B8FA3] shrink-0" />
                  <span className="text-sm text-[#8B8FA3] w-20">Job URL</span>
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#2A85FF] hover:underline truncate"
                  >
                    {job.source_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#1A1A2E]">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full bg-[#F5F5F7] text-xs text-[#8B8FA3]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Job Description */}
          {job.jd_raw && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#1A1A2E]">
                Job Description
              </h3>
              <p className="text-sm text-[#1A1A2E] whitespace-pre-wrap leading-relaxed">
                {job.jd_raw}
              </p>
            </div>
          )}

          {/* Interest */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8B8FA3] w-20">Interest</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`w-5 h-5 rounded-full ${
                    (job.interest ?? 0) >= n
                      ? "bg-[#FF8400]"
                      : "bg-[#F5F5F7]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Delete */}
          <div className="pt-4 border-t border-[#EBEBEF]">
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Application
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Application</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{job.title}&quot; at{" "}
                    {job.company_name ?? "Unknown"}? This action cannot be
                    undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteJob.isPending}
                  >
                    {deleteJob.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
