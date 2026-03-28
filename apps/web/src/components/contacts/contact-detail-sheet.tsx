"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EnvelopeIcon,
  LinkedinLogoIcon,
  BuildingsIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  CalendarDotsIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useContact,
  useUpdateContact,
  useDeleteContact,
  useUploadContactAvatar,
} from "@/hooks/use-contacts";
import { CompanySelector } from "@/components/companies/company-selector";

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

interface ContactDetailSheetProps {
  contactId: string | null;
  onClose: () => void;
  onCompanyClick?: (companyId: string) => void;
}

export function ContactDetailSheet({
  contactId,
  onClose,
  onCompanyClick,
}: ContactDetailSheetProps) {
  const { data: contact } = useContact(contactId ?? undefined);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const uploadAvatar = useUploadContactAvatar();
  const [editing, setEditing] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!contact) return null;

  const initial = contact.name.charAt(0).toUpperCase();
  const color = getAvatarColor(contact.name);

  function handleDelete() {
    if (!contactId) return;
    deleteContact.mutate(contactId, {
      onSuccess: () => {
        toast.success("Contact deleted");
        onClose();
      },
      onError: () => toast.error("Failed to delete contact"),
    });
  }

  return (
    <Sheet open={!!contactId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0 space-y-4">
          {/* Avatar + Name */}
          <div className="flex items-start gap-4">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !contactId) return;
                uploadAvatar.mutate(
                  { id: contactId, file },
                  {
                    onSuccess: () => toast.success("Avatar uploaded"),
                    onError: (err) => toast.error(err.message),
                  }
                );
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative group shrink-0 rounded-full focus:outline-none"
              title="Click to upload avatar"
            >
              {contact.avatar_url ? (
                <Image
                  src={contact.avatar_url}
                  alt={contact.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-lg font-bold text-white">{initial}</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <PencilIcon className="w-4 h-4 text-white" />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-text-primary truncate">
                {contact.name}
              </SheetTitle>
              {contact.role && (
                <span className="text-sm text-text-muted">{contact.role}</span>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(!editing)}
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <TrashIcon className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {contact.status && (
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${statusColors[contact.status] ?? statusColors.dormant}`}
              >
                {contact.status}
              </span>
            )}
            {contact.company_name && (
              <Badge
                variant="secondary"
                className={
                  contact.company_id && onCompanyClick
                    ? "cursor-pointer hover:bg-secondary/80 transition-colors"
                    : undefined
                }
                onClick={
                  contact.company_id && onCompanyClick
                    ? () => onCompanyClick(contact.company_id!)
                    : undefined
                }
              >
                <BuildingsIcon className="w-3 h-3" />
                {contact.company_name}
              </Badge>
            )}
            {contact.source && (
              <Badge variant="outline" className="capitalize">
                <UserIcon className="w-3 h-3" />
                {contact.source}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex-1 px-6 pb-6 space-y-5">
          {editing ? (
            <EditForm
              contact={contact}
              onSave={(body) => {
                updateContact.mutate(
                  { id: contact.id, body },
                  {
                    onSuccess: () => {
                      toast.success("Contact updated");
                      setEditing(false);
                    },
                    onError: () => toast.error("Failed to update contact"),
                  }
                );
              }}
              onCancel={() => setEditing(false)}
              isPending={updateContact.isPending}
            />
          ) : (
            <DetailView contact={contact} onCompanyClick={onCompanyClick} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailView({
  contact,
  onCompanyClick,
}: {
  contact: NonNullable<ReturnType<typeof useContact>["data"]>;
  onCompanyClick?: (companyId: string) => void;
}) {
  const details = [
    {
      icon: EnvelopeIcon,
      label: "Email",
      value: contact.email,
      href: contact.email ? `mailto:${contact.email}` : undefined,
    },
    {
      icon: LinkedinLogoIcon,
      label: "LinkedIn",
      value: contact.linkedin_url ? "View Profile" : null,
      href: contact.linkedin_url,
    },
    {
      icon: BuildingsIcon,
      label: "Company",
      value: contact.company_name,
      onClick:
        contact.company_id && onCompanyClick
          ? () => onCompanyClick(contact.company_id!)
          : undefined,
    },
    {
      icon: CalendarIcon,
      label: "Last Contact",
      value: contact.last_contact
        ? new Date(contact.last_contact).toLocaleDateString()
        : null,
    },
  ];

  return (
    <>
      {/* Details */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Details
        </h3>
        <div className="space-y-2.5">
          {details.map(
            ({ icon: Icon, label, value, href, onClick }) =>
              value && (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-muted w-24 shrink-0">{label}</span>
                  {href ? (
                    <a
                      href={href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline truncate"
                    >
                      {value as string}
                    </a>
                  ) : onClick ? (
                    <button
                      onClick={onClick}
                      className="text-brand hover:underline truncate"
                    >
                      {String(value)}
                    </button>
                  ) : (
                    <span className="text-text-primary truncate">
                      {String(value)}
                    </span>
                  )}
                </div>
              )
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Notes
          </h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-2 pt-2 text-xs text-text-muted">
        <span>
          Added: {new Date(contact.created_at).toLocaleDateString()}
        </span>
      </div>
    </>
  );
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", dotColor: "bg-emerald-500" },
  { value: "follow-up", label: "Follow Up", dotColor: "bg-amber-500" },
  { value: "dormant", label: "Dormant", dotColor: "bg-zinc-400" },
];

const STATUS_DOT_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  "follow-up": "bg-amber-500",
  dormant: "bg-zinc-400",
};

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual", icon: UserPlusIcon },
  { value: "linkedin", label: "LinkedIn", icon: LinkedinLogoIcon },
  { value: "email", label: "Email", icon: EnvelopeIcon },
  { value: "referral", label: "Referral", icon: UsersIcon },
  { value: "event", label: "Event", icon: CalendarDotsIcon },
];

interface EditFormProps {
  contact: NonNullable<ReturnType<typeof useContact>["data"]>;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}

function EditForm({ contact, onSave, onCancel, isPending }: EditFormProps) {
  const [form, setForm] = useState({
    name: contact.name,
    companyId: contact.company_id ?? "",
    companyName: contact.company_name ?? "",
    companyLogoUrl: "",
    role: contact.role ?? "",
    email: contact.email ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    source: contact.source ?? "",
    status: contact.status ?? "active",
    notes: contact.notes ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: form.name || undefined,
      company_id: form.companyId ?? "",
      role: form.role || undefined,
      email: form.email || undefined,
      linkedin_url: form.linkedin_url || undefined,
      source: form.source || undefined,
      status: form.status || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Company</label>
        <CompanySelector
          value={form.companyId || null}
          displayName={form.companyName || null}
          logoUrl={form.companyLogoUrl || null}
          onChange={(id, name, logoUrl) =>
            setForm({
              ...form,
              companyId: id ?? "",
              companyName: name ?? "",
              companyLogoUrl: logoUrl ?? "",
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Role</label>
          <Input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Email</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">
          LinkedIn URL
        </label>
        <Input
          type="url"
          value={form.linkedin_url}
          onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Status</label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v ?? "" })}
          >
            <SelectTrigger>
              <span className="flex items-center gap-2 capitalize">
                {form.status && (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[form.status] ?? ""}`}
                  />
                )}
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`}
                    />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Source</label>
          <Select
            value={form.source || ""}
            onValueChange={(v) => setForm({ ...form, source: v ?? "" })}
          >
            <SelectTrigger>
              <span className="flex items-center gap-2 capitalize">
                {form.source &&
                  (() => {
                    const Icon = SOURCE_OPTIONS.find(
                      (o) => o.value === form.source
                    )?.icon;
                    return Icon ? (
                      <Icon className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                    ) : null;
                  })()}
                <SelectValue placeholder="Select..." />
              </span>
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <opt.icon className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
