"use client";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LinkedinLogoIcon,
  EnvelopeIcon,
  UsersIcon,
  CalendarDotsIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import type { Contact } from "@/hooks/use-contacts";
import { PaginationControls } from "@/components/kanban/pagination-controls";

const statusColors: Record<string, string> = {
  active: "bg-emerald-400/15 text-emerald-600",
  "follow-up": "bg-amber-400/15 text-amber-600",
  dormant: "bg-zinc-400/15 text-zinc-500",
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  manual: UserPlusIcon,
  linkedin: LinkedinLogoIcon,
  email: EnvelopeIcon,
  referral: UsersIcon,
  event: CalendarDotsIcon,
};

const avatarColors = [
  "#635BFF",
  "#2A85FF",
  "#FF8400",
  "#83BF6E",
  "#8E59FF",
  "#E53E3E",
  "#0EA5E9",
  "#F59E0B",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface ContactsTableProps {
  contacts: Contact[];
  onContactClick: (contactId: string) => void;
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function ContactsTable({
  contacts,
  onContactClick,
  page = 1,
  perPage = 12,
  total = 0,
  onPageChange,
}: ContactsTableProps) {
  if (contacts.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="border-b border-border-subtle hover:bg-transparent">
            <TableHead className="bg-surface text-text-muted text-xs font-semibold pl-4">
              Name
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold">
              Company
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold">
              Email
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[100px]">
              Status
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[100px]">
              Source
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[100px]">
              Last Contact
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[90px] pr-4">
              Added
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const initial = contact.name.charAt(0).toUpperCase();
            const color = getAvatarColor(contact.name);
            const SourceIcon = contact.source
              ? sourceIcons[contact.source]
              : undefined;

            return (
              <TableRow
                key={contact.id}
                onClick={() => onContactClick(contact.id)}
                className="border-b border-border-subtle cursor-pointer hover:bg-surface-hover"
              >
                {/* Name + Avatar */}
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2.5">
                    {contact.avatar_url ? (
                      <Image
                        src={contact.avatar_url}
                        alt={contact.name}
                        width={32}
                        height={32}
                        unoptimized
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {initial}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {contact.name}
                      </span>
                      {contact.role && (
                        <span className="text-[11px] text-text-muted truncate">
                          {contact.role}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Company */}
                <TableCell>
                  {contact.company_name ? (
                    <div className="flex items-center gap-2">
                      {contact.company_logo_url ? (
                        <Image
                          src={contact.company_logo_url}
                          alt={contact.company_name}
                          width={20}
                          height={20}
                          unoptimized
                          className="w-5 h-5 rounded object-contain shrink-0"
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center w-5 h-5 rounded text-white text-[9px] font-semibold shrink-0"
                          style={{ backgroundColor: getAvatarColor(contact.company_name) }}
                        >
                          {contact.company_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-text-muted truncate">
                        {contact.company_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </TableCell>

                {/* Email */}
                <TableCell className="text-xs text-text-muted truncate max-w-[200px]">
                  {contact.email ?? "—"}
                </TableCell>

                {/* Status */}
                <TableCell>
                  {contact.status ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[contact.status] ?? statusColors.dormant}`}
                    >
                      {capitalizeFirst(contact.status)}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </TableCell>

                {/* Source */}
                <TableCell>
                  {contact.source ? (
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      {SourceIcon && (
                        <SourceIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {capitalizeFirst(contact.source)}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </TableCell>

                {/* Last Contact */}
                <TableCell className="text-[11px] text-text-muted">
                  {formatDate(contact.last_contact)}
                </TableCell>

                {/* Added */}
                <TableCell className="text-[11px] text-text-muted pr-4">
                  {formatDate(contact.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {onPageChange && total > 0 && (
        <PaginationControls
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
