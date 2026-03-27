"use client";

import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ExportButtonProps {
  endpoint: string;
}

export function ExportButton({ endpoint }: ExportButtonProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  async function handleExport(format: "json" | "csv") {
    try {
      const { authClient } = await import("@/lib/auth-client");
      const { data: tokenData } = await authClient.token();

      const res = await fetch(
        `${baseUrl}${endpoint}?format=${format}`,
        {
          headers: tokenData?.token
            ? { Authorization: `Bearer ${tokenData.token}` }
            : {},
        }
      );

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export data");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-subtle text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors outline-none">
        <Download className="w-3.5 h-3.5 text-text-muted" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
