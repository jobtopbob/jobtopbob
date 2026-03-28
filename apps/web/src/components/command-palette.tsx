"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useJobs, type Job } from "@/hooks/use-jobs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@radix-ui/react-dialog";
import {
  MagnifyingGlassIcon,
  BriefcaseIcon,
  FileTextIcon,
  EnvelopeIcon,
  UsersIcon,
  BuildingsIcon,
  CompassIcon,
  GearIcon,
  SquaresFourIcon,
  PlusIcon,
} from "@phosphor-icons/react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: SquaresFourIcon },
  { label: "Applications", href: "/applications", icon: BriefcaseIcon },
  { label: "Resumes", href: "/resumes", icon: FileTextIcon },
  { label: "Email Integration", href: "/email-integration", icon: EnvelopeIcon },
  { label: "Contacts", href: "/contacts", icon: UsersIcon },
  { label: "Companies", href: "/companies", icon: BuildingsIcon },
  { label: "Discover Jobs", href: "/discover", icon: CompassIcon },
  { label: "Settings", href: "/settings", icon: GearIcon },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Only search jobs when there's actual input
  const { data: jobsData } = useJobs(
    search.length >= 2
      ? { search, perPage: 5, page: 1 }
      : { search: "__noop__", perPage: 0, page: 1 }
  );

  const jobs = search.length >= 2 ? (jobsData?.data ?? []) : [];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (callback: () => void) => {
      setOpen(false);
      setSearch("");
      callback();
    },
    []
  );

  const handleJobSelect = useCallback(
    (job: Job) => {
      handleSelect(() => {
        router.push(`/applications?job=${job.id}`);
      });
    },
    [router, handleSelect]
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      contentClassName="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl bg-card border border-border-subtle shadow-2xl overflow-hidden"
    >
      <VisuallyHidden>
        <DialogTitle>Command palette</DialogTitle>
      </VisuallyHidden>
      <div className="flex items-center gap-2 px-4 border-b border-border-subtle">
        <MagnifyingGlassIcon className="w-4 h-4 text-text-muted shrink-0" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search jobs, navigate, or run actions..."
          className="flex-1 h-12 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface text-[10px] font-medium text-text-muted border border-border-subtle">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[320px] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-text-muted">
          No results found.
        </Command.Empty>

        {/* Job results */}
        {jobs.length > 0 && (
          <Command.Group
            heading="Jobs"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
          >
            {jobs.map((job) => (
              <Command.Item
                key={job.id}
                value={`${job.title} ${job.company_name ?? ""}`}
                onSelect={() => handleJobSelect(job)}
                className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-text-primary cursor-pointer data-[selected=true]:bg-surface-hover"
              >
                <BriefcaseIcon className="w-4 h-4 text-text-muted shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{job.title}</span>
                  {job.company_name && (
                    <span className="text-xs text-text-muted truncate">
                      {job.company_name}
                    </span>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Navigation */}
        <Command.Group
          heading="Navigation"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
        >
          {NAV_ITEMS.map((item) => (
            <Command.Item
              key={item.href}
              value={item.label}
              onSelect={() => handleSelect(() => router.push(item.href))}
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-text-primary cursor-pointer data-[selected=true]:bg-surface-hover"
            >
              <item.icon className="w-4 h-4 text-text-muted shrink-0" />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>

        {/* Quick Actions */}
        <Command.Group
          heading="Actions"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
        >
          <Command.Item
            value="Add new job"
            onSelect={() => handleSelect(() => router.push("/applications?action=add"))}
            className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-text-primary cursor-pointer data-[selected=true]:bg-surface-hover"
          >
            <PlusIcon className="w-4 h-4 text-text-muted shrink-0" />
            Add new job
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
