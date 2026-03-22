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

function formatRelativeTime(dateStr: string): string {
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

interface ResumeCardProps {
  resume: Resume;
  onEdit: () => void;
  onDuplicate: () => void;
  onExportPDF: () => void;
  onSetBase: () => void;
  onDelete: () => void;
}

export function ResumeCard({
  resume,
  onEdit,
  onDuplicate,
  onExportPDF,
  onSetBase,
  onDelete,
}: ResumeCardProps) {
  const gradient =
    TEMPLATE_GRADIENTS[resume.rxresume_id ? "onyx" : "onyx"] ??
    "from-stone-400/25 to-stone-600/10";

  return (
    <div className="group rounded-xl border border-border-subtle bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Thumbnail / Preview Area */}
      <div className="relative h-44 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            gradient
          )}
        />

        {/* Document lines decoration */}
        <div className="absolute inset-4 flex flex-col gap-2 opacity-30">
          <div className="h-3 w-2/3 rounded-sm bg-text-primary/20" />
          <div className="h-2 w-full rounded-sm bg-text-primary/10" />
          <div className="h-2 w-full rounded-sm bg-text-primary/10" />
          <div className="h-2 w-4/5 rounded-sm bg-text-primary/10" />
          <div className="mt-2 h-2.5 w-1/2 rounded-sm bg-text-primary/15" />
          <div className="h-2 w-full rounded-sm bg-text-primary/10" />
          <div className="h-2 w-3/4 rounded-sm bg-text-primary/10" />
        </div>

        {/* Hover overlay with quick actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <TooltipProvider delay={0}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={onEdit}
                    className="shadow-md"
                  />
                }
              >
                <ExternalLink className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent>Edit in Builder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={onExportPDF}
                    className="shadow-md"
                  />
                }
              >
                <Download className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent>Export PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Badges */}
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          {resume.is_base && (
            <Badge variant="default" className="text-[10px] shadow-sm">
              Base
            </Badge>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        <h3 className="font-heading font-medium text-text-primary truncate text-[15px]">
          {resume.name}
        </h3>
        <p className="text-xs text-text-muted">
          Updated {formatRelativeTime(resume.updated_at)}
        </p>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-xs">
            <Pencil className="w-3.5 h-3.5" />
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
