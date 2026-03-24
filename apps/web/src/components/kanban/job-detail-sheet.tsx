"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateJob, useDeleteJob, type Job } from "@/hooks/use-jobs";
import {
  useActivityLog,
  useAssignTag,
  useRemoveTag,
  type ActivityLogEntry,
} from "@/hooks/use-job-extras";
import type { Stage } from "@/hooks/use-stages";
import { useTags, type Tag } from "@/hooks/use-tags";
import { InlineEditField } from "./inline-edit-field";
import { StageIcon } from "./stage-icons";
import { SOURCES, LOCATION_TYPES, CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";
import {
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  ExternalLink,
  Trash2,
  X,
  Plus,
  Clock,
  Briefcase,
  Globe,
  Star,
  AlertCircle,
  FileText,
  Activity,
  Info,
  ChevronDown,
} from "lucide-react";

interface JobDetailSheetProps {
  job: Job | null;
  onClose: () => void;
  stages: Stage[];
}

type TabId = "details" | "description" | "activity";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function actionLabel(action: string | null | undefined): string {
  switch (action) {
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "deleted":
      return "Deleted";
    case "imported":
      return "Imported";
    default:
      return action ?? "Action";
  }
}

export function JobDetailSheet({ job, onClose, stages }: JobDetailSheetProps) {
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();
  const { data: allTags } = useTags();
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);

  const measureTabIndicator = useCallback(() => {
    const bar = tabBarRef.current;
    const btn = tabButtonRefs.current.get(activeTab);
    if (!bar || !btn) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setTabIndicator({
      left: btnRect.left - barRect.left + 8,
      width: btnRect.width - 16,
    });
  }, [activeTab]);

  useEffect(() => {
    measureTabIndicator();
  }, [measureTabIndicator]);

  const {
    data: activityEntries,
    isLoading: activityLoading,
  } = useActivityLog(activeTab === "activity" ? job?.id : undefined);

  const [prevJobId, setPrevJobId] = useState(job?.id);
  if (job?.id !== prevJobId) {
    setPrevJobId(job?.id);
    setActiveTab("details");
    setEditingDescription(false);
    setDescriptionDraft("");
  }

  if (!job) return null;

  const tags = (job.tags ?? []) as Tag[];
  const currentStage = stages.find((s) => s.id === job.stage_id);
  const unassignedTags = (allTags ?? []).filter(
    (t) => !tags.some((jt) => jt.id === t.id)
  );

  const handleUpdate = (field: string, value: string) => {
    const body: Record<string, unknown> = {};
    if (field === "salary_min" || field === "salary_max") {
      body[field] = value ? parseInt(value) : null;
    } else if (field === "interest") {
      body[field] = value ? parseInt(value) : null;
    } else if (field === "applied_at" || field === "follow_up_at") {
      body[field] = value ? new Date(value).toISOString() : null;
    } else {
      body[field] = value || null;
    }
    updateJob.mutate(
      { id: job.id, body },
      { onError: () => toast.error("Failed to update") }
    );
  };

  const handleStageChange = (stageId: string) => {
    updateJob.mutate(
      { id: job.id, body: { stage_id: stageId } },
      { onError: () => toast.error("Failed to update stage") }
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

  const handleSaveDescription = () => {
    updateJob.mutate(
      { id: job.id, body: { jd_raw: descriptionDraft || null } },
      {
        onSuccess: () => {
          setEditingDescription(false);
          toast.success("Description updated");
        },
        onError: () => toast.error("Failed to update description"),
      }
    );
  };

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: "details", label: "Details", icon: FileText },
    { id: "description", label: "Description", icon: Info },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <Sheet open={!!job} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-0 space-y-3">
          <div className="flex items-center gap-2.5">
            {job.company_logo_url ? (
              <Image
                src={job.company_logo_url}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="w-9 h-9 rounded-xl object-contain bg-card border border-border-subtle p-0.5"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-hover to-surface-active flex items-center justify-center text-sm font-semibold text-text-tertiary">
                {(job.company_name ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-[13px] font-medium text-text-tertiary">
              {job.company_name ?? "Unknown Company"}
            </span>
          </div>

          <SheetTitle className="text-xl font-semibold tracking-[-0.02em] text-text-primary">
            {job.title}
          </SheetTitle>

          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-full transition-colors"
                    style={{
                      backgroundColor: currentStage?.color
                        ? `${currentStage.color}18`
                        : "var(--surface-hover)",
                      color: currentStage?.color ?? "var(--text-tertiary)",
                    }}
                  >
                    <StageIcon
                      stageName={currentStage?.name ?? ""}
                      className="w-3.5 h-3.5"
                      color={currentStage?.color ?? undefined}
                    />
                    {currentStage?.name ?? "Set stage"}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                }
              />
              <DropdownMenuContent align="start">
                {stages.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                  >
                    <StageIcon
                      stageName={stage.name}
                      className="w-4 h-4 mr-1.5 shrink-0"
                      color={stage.color ?? undefined}
                    />
                    {stage.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {job.source && (
              <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-surface-hover text-[11px] font-medium text-text-tertiary">
                {SOURCES.find((s) => s.value === job.source)?.label ??
                  job.source}
              </span>
            )}

            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-medium text-brand-blue hover:bg-brand-blue/5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View posting
              </a>
            )}
          </div>
        </SheetHeader>

        {/* Tab bar */}
        <div ref={tabBarRef} className="relative flex gap-0 mx-6 mt-5 border-b border-border-subtle">
          {tabIndicator && (
            <span
              className="absolute bottom-[-1px] h-[2px] bg-text-primary rounded-full transition-[left,width] duration-200 ease-out"
              style={{ left: tabIndicator.left, width: tabIndicator.width }}
            />
          )}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabButtonRefs.current.set(tab.id, el);
              }}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? "text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={activeTab} className="flex-1 px-6 py-5 animate-in fade-in-0 duration-150">
          {activeTab === "details" && (
            <DetailsTab
              job={job}
              tags={tags}
              unassignedTags={unassignedTags}
              onUpdate={handleUpdate}
              onAssignTag={(tagId) =>
                assignTag.mutate(
                  { jobId: job.id, tagId },
                  { onError: () => toast.error("Failed to assign tag") }
                )
              }
              onRemoveTag={(tagId) =>
                removeTag.mutate(
                  { jobId: job.id, tagId },
                  { onError: () => toast.error("Failed to remove tag") }
                )
              }
            />
          )}

          {activeTab === "description" && (
            <DescriptionTab
              job={job}
              editing={editingDescription}
              draft={descriptionDraft}
              onStartEdit={() => {
                setDescriptionDraft(job.jd_raw ?? "");
                setEditingDescription(true);
              }}
              onDraftChange={setDescriptionDraft}
              onSave={handleSaveDescription}
              onCancel={() => setEditingDescription(false)}
              isSaving={updateJob.isPending}
            />
          )}

          {activeTab === "activity" && (
            <ActivityTab
              entries={activityEntries ?? []}
              isLoading={activityLoading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          {job.close_reason && (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-brand-red/5 border border-brand-red/10 text-[13px] text-brand-red">
              <span className="font-semibold">Closed:</span> {job.close_reason}
            </div>
          )}
          <div className="pt-4 border-t border-border-subtle">
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-red hover:text-brand-red hover:bg-brand-red/5"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Application</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{job.title}&quot; at{" "}
                    {job.company_name ?? "Unknown"}? This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
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

/* ─── Details Tab ─── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
      {children}
    </h4>
  );
}

function DetailsTab({
  job,
  tags,
  unassignedTags,
  onUpdate,
  onAssignTag,
  onRemoveTag,
}: {
  job: Job;
  tags: Tag[];
  unassignedTags: Tag[];
  onUpdate: (field: string, value: string) => void;
  onAssignTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Property card */}
      <div className="rounded-xl bg-surface border border-border-subtle shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-border-subtle">
        {/* Job Info */}
        <div className="p-4 space-y-0.5">
          <SectionLabel>Job Info</SectionLabel>
          <InlineEditField
            icon={Building2}
            label="Company"
            value={job.company_name}
            type="text"
            placeholder="Add company"
            onSave={(v) => onUpdate("company_name", v)}
          />
          <InlineEditField
            icon={MapPin}
            label="Location"
            value={job.location}
            type="text"
            placeholder="Add location"
            onSave={(v) => onUpdate("location", v)}
          />
          <InlineEditField
            icon={Globe}
            label="Location Type"
            value={job.location_type}
            type="select"
            options={LOCATION_TYPES}
            placeholder="Select type"
            onSave={(v) => onUpdate("location_type", v)}
          />
          <InlineEditField
            icon={Briefcase}
            label="Source"
            value={job.source}
            type="select"
            options={SOURCES}
            placeholder="Select source"
            onSave={(v) => onUpdate("source", v)}
          />
        </div>

        {/* Compensation */}
        <div className="p-4 space-y-0.5">
          <SectionLabel>Compensation</SectionLabel>
          <InlineEditField
            icon={DollarSign}
            label="Salary Min"
            value={job.salary_min}
            type="number"
            placeholder="e.g. 150000"
            onSave={(v) => onUpdate("salary_min", v)}
          />
          <InlineEditField
            icon={DollarSign}
            label="Salary Max"
            value={job.salary_max}
            type="number"
            placeholder="e.g. 200000"
            onSave={(v) => onUpdate("salary_max", v)}
          />
          <InlineEditField
            label="Currency"
            value={job.salary_currency}
            type="select"
            options={CURRENCIES}
            placeholder="USD"
            onSave={(v) => onUpdate("salary_currency", v)}
          />
          {job.salary_market != null && (
            <div className="flex sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
              <div className="flex items-center gap-2 sm:w-32 shrink-0">
                <span className="text-[13px] text-text-muted">
                  Market Rate
                </span>
              </div>
              <span className="text-sm text-brand-green font-semibold px-2 truncate min-w-0">
                ${job.salary_market.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="p-4 space-y-0.5">
          <SectionLabel>Dates</SectionLabel>
          <InlineEditField
            icon={Calendar}
            label="Applied"
            value={toDateInputValue(job.applied_at)}
            type="date"
            placeholder="Set date"
            onSave={(v) => onUpdate("applied_at", v)}
          />
          <InlineEditField
            icon={Clock}
            label="Follow Up"
            value={toDateInputValue(job.follow_up_at)}
            type="date"
            placeholder="Set date"
            onSave={(v) => onUpdate("follow_up_at", v)}
          />
          <div className="flex sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
            <div className="flex items-center gap-2 sm:w-32 shrink-0">
              <Calendar className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-[13px] text-text-muted">Created</span>
            </div>
            <span className="text-sm text-text-tertiary px-2 truncate min-w-0">
              {formatDate(job.created_at)}
            </span>
          </div>
        </div>

        {/* Assessment */}
        <div className="p-4 space-y-0.5">
          <SectionLabel>Assessment</SectionLabel>
          <div className="flex items-center sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
            <div className="flex items-center gap-2 sm:w-32 w-full shrink-0">
              <Star className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-[13px] text-text-muted">Interest</span>
            </div>
            <div className="flex gap-1.5 px-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onUpdate("interest", String(n))}
                  className={`w-7 h-7 rounded-full transition-all ${
                    (job.interest ?? 0) >= n
                      ? "bg-brand shadow-[0_2px_4px_var(--brand)/30]"
                      : "bg-surface-active hover:bg-surface-hover"
                  }`}
                />
              ))}
            </div>
          </div>

          {job.suitability != null && (
            <div className="flex sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
              <div className="flex items-center gap-2 sm:w-32 shrink-0">
                <AlertCircle className="w-4 h-4 text-text-muted shrink-0" />
                <span className="text-[13px] text-text-muted">
                  Suitability
                </span>
              </div>
              <div className="flex items-center gap-2 px-2 min-w-0">
                <span
                  className={`text-sm font-bold shrink-0 ${
                    job.suitability >= 7
                      ? "text-brand-green"
                      : job.suitability >= 4
                        ? "text-brand"
                        : "text-brand-red"
                  }`}
                >
                  {job.suitability}/10
                </span>
                {job.suitability_reason && (
                  <span
                    className="text-[11px] text-text-muted truncate"
                    title={job.suitability_reason}
                  >
                    {job.suitability_reason}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2.5">
        <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Tags
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: tag.color
                  ? `${tag.color}15`
                  : "var(--surface-hover)",
                color: tag.color ?? "var(--text-tertiary)",
              }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => onRemoveTag(tag.id)}
                className="hover:opacity-60 transition-opacity -mr-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {unassignedTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-border-dashed text-text-muted hover:border-text-tertiary hover:text-text-tertiary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                }
              />
              <DropdownMenuContent align="start">
                {unassignedTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag.id}
                    onClick={() => onAssignTag(tag.id)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                      style={{
                        backgroundColor:
                          tag.color ?? "var(--text-tertiary)",
                      }}
                    />
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {tags.length === 0 && unassignedTags.length === 0 && (
            <span className="text-[13px] text-text-muted italic">
              No tags available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Description Tab ─── */

function DescriptionTab({
  job,
  editing,
  draft,
  onStartEdit,
  onDraftChange,
  onSave,
  onCancel,
  isSaving,
}: {
  job: Job;
  editing: boolean;
  draft: string;
  onStartEdit: () => void;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      {job.suitability_reason && (
        <div className="px-4 py-3 rounded-xl bg-brand-blue/5 border border-brand-blue/10 text-[13px] text-brand-blue leading-relaxed">
          <span className="font-semibold">AI Assessment:</span>{" "}
          {job.suitability_reason}
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={16}
            placeholder="Paste the job description here..."
            className="text-sm leading-relaxed"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand text-white hover:bg-brand/90"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Job Description
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-lg"
              onClick={onStartEdit}
            >
              Edit
            </Button>
          </div>
          {job.jd_raw ? (
            <div className="rounded-xl bg-surface border border-border-subtle p-4">
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {job.jd_raw}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border-dashed p-8 text-center">
              <p className="text-sm text-text-muted">
                No description added yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs"
                onClick={onStartEdit}
              >
                Add description
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Activity Tab ─── */

function ActivityTab({
  entries,
  isLoading,
}: {
  entries: ActivityLogEntry[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-5 pl-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 opacity-50" />
        </div>
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs mt-1">Changes will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-border-subtle rounded-full" />

      {entries.map((entry) => {
        const changes = extractChanges(entry);
        return (
          <div key={entry.id} className="relative pb-6 last:pb-0">
            <div
              className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-[2.5px] border-white shadow-sm ${
                entry.action === "created"
                  ? "bg-brand-green"
                  : entry.action === "deleted"
                    ? "bg-brand-red"
                    : "bg-brand-blue"
              }`}
            />

            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] text-text-primary font-medium">
                  {actionLabel(entry.action)}
                </p>
                <span className="text-[11px] text-text-muted">
                  {relativeTime(entry.created_at)}
                </span>
              </div>
              {changes.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {changes.map((c, i) => (
                    <p key={i} className="text-[12px] text-text-tertiary">
                      <span className="font-medium text-text-secondary">
                        {c.field}:
                      </span>{" "}
                      {c.from && (
                        <>
                          <span className="line-through text-text-muted">
                            {c.from}
                          </span>
                          {" → "}
                        </>
                      )}
                      <span>{c.to}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function extractChanges(
  entry: ActivityLogEntry
): { field: string; from?: string; to: string }[] {
  const changes: { field: string; from?: string; to: string }[] = [];
  const oldVal = entry.old_value as Record<string, string> | null | undefined;
  const newVal = entry.new_value as Record<string, string> | null | undefined;

  if (!newVal) return changes;

  for (const key of Object.keys(newVal)) {
    const label = key.replace(/_/g, " ").replace(/\bid\b/g, "").trim();
    changes.push({
      field: label || key,
      from: oldVal?.[key] ?? undefined,
      to: String(newVal[key]),
    });
  }

  return changes;
}
