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
  ExternalLink,
  Download,
  MoreHorizontal,
  Copy,
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
import type { Resume } from "@/hooks/use-resumes";

const TEMPLATE_GRADIENTS: Record<string, string> = {
  azurill: "from-blue-400/25 to-blue-600/10",
  bronzor: "from-amber-400/25 to-amber-600/10",
  chikorita: "from-green-400/25 to-green-600/10",
  ditgar: "from-purple-400/25 to-purple-600/10",
  ditto: "from-pink-400/25 to-pink-600/10",
  gengar: "from-violet-400/25 to-violet-600/10",
  glalie: "from-cyan-400/25 to-cyan-600/10",
  kakuna: "from-yellow-400/25 to-yellow-600/10",
  lapras: "from-sky-400/25 to-sky-600/10",
  leafish: "from-emerald-400/25 to-emerald-600/10",
  onyx: "from-stone-400/25 to-stone-600/10",
  pikachu: "from-orange-400/25 to-orange-600/10",
  rhyhorn: "from-red-400/25 to-red-600/10",
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
  onEdit: () => void;
  onDuplicate: () => void;
  onExportPDF: () => void;
  onSetBase: () => void;
  onDelete: () => void;
}

export function ResumeCard({
  resume,
  index = 0,
  onEdit,
  onDuplicate,
  onExportPDF,
  onSetBase,
  onDelete,
}: ResumeCardProps) {
  const hasSyncedData = !!resume.synced_at;
  const templateKey = resume.template ?? "onyx";
  const gradient =
    TEMPLATE_GRADIENTS[templateKey] ?? "from-stone-400/25 to-stone-600/10";

  return (
    <div
      className="group rounded-xl border border-border-subtle bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Thumbnail / Preview Area */}
      <div className="relative h-52 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br shadow-[inset_0_-20px_40px_-20px_rgba(0,0,0,0.08)]",
            gradient
          )}
          style={
            resume.primary_color
              ? {
                  borderBottom: `3px solid ${resume.primary_color}`,
                }
              : undefined
          }
        />

        {hasSyncedData ? (
          /* Synced content preview */
          <div className="absolute inset-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              {resume.picture_url && (
                <img
                  src={resume.picture_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/30 shadow-sm"
                />
              )}
              <div className="min-w-0">
                {resume.full_name && (
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {resume.full_name}
                  </p>
                )}
                {resume.headline && (
                  <p className="text-[11px] text-text-secondary truncate">
                    {resume.headline}
                  </p>
                )}
              </div>
            </div>

            {resume.latest_role && (
              <p className="text-[11px] text-text-muted/80 truncate mt-0.5">
                {resume.latest_role}
              </p>
            )}

            {/* Divider */}
            <div className="h-px bg-text-primary/10 my-1" />

            {/* Section counts */}
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {SECTION_ICONS.map(({ key, icon: Icon, label }) => {
                const count = resume[key] as number;
                if (!count) return null;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-md bg-white/70 dark:bg-white/10 backdrop-blur-md px-1.5 py-0.5 text-[11px] text-text-muted"
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
                    className="rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-md px-2 py-0.5 text-[10px] text-text-muted"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Fallback: document lines decoration */
          <div className="absolute inset-4 flex flex-col gap-2 opacity-30">
            <div className="h-2.5 w-1/3 rounded-sm bg-text-primary/25" />
            <div className="h-px w-full bg-text-primary/10 mt-1 mb-1" />
            <div className="h-3 w-2/3 rounded-sm bg-text-primary/20" />
            <div className="h-2 w-full rounded-sm bg-text-primary/10" />
            <div className="h-2 w-full rounded-sm bg-text-primary/10" />
            <div className="h-2 w-4/5 rounded-sm bg-text-primary/10" />
            <div className="mt-2 h-2.5 w-1/2 rounded-sm bg-text-primary/15" />
            <div className="h-2 w-full rounded-sm bg-text-primary/10" />
            <div className="h-2 w-3/4 rounded-sm bg-text-primary/10" />
          </div>
        )}

        {/* Hover overlay with quick actions — frosted glass */}
        <div className="absolute inset-0 backdrop-blur-0 group-hover:backdrop-blur-sm bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <TooltipProvider delay={0}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onEdit}
                    className="bg-white/90 dark:bg-white/20 text-text-primary backdrop-blur-sm shadow-lg gap-1.5"
                  />
                }
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </TooltipTrigger>
              <TooltipContent>Edit in Builder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onExportPDF}
                    className="bg-white/90 dark:bg-white/20 text-text-primary backdrop-blur-sm shadow-lg gap-1.5"
                  />
                }
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </TooltipTrigger>
              <TooltipContent>Export PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 pt-3.5 space-y-2.5">
        <h3 className="font-heading font-semibold text-text-primary truncate text-base">
          {resume.name}
        </h3>

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

        {/* Actions row */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="gap-1.5 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSetBase}>
                <Star className="w-4 h-4 mr-2" />
                Set as Base
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
      </div>
    </div>
  );
}
