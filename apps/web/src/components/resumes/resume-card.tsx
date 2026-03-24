"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  MoreHorizontal,
  Star,
  Trash2,
  Pencil,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderOpen,
  Award,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Resume, ResumeConfig } from "@/hooks/use-resumes";

const TEMPLATE_GRADIENTS: Record<string, string> = {
  azurill: "from-blue-400/20 to-blue-600/8",
  bronzor: "from-amber-400/20 to-amber-600/8",
  chikorita: "from-green-400/20 to-green-600/8",
  ditgar: "from-purple-400/20 to-purple-600/8",
  ditto: "from-pink-400/20 to-pink-600/8",
  gengar: "from-violet-400/20 to-violet-600/8",
  glalie: "from-cyan-400/20 to-cyan-600/8",
  kakuna: "from-yellow-400/20 to-yellow-600/8",
  lapras: "from-sky-400/20 to-sky-600/8",
  leafish: "from-emerald-400/20 to-emerald-600/8",
  onyx: "from-stone-400/20 to-stone-600/8",
  pikachu: "from-orange-400/20 to-orange-600/8",
  rhyhorn: "from-red-400/20 to-red-600/8",
};

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const SECTION_ICONS = [
  { key: "experience_count", icon: Briefcase, label: "roles" },
  { key: "education_count", icon: GraduationCap, label: "degrees" },
  { key: "skills_count", icon: Wrench, label: "skills" },
  { key: "projects_count", icon: FolderOpen, label: "projects" },
  { key: "certs_count", icon: Award, label: "certs" },
] as const;

interface ResumeCardProps {
  resume: Resume;
  index?: number;
  config?: ResumeConfig;
  onEdit: () => void;
  onExportPDF: () => void;
  onSetBase: () => void;
  onDelete: () => void;
}

export function ResumeCard({
  resume,
  index = 0,
  config,
  onEdit,
  onExportPDF,
  onSetBase,
  onDelete,
}: ResumeCardProps) {
  const hasSyncedData = !!resume.synced_at;
  const templateKey = resume.template ?? "onyx";
  const gradient =
    TEMPLATE_GRADIENTS[templateKey] ?? "from-stone-400/20 to-stone-600/8";
  const pdfEnabled = config?.pdf_configured !== false;

  return (
    <div
      className="group rounded-2xl bg-card shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Preview Area */}
      <div className="relative h-56 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-linear-to-br",
            gradient
          )}
        />

        {/* Accent strip */}
        {resume.primary_color && (
          <div
            className="absolute top-0 left-6 right-6 h-0.5 rounded-full opacity-60"
            style={{ backgroundColor: resume.primary_color }}
          />
        )}

        {hasSyncedData ? (
          <div className="absolute inset-5 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {resume.picture_url && (
                <img
                  src={resume.picture_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/40 shadow-md"
                />
              )}
              <div className="min-w-0">
                {resume.full_name && (
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {resume.full_name}
                  </p>
                )}
                {resume.headline && (
                  <p className="text-xs text-text-secondary truncate">
                    {resume.headline}
                  </p>
                )}
              </div>
            </div>

            {resume.latest_role && (
              <p className="text-xs text-text-muted/80 truncate">
                {resume.latest_role}
              </p>
            )}

            {/* Section counts */}
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {SECTION_ICONS.map(({ key, icon: Icon, label }) => {
                const count = resume[key] as number;
                if (!count) return null;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-text-muted"
                  >
                    <Icon className="w-3 h-3" />
                    {count} {label}
                  </span>
                );
              })}
            </div>

            {/* Top skills */}
            {resume.top_skills && resume.top_skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {resume.top_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-text-muted"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Fallback: document mock */
          <div className="absolute inset-5 flex items-center justify-center">
            <div className="w-full max-w-[85%] bg-white/50 dark:bg-white/5 rounded-lg shadow-sm p-4 flex flex-col gap-2">
              <div className="h-2.5 w-2/5 rounded-sm bg-text-primary/15" />
              <div className="h-px w-full bg-text-primary/8 mt-1 mb-0.5" />
              <div className="h-2 w-3/4 rounded-sm bg-text-primary/10" />
              <div className="h-2 w-full rounded-sm bg-text-primary/8" />
              <div className="h-2 w-full rounded-sm bg-text-primary/8" />
              <div className="h-2 w-4/5 rounded-sm bg-text-primary/8" />
              <div className="mt-2 h-2.5 w-1/2 rounded-sm bg-text-primary/12" />
              <div className="h-2 w-full rounded-sm bg-text-primary/8" />
              <div className="h-2 w-3/5 rounded-sm bg-text-primary/8" />
            </div>
          </div>
        )}

        {/* Hover overlay with circular action buttons */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 backdrop-blur-0 group-hover:backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
          <TooltipProvider delay={0}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={onEdit}
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-110"
                  />
                }
              >
                <Pencil className="w-4 h-4 text-text-primary" />
              </TooltipTrigger>
              <TooltipContent>Edit in Builder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={pdfEnabled ? onExportPDF : undefined}
                    disabled={!pdfEnabled}
                    className={cn(
                      "w-10 h-10 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-110",
                      !pdfEnabled && "opacity-40 cursor-not-allowed hover:scale-100"
                    )}
                  />
                }
              >
                <Download className="w-4 h-4 text-text-primary" />
              </TooltipTrigger>
              <TooltipContent>
                {pdfEnabled
                  ? "Export PDF"
                  : "Configure RESUME_PRINTER_HTTP_URL to enable PDF export"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] text-text-primary truncate leading-snug">
            {resume.name}
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors" />
              }
            >
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={pdfEnabled ? onExportPDF : undefined}
                disabled={!pdfEnabled}
              >
                <Download className="w-4 h-4 mr-2" />
                {pdfEnabled ? "Export PDF" : "Export PDF (not configured)"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={resume.is_base ? undefined : onSetBase}
                disabled={resume.is_base}
              >
                <Star className="w-4 h-4 mr-2" />
                {resume.is_base ? "Base Resume" : "Set as Base"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {resume.is_base && (
            <Badge variant="default" className="text-[10px]">
              Base
            </Badge>
          )}
          {resume.template && (
            <Badge
              variant="secondary"
              className="text-[10px] capitalize"
            >
              {resume.template}
            </Badge>
          )}
          {resume.primary_color && (
            <span
              className="w-3 h-3 rounded-full border border-border-subtle shrink-0"
              style={{ backgroundColor: resume.primary_color }}
            />
          )}
        </div>

        {/* Updated time */}
        <p className="text-xs text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Updated {formatRelativeTime(resume.updated_at)}
        </p>
      </div>
    </div>
  );
}
