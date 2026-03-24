"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useResumes,
  useResumeConfig,
  useExportResumePDF,
  useSetBaseResume,
  useSyncResumes,
  type Resume,
} from "@/hooks/use-resumes";
import { ResumeGrid } from "@/components/resumes/resume-grid";
import { DeleteResumeDialog } from "@/components/resumes/delete-resume-dialog";
import { ConnectBuilderDialog } from "@/components/resumes/connect-builder-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  RefreshCw,
  FileText,
  Star,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-card border border-border-subtle p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-text-muted" />
        </div>
        <div className="min-w-0">
          <span className="text-[13px] font-medium text-text-muted block">
            {label}
          </span>
          <div className="text-2xl font-bold leading-none text-text-primary mt-1 truncate">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureStatus({
  configured,
  label,
  hint,
  action,
}: {
  configured: boolean;
  label: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {configured ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
      )}
      <span className={configured ? "text-text-primary" : "text-text-muted"}>
        {label}
        {!configured && (
          <>
            <span className="text-text-muted/70">
              {" "}
              &mdash; {hint}
            </span>
            {action && <span className="ml-2">{action}</span>}
          </>
        )}
      </span>
    </li>
  );
}

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const { data: config } = useResumeConfig();
  const { data: resumes, isLoading } = useResumes();
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const exportPDF = useExportResumePDF();
  const setBase = useSetBaseResume();
  const syncResumes = useSyncResumes();

  const baseResume = resumes?.find((r) => r.is_base);
  const builderURL = config?.builder_url ?? "";

  // Auto-refresh when user returns to this tab (e.g., after editing in RxResume)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["resumes"] });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);

  const openBuilder = () => {
    if (builderURL) window.open(builderURL, "_blank");
  };

  const handleEdit = (resume: Resume) => {
    if (!builderURL) return;
    const url = resume.rxresume_id
      ? `${builderURL}/builder/${resume.rxresume_id}`
      : builderURL;
    window.open(url, "_blank");
  };

  const handleExportPDF = (resume: Resume) => {
    exportPDF.mutate(
      { id: resume.id, fileName: `${resume.name || "resume"}.pdf` },
      {
        onSuccess: () => toast.success("PDF exported"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleSetBase = (resume: Resume) => {
    setBase.mutate(resume.id, {
      onSuccess: () => toast.success(`"${resume.name}" set as base resume`),
      onError: () => toast.error("Failed to set base resume"),
    });
  };

  const handleSync = () => {
    syncResumes.mutate(undefined, {
      onSuccess: (data) => {
        switch (data.sync_status) {
          case "synced":
            toast.success(
              data.resumes.length > 0
                ? `Synced ${data.resumes.length} resume${data.resumes.length === 1 ? "" : "s"}`
                : "Sync complete — no resumes found in Resume Builder"
            );
            break;
          case "skipped":
            toast.warning(
              data.sync_message ??
                "Sync skipped — connect your API key first"
            );
            break;
          case "failed":
            toast.error(
              data.sync_message ?? "Sync failed — showing local resumes only"
            );
            break;
        }
      },
      onError: () => toast.error("Failed to sync resumes"),
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
              Sync from the builder, tailor for specific roles, and export when
              ready.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSync}
                      disabled={
                        syncResumes.isPending || !config?.api_key_configured
                      }
                    />
                  }
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4",
                      syncResumes.isPending && "animate-spin"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {config?.api_key_configured
                    ? "Sync from Resume Builder"
                    : "Connect your API key to enable syncing"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      onClick={openBuilder}
                      disabled={!config?.builder_configured}
                      className="gap-1.5"
                    />
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Builder
                </TooltipTrigger>
                <TooltipContent>
                  {config?.builder_configured
                    ? "Open Resume Builder"
                    : "Resume Builder is not configured"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Feature Status — shows when a core feature is unconfigured */}
        {config &&
          (!config.builder_configured ||
            !config.api_key_configured ||
            !config.pdf_configured) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="space-y-2.5">
                  <h3 className="font-semibold text-text-primary text-sm">
                    Some resume features need setup
                  </h3>
                  <ul className="space-y-1.5">
                    <FeatureStatus
                      configured={config.builder_configured}
                      label="Resume Builder"
                      hint="Set RESUME_BUILDER_URL and run docker compose up -d"
                    />
                    <FeatureStatus
                      configured={config.api_key_configured}
                      label="API Key"
                      hint="Connect your Resume Builder API key to enable sync and create"
                      action={
                        config.builder_configured && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => setConnectDialogOpen(true)}
                          >
                            Connect now
                          </Button>
                        )
                      }
                    />
                    <FeatureStatus
                      configured={config.pdf_configured}
                      label="PDF Export"
                      hint="Connect your API key or set RESUME_PRINTER_HTTP_URL"
                    />
                  </ul>
                </div>
              </div>
            </div>
          )}

        {/* Stats Row */}
        <div className="flex gap-4">
          <StatCard
            icon={FileText}
            label="Total Resumes"
            value={isLoading ? "--" : String(resumes?.length ?? 0)}
          />
          <StatCard
            icon={Star}
            label="Base Resume"
            value={isLoading ? "--" : (baseResume?.name ?? "Not set")}
          />
        </div>

        {/* Resume Grid */}
        <ResumeGrid
          resumes={resumes ?? []}
          isLoading={isLoading}
          config={config}
          onCreateClick={openBuilder}
          onEdit={handleEdit}
          onExportPDF={handleExportPDF}
          onSetBase={handleSetBase}
          onDelete={(resume) => setDeleteTarget(resume)}
        />

        {/* Dialogs */}
        <DeleteResumeDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resume={deleteTarget}
        />
        <ConnectBuilderDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          builderURL={builderURL}
        />
      </div>
    </div>
  );
}
