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
import { CompanySelector } from "@/components/companies/company-selector";
import { StageIcon } from "./stage-icons";
import { SectionIcon, type SectionIconName } from "./section-icons";
import { SOURCES, LOCATION_TYPES, JOB_TYPES, JOB_LEVELS, SALARY_INTERVALS } from "@/lib/constants";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  MapPinIcon,
  BuildingsIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowSquareOutIcon,
  TrashIcon,
  XIcon,
  PlusIcon,
  ClockIcon,
  BriefcaseIcon,
  GlobeIcon,
  StarIcon,
  WarningCircleIcon,
  FileTextIcon,
  PulseIcon,
  InfoIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";

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

export function JobDetailSheet({ job: jobProp, onClose, stages }: JobDetailSheetProps) {
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

  // Re-measure when active tab changes or when a new job opens the sheet
  // (activeTab may already be "details" from a previous close, so the callback
  // reference won't change — job?.id ensures we re-measure when the tab bar
  // re-enters the DOM for a different job).
  const jobId = jobProp?.id;
  useEffect(() => {
    measureTabIndicator();
  }, [measureTabIndicator, jobId]);

  const {
    data: activityEntries,
    isLoading: activityLoading,
  } = useActivityLog(activeTab === "activity" ? jobProp?.id : undefined);

  // Keep the last non-null job so content stays visible during the sheet close animation
  const [lastJob, setLastJob] = useState<Job | null>(jobProp);
  const [prevJobId, setPrevJobId] = useState(jobProp?.id);

  if (jobProp && jobProp !== lastJob) {
    setLastJob(jobProp);
  }
  if (jobProp?.id !== prevJobId) {
    setPrevJobId(jobProp?.id);
    setActiveTab("details");
    setEditingDescription(false);
    setDescriptionDraft("");
  }

  const job = jobProp ?? lastJob;
  if (!job) return null;

  const tags = (job.tags ?? []) as Tag[];
  const currentStage = stages.find((s) => s.id === job.stage_id);
  const unassignedTags = (allTags ?? []).filter(
    (t) => !tags.some((jt) => jt.id === t.id)
  );

  const handleUpdate = (field: string, value: string) => {
    const body: Record<string, unknown> = {};
    if (field === "salary_min" || field === "salary_max" || field === "salary_offered" || field === "salary_market") {
      body[field] = value ? parseInt(value) : null;
    } else if (field === "interest") {
      body[field] = value ? parseInt(value) : null;
    } else if (field === "applied_at" || field === "follow_up_at" || field === "deadline") {
      body[field] = value ? new Date(value).toISOString() : null;
    } else if (field === "company_id") {
      // Send empty string to explicitly clear (Go handler treats "" as "unlink company")
      body[field] = value || "";
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

  const tabs: { id: TabId; label: string; icon: typeof FileTextIcon }[] = [
    { id: "details", label: "Details", icon: FileTextIcon },
    { id: "description", label: "Description", icon: InfoIcon },
    { id: "activity", label: "Activity", icon: PulseIcon },
  ];

  return (
    <Sheet open={!!jobProp} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[640px] sm:max-w-[640px] overflow-y-auto flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-0 space-y-3">
          <div className="flex items-center gap-2.5">
            {job.company_logo_url ? (
              <div className="w-9 h-9 rounded-xl bg-white border border-border-subtle p-0.5 shrink-0">
                <Image
                  src={job.company_logo_url}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full rounded-lg object-contain"
                />
              </div>
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
                    <CaretDownIcon className="w-3 h-3 opacity-60" />
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
                <ArrowSquareOutIcon className="w-3 h-3" />
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
              stages={stages}
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
                    <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
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

function SectionHeader({ icon, children }: { icon?: SectionIconName; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      {icon && (
        <SectionIcon
          name={icon}
          className="w-6 h-6 text-text-muted/60 shrink-0"
        />
      )}
      <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
        {children}
      </h4>
    </div>
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
        <div className="px-4 py-5 space-y-0.5">
          <SectionHeader icon="job-info">Job Info</SectionHeader>
          <div className="group flex items-center sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
            <div className="flex items-center gap-2 sm:w-32 w-full shrink-0">
              <BuildingsIcon className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-[13px] text-text-muted">Company</span>
            </div>
            <CompanySelector
              value={job.company_id}
              displayName={job.company_name}
              logoUrl={job.company_logo_url}
              onChange={(companyId) => onUpdate("company_id", companyId ?? "")}
              placeholder="Add company"
              variant="inline"
            />
          </div>
          <InlineEditField
            icon={MapPinIcon}
            label="Location"
            value={job.location}
            type="text"
            placeholder="Add location"
            onSave={(v) => onUpdate("location", v)}
          />
          <InlineEditField
            icon={GlobeIcon}
            label="Location Type"
            value={job.location_type}
            type="select"
            options={LOCATION_TYPES}
            placeholder="Select type"
            onSave={(v) => onUpdate("location_type", v)}
          />
          <InlineEditField
            icon={BriefcaseIcon}
            label="Source"
            value={job.source}
            type="select"
            options={SOURCES}
            placeholder="Select source"
            onSave={(v) => onUpdate("source", v)}
          />
          <InlineEditField
            icon={BriefcaseIcon}
            label="Job Type"
            value={job.job_type}
            type="select"
            options={JOB_TYPES}
            placeholder="Select type"
            onSave={(v) => onUpdate("job_type", v)}
          />
          <InlineEditField
            icon={BriefcaseIcon}
            label="Level"
            value={job.job_level}
            type="select"
            options={JOB_LEVELS}
            placeholder="Select level"
            onSave={(v) => onUpdate("job_level", v)}
          />
          <InlineEditField
            icon={StarIcon}
            label="Experience"
            value={job.experience_range}
            type="text"
            placeholder="e.g. 3-5 years"
            onSave={(v) => onUpdate("experience_range", v)}
          />
          {job.application_url && (
            <div className="flex sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
              <div className="flex items-center gap-2 sm:w-32 shrink-0">
                <ArrowSquareOutIcon className="w-4 h-4 text-text-muted shrink-0" />
                <span className="text-[13px] text-text-muted">Apply Link</span>
              </div>
              <a
                href={job.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-blue hover:underline px-2 truncate min-w-0"
              >
                Apply
              </a>
            </div>
          )}
        </div>

        {/* Compensation */}
        <div className="px-4 py-5 space-y-0.5">
          <SectionHeader icon="compensation">Compensation</SectionHeader>
          <InlineEditField
            icon={CurrencyDollarIcon}
            label="Salary Min"
            value={job.salary_min}
            type="number"
            placeholder="e.g. 150000"
            onSave={(v) => onUpdate("salary_min", v)}
          />
          <InlineEditField
            icon={CurrencyDollarIcon}
            label="Salary Max"
            value={job.salary_max}
            type="number"
            placeholder="e.g. 200000"
            onSave={(v) => onUpdate("salary_max", v)}
          />
          <InlineEditField
            icon={GlobeIcon}
            label="Currency"
            value={job.salary_currency}
            type="select"
            options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.code}` }))}
            placeholder="USD"
            onSave={(v) => onUpdate("salary_currency", v)}
          />
          <InlineEditField
            icon={ClockIcon}
            label="Interval"
            value={job.salary_interval}
            type="select"
            options={SALARY_INTERVALS}
            placeholder="Annual"
            onSave={(v) => onUpdate("salary_interval", v)}
          />
          <InlineEditField
            icon={CurrencyDollarIcon}
            label="Offered"
            value={job.salary_offered}
            type="number"
            placeholder="e.g. 180000"
            onSave={(v) => onUpdate("salary_offered", v)}
          />
          <InlineEditField
            icon={CurrencyDollarIcon}
            label="Market Rate"
            value={job.salary_market}
            type="number"
            placeholder="e.g. 170000"
            onSave={(v) => onUpdate("salary_market", v)}
          />
        </div>

        {/* Dates */}
        <div className="px-4 py-5 space-y-0.5">
          <SectionHeader icon="dates">Dates</SectionHeader>
          <InlineEditField
            icon={CalendarIcon}
            label="Deadline"
            value={toDateInputValue(job.deadline)}
            type="date"
            placeholder="Set deadline"
            onSave={(v) => onUpdate("deadline", v)}
          />
          <InlineEditField
            icon={CalendarIcon}
            label="Applied"
            value={toDateInputValue(job.applied_at)}
            type="date"
            placeholder="Set date"
            onSave={(v) => onUpdate("applied_at", v)}
          />
          <InlineEditField
            icon={ClockIcon}
            label="Follow Up"
            value={toDateInputValue(job.follow_up_at)}
            type="date"
            placeholder="Set date"
            onSave={(v) => onUpdate("follow_up_at", v)}
          />
          <div className="flex sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
            <div className="flex items-center gap-2 sm:w-32 shrink-0">
              <CalendarIcon className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-[13px] text-text-muted">Created</span>
            </div>
            <span className="text-sm text-text-tertiary px-2 truncate min-w-0">
              {formatDate(job.created_at)}
            </span>
          </div>
        </div>

        {/* Assessment */}
        <div className="px-4 py-5 space-y-0.5">
          <SectionHeader icon="assessment">Assessment</SectionHeader>
          <div className="flex items-center sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
            <div className="flex items-center gap-2 sm:w-32 w-full shrink-0">
              <StarIcon className="w-4 h-4 text-text-muted shrink-0" />
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
                <WarningCircleIcon className="w-4 h-4 text-text-muted shrink-0" />
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
        <SectionHeader>Tags</SectionHeader>
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
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          {unassignedTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border-subtle text-text-muted hover:border-text-tertiary hover:text-text-tertiary transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
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
            <SectionHeader>Job Description</SectionHeader>
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
            <div className="rounded-xl bg-surface border border-border-subtle p-8 text-center">
              <SectionIcon
                name="resume"
                className="w-12 h-12 text-text-muted/30 mx-auto mb-3"
              />
              <p className="text-sm font-medium text-text-muted">
                No description added yet
              </p>
              <p className="text-xs text-text-muted/70 mt-1">
                Paste the job posting to help track requirements
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-7 text-xs"
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
  stages,
}: {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  stages: Stage[];
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
        <SectionIcon
          name="search"
          className="w-14 h-14 text-text-muted/25 mb-4"
        />
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs text-text-muted/70 mt-1">Changes will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-border-subtle rounded-full" />

      {entries.map((entry) => {
        const changes = extractChanges(entry, stages);
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

/** Try to parse a value that might be a base64-encoded JSON string (Go serializes []byte as base64). */
function parseActivityValue(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const decoded = JSON.parse(atob(raw));
      if (typeof decoded === "object" && decoded !== null) return decoded;
    } catch {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) return parsed;
      } catch {
        // Not JSON
      }
    }
  }
  return null;
}

/** Extract a raw display string from a value (handles pgtype structs as fallback). */
function rawDisplayValue(val: unknown): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "string") return val || undefined;
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("String" in obj) return obj.Valid ? String(obj.String) : undefined;
    if ("Int32" in obj) return obj.Valid ? String(obj.Int32) : undefined;
    if ("Time" in obj) return obj.Valid ? formatDate(String(obj.Time)) : undefined;
  }
  return undefined;
}

/** Field display metadata: human labels and value formatters for activity log. */
const FIELD_META: Record<string, {
  label: string;
  format?: (val: string, stages: Stage[]) => string;
}> = {
  title: { label: "Title" },
  status: {
    label: "Status",
    format: (v) => v.charAt(0).toUpperCase() + v.slice(1),
  },
  stage_id: {
    label: "Stage",
    format: (v, stages) => stages.find((s) => s.id === v)?.name ?? v,
  },
  company_id: {
    label: "Company",
    format: (v) => v || "None",
  },
  location: { label: "Location" },
  location_type: {
    label: "Location Type",
    format: (v) => LOCATION_TYPES.find((o) => o.value === v)?.label ?? v,
  },
  source: {
    label: "Source",
    format: (v) => SOURCES.find((o) => o.value === v)?.label ?? v,
  },
  job_type: {
    label: "Job Type",
    format: (v) => JOB_TYPES.find((o) => o.value === v)?.label ?? v,
  },
  job_level: {
    label: "Level",
    format: (v) => JOB_LEVELS.find((o) => o.value === v)?.label ?? v,
  },
  salary_min: {
    label: "Salary Min",
    format: (v) => {
      const n = Number(v);
      return isNaN(n) ? v : formatCurrency(n);
    },
  },
  salary_max: {
    label: "Salary Max",
    format: (v) => {
      const n = Number(v);
      return isNaN(n) ? v : formatCurrency(n);
    },
  },
  salary_currency: {
    label: "Currency",
    format: (v) => currencyLabel(v),
  },
  salary_interval: {
    label: "Pay Interval",
    format: (v) => SALARY_INTERVALS.find((o) => o.value === v)?.label ?? v,
  },
  interest: {
    label: "Interest",
    format: (v) => "★".repeat(Math.min(Number(v) || 0, 5)),
  },
  suitability: {
    label: "Suitability",
    format: (v) => `${v}/10`,
  },
  jd_raw: { label: "Description" },
  applied_at: {
    label: "Applied Date",
    format: (v) => formatDate(v) || v,
  },
  follow_up_at: {
    label: "Follow Up",
    format: (v) => formatDate(v) || v,
  },
  deadline: {
    label: "Deadline",
    format: (v) => formatDate(v) || v,
  },
  experience_range: { label: "Experience" },
  application_url: { label: "Apply Link" },
};

function formatFieldValue(field: string, raw: string | undefined, stages: Stage[]): string | undefined {
  if (!raw) return undefined;
  const meta = FIELD_META[field];
  if (meta?.format) return meta.format(raw, stages);
  return raw;
}

function fieldLabel(field: string): string {
  return FIELD_META[field]?.label ?? field.replace(/_/g, " ").replace(/\bid\b/gi, "").trim();
}

function extractChanges(
  entry: ActivityLogEntry,
  stages: Stage[],
): { field: string; from?: string; to: string }[] {
  const changes: { field: string; from?: string; to: string }[] = [];
  const newVal = parseActivityValue(entry.new_value);

  if (!newVal) return changes;

  for (const key of Object.keys(newVal)) {
    const label = fieldLabel(key);
    const fieldVal = newVal[key];

    // detectJobChanges stores each field as {old: value, new: value}
    if (
      fieldVal != null &&
      typeof fieldVal === "object" &&
      "new" in (fieldVal as Record<string, unknown>)
    ) {
      const pair = fieldVal as Record<string, unknown>;
      const fromRaw = rawDisplayValue(pair.old);
      const toRaw = rawDisplayValue(pair["new"]);
      const from = formatFieldValue(key, fromRaw, stages);
      const to = formatFieldValue(key, toRaw, stages);
      if (to) {
        changes.push({ field: label, from, to });
      }
    } else {
      // Simple value (e.g. from "created" action: {title: "..."})
      const raw = rawDisplayValue(fieldVal);
      const to = formatFieldValue(key, raw, stages);
      if (to) {
        changes.push({ field: label, to });
      }
    }
  }

  return changes;
}
