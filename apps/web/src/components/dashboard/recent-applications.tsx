"use client";

import Link from "next/link";
import { useJobs } from "@/hooks/use-jobs";
import { Skeleton } from "@/components/ui/skeleton";
import { StageIcon } from "@/components/kanban/stage-icons";

const statusStyles: Record<string, { bg: string; text: string }> = {
  applied: { bg: "#E8F0FE", text: "#2A85FF" },
  screening: { bg: "#F0EBFE", text: "#8E59FF" },
  interviewing: { bg: "#EAFBE7", text: "#83BF6E" },
  offer: { bg: "#FFF3E0", text: "#FF8400" },
  accepted: { bg: "#EAFBE7", text: "#83BF6E" },
  rejected: { bg: "#FEE8E8", text: "#E53E3E" },
  closed: { bg: "#F5F5F7", text: "#8B8FA3" },
  wishlist: { bg: "#F5F5F7", text: "#8B8FA3" },
  saved: { bg: "#F5F5F7", text: "#8B8FA3" },
  withdrawn: { bg: "#FEE8E8", text: "#E53E3E" },
};

const logoColors = [
  "#635BFF",
  "#000000",
  "#191919",
  "#2A85FF",
  "#FF8400",
  "#83BF6E",
  "#8E59FF",
  "#E53E3E",
];

function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return logoColors[Math.abs(hash) % logoColors.length];
}

export function RecentApplications() {
  const { data: jobsData, isLoading } = useJobs({ perPage: 3 });

  const recentJobs = jobsData?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-4 rounded-xl bg-white border border-[#EBEBEF] p-5">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 rounded-xl bg-white border border-[#EBEBEF] p-5">
      <span className="text-sm font-semibold text-[#1A1A2E]">
        Recent Applications
      </span>
      <div className="flex-1 flex flex-col">
        {recentJobs.length === 0 ? (
          <p className="text-sm text-[#8B8FA3] py-4">No applications yet.</p>
        ) : (
          recentJobs.map((job) => {
            const stageName = job.stage_name?.toLowerCase() ?? "applied";
            const style = statusStyles[stageName] ?? statusStyles.applied;
            const companyName = job.company_name ?? "Unknown";
            const initial = companyName.charAt(0).toUpperCase();
            const color = getLogoColor(companyName);

            return (
              <div
                key={job.id}
                className="flex items-center gap-3 py-2.5 border-b border-[#EBEBEF] last:border-b-0"
              >
                {job.company_logo_url ? (
                  <img
                    src={job.company_logo_url}
                    alt={companyName}
                    className="w-7 h-7 rounded-md shrink-0 object-contain"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-[13px] font-bold text-white">
                      {initial}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-[#1A1A2E] truncate">
                    {job.title}
                  </span>
                  <span className="text-[11px] text-[#8B8FA3]">
                    {companyName}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 shrink-0"
                  style={{ backgroundColor: style.bg }}
                >
                  <StageIcon
                    stageName={job.stage_name ?? "applied"}
                    className="w-3.5 h-3.5 shrink-0"
                    color={style.text}
                  />
                  <span
                    className="text-[10px] font-semibold capitalize"
                    style={{ color: style.text }}
                  >
                    {job.stage_name ?? "Applied"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Link
        href="/applications"
        className="text-xs font-medium text-[#FF8400] hover:underline self-start"
      >
        View all
      </Link>
    </div>
  );
}
