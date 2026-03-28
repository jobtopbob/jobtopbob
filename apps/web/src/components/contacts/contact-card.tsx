"use client";

import Image from "next/image";
import { UserIcon, BuildingsIcon, EnvelopeIcon, CalendarIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/hooks/use-contacts";

const statusColors: Record<string, string> = {
  active: "bg-emerald-400/15 text-emerald-600",
  "follow-up": "bg-amber-400/15 text-amber-600",
  dormant: "bg-zinc-400/15 text-zinc-500",
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

interface ContactCardProps {
  contact: Contact;
  onClick: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const initial = contact.name.charAt(0).toUpperCase();
  const color = getAvatarColor(contact.name);

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-4 text-left transition-colors hover:border-border-subtle/80 hover:bg-card/80 cursor-pointer"
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3">
        {contact.avatar_url ? (
          <Image
            src={contact.avatar_url}
            alt={contact.name}
            width={40}
            height={40}
            unoptimized
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          >
            <span className="text-base font-bold text-white">{initial}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate block">
            {contact.name}
          </span>
          {contact.role && (
            <span className="text-xs text-text-muted truncate block">
              {contact.role}
            </span>
          )}
        </div>
        {contact.status && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${statusColors[contact.status] ?? statusColors.dormant}`}
          >
            {contact.status}
          </span>
        )}
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5">
        {contact.company_name && (
          <Badge variant="secondary" className="text-[10px]">
            <BuildingsIcon className="w-3 h-3" />
            {contact.company_name}
          </Badge>
        )}
        {contact.email && (
          <Badge variant="secondary" className="text-[10px]">
            <EnvelopeIcon className="w-3 h-3" />
            {contact.email}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-text-muted mt-auto pt-1">
        {contact.source && (
          <span className="flex items-center gap-1 capitalize">
            <UserIcon className="w-3.5 h-3.5" />
            {contact.source}
          </span>
        )}
        {contact.last_contact && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            {new Date(contact.last_contact).toLocaleDateString()}
          </span>
        )}
      </div>
    </button>
  );
}
