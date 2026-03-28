"use client";

import { useState } from "react";
import {
  useGmailStatus,
  useConnectGmail,
  useUnconfirmedEmailEvents,
  useEmailEvents,
  useUnconfirmedCount,
  useConfirmEmailEvent,
  useDismissEmailEvent,
  useLinkEmailEventToJob,
  type EmailEvent,
  type ConfirmResult,
} from "@/hooks/use-email";
import { type Job } from "@/hooks/use-jobs";
import { JobCombobox } from "@/components/offers/job-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SpinnerIcon,
  CheckIcon,
  XIcon,
  EnvelopeIcon,
  TrayIcon,
  ClockCounterClockwiseIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  LightningIcon,
  EyeIcon,
  LinkIcon,
  BriefcaseIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const intentLabels: Record<string, { label: string; color: string }> = {
  interview_invite: {
    label: "Interview",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  rejection: {
    label: "Rejection",
    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  offer: {
    label: "Offer",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  assessment: {
    label: "Assessment",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  follow_up: {
    label: "Follow Up",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  other: {
    label: "Other",
    color:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

/** Describes what confirming this event will do to the linked job. */
function getProposedAction(detectedType: string | null): string | null {
  switch (detectedType) {
    case "interview_invite":
      return "Will move to Interview stage";
    case "rejection":
      return "Will mark as Rejected";
    case "offer":
      return "Will move to Offer stage";
    default:
      return null;
  }
}

export default function EmailIntegrationPage() {
  const { data: gmailStatus, isLoading: statusLoading } = useGmailStatus();
  const [activeTab, setActiveTab] = useState<"inbox" | "history">("inbox");

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpinnerIcon className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gmailStatus?.connected) {
    return <NotConnectedView />;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-7">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-4xl font-bold text-text-primary tracking-tight"
              style={{ letterSpacing: -1 }}
            >
              Email Integration
            </h1>
            <UnconfirmedBadge />
          </div>
          <p className="text-sm text-text-muted mt-1.5">
            Review AI-detected events from your emails before they update your
            tracker.
          </p>
        </div>
        {gmailStatus.email && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {gmailStatus.email}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "inbox"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("inbox")}
        >
          <TrayIcon className="w-4 h-4" />
          Inbox
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
        >
          <ClockCounterClockwiseIcon className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "inbox" ? <InboxTab /> : <HistoryTab />}
      </div>
    </div>
  );
}

function NotConnectedView() {
  const connectGmail = useConnectGmail();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-7">
      {/* Page Header */}
      <div className="mb-8">
        <h1
          className="text-4xl font-bold text-text-primary tracking-tight"
          style={{ letterSpacing: -1 }}
        >
          Email Integration
        </h1>
        <p className="text-sm text-text-muted mt-1.5">
          Automatically detect job-related emails and keep your tracker
          up to date.
        </p>
      </div>

      {/* Hero Card */}
      <div className="flex-1 flex items-start justify-center pt-4">
        <div className="w-full max-w-lg">
          <Card className="border border-border-subtle">
            <CardContent className="pt-10 pb-10 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <EnvelopeIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Connect your Gmail
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                We&apos;ll scan your inbox for interview invitations, rejections,
                and offers — then let you review before updating your tracker.
              </p>

              <Button
                size="lg"
                className="gap-2 px-6"
                onClick={() => connectGmail.mutate()}
                disabled={connectGmail.isPending}
              >
                {connectGmail.isPending ? (
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <EnvelopeIcon className="w-4 h-4" />
                )}
                Connect Gmail
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="flex flex-col items-center text-center gap-2 p-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Read-only access. We never send or modify emails.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <EyeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Email content is never stored. Only short snippets are saved.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 p-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <LightningIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                You review every event before your tracker is updated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnconfirmedBadge() {
  const { data } = useUnconfirmedCount();
  if (!data?.count) return null;
  return (
    <Badge variant="destructive" className="text-xs">
      {data.count}
    </Badge>
  );
}

function InboxTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUnconfirmedEmailEvents(page);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <SpinnerIcon className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
          <TrayIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">
          All caught up
        </p>
        <p className="text-sm text-muted-foreground">
          No new email events to review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.data.map((event) => (
        <InboxEventCard key={event.id} event={event} />
      ))}
      <Pagination page={page} total={data.total} onPageChange={setPage} />
    </div>
  );
}

function HistoryTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEmailEvents(page);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <SpinnerIcon className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
          <ClockCounterClockwiseIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">
          No history yet
        </p>
        <p className="text-sm text-muted-foreground">
          Email events will appear here after processing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.data.map((event) => (
        <HistoryEventCard key={event.id} event={event} />
      ))}
      <Pagination page={page} total={data.total} onPageChange={setPage} />
    </div>
  );
}

/** Resolves the best display name for the company on an event. */
function getCompanyDisplay(event: EmailEvent): string | null {
  return event.job_company_name || event.company_name || null;
}

function InboxEventCard({ event }: { event: EmailEvent }) {
  const confirmEvent = useConfirmEmailEvent();
  const dismissEvent = useDismissEmailEvent();
  const linkJob = useLinkEmailEventToJob();
  const [linking, setLinking] = useState(false);

  const intent =
    intentLabels[event.detected_type ?? "other"] ?? intentLabels.other;
  const confidence =
    event.confidence != null ? Math.round(event.confidence * 100) : null;
  const company = getCompanyDisplay(event);
  const proposedAction = event.job_id ? getProposedAction(event.detected_type) : null;

  function handleConfirm() {
    confirmEvent.mutate(event.id, {
      onSuccess: (result: ConfirmResult) => {
        if (result.stage_change) {
          toast.success(
            `${company ?? "Job"} moved to ${result.stage_change.to_stage}`,
          );
        } else {
          toast.success("Event confirmed");
        }
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleDismiss() {
    dismissEvent.mutate(event.id, {
      onSuccess: () => toast.success("Event dismissed"),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleLinkJob(job: Job | null) {
    if (!job) return;
    linkJob.mutate(
      { eventId: event.id, jobId: job.id },
      {
        onSuccess: () => {
          setLinking(false);
          toast.success(`Linked to ${job.title}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Card className="transition-colors hover:bg-accent/30">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Company & Job context */}
            <div className="flex items-center gap-2 mb-1">
              {company && (
                <span className="text-sm font-semibold text-text-primary truncate">
                  {company}
                </span>
              )}
              {event.job_title && (
                <span className="text-sm text-text-muted truncate">
                  {event.job_title}
                </span>
              )}
            </div>

            {/* Intent badge + confidence + proposed action */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${intent.color}`}
              >
                {intent.label}
              </span>
              {confidence != null && (
                <span className="text-xs text-muted-foreground">
                  {confidence}% confidence
                </span>
              )}
              {proposedAction && (
                <span className="text-xs text-muted-foreground italic">
                  {proposedAction}
                </span>
              )}
            </div>

            {/* Snippet */}
            {event.raw_snippet && (
              <p className="text-sm text-foreground leading-relaxed line-clamp-2 mb-1.5">
                {event.raw_snippet}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(event.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
            {event.job_id ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950"
                  onClick={handleConfirm}
                  disabled={confirmEvent.isPending}
                >
                  {confirmEvent.isPending ? (
                    <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckIcon className="w-3.5 h-3.5" />
                  )}
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-red-500"
                  onClick={handleDismiss}
                  disabled={dismissEvent.isPending}
                >
                  <XIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : linking ? (
              <div className="w-56">
                <JobCombobox value={null} onChange={handleLinkJob} />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setLinking(true)}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Link to job
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-red-500"
                  onClick={handleDismiss}
                  disabled={dismissEvent.isPending}
                >
                  <XIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryEventCard({ event }: { event: EmailEvent }) {
  const intent =
    intentLabels[event.detected_type ?? "other"] ?? intentLabels.other;
  const confidence =
    event.confidence != null ? Math.round(event.confidence * 100) : null;
  const company = getCompanyDisplay(event);

  return (
    <Card className="transition-colors hover:bg-accent/30">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Company & Job context */}
            {(company || event.job_title) && (
              <div className="flex items-center gap-2 mb-1">
                {company && (
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {company}
                  </span>
                )}
                {event.job_title && (
                  <span className="text-sm text-text-muted truncate">
                    {event.job_title}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${intent.color}`}
              >
                {intent.label}
              </span>
              {confidence != null && (
                <span className="text-xs text-muted-foreground">
                  {confidence}% confidence
                </span>
              )}
              {event.confirmed === true && (
                <Badge variant="outline" className="text-xs gap-1">
                  <CheckIcon className="w-3 h-3" />
                  Confirmed
                </Badge>
              )}
              {event.confirmed === false && (
                <Badge variant="secondary" className="text-xs">
                  Dismissed
                </Badge>
              )}
              {event.job_id && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BriefcaseIcon className="w-3 h-3" />
                  Linked
                </div>
              )}
            </div>

            {event.raw_snippet && (
              <p className="text-sm text-foreground leading-relaxed line-clamp-2 mb-1.5">
                {event.raw_snippet}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(event.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Pagination({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / 25);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages} ({total} total)
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
