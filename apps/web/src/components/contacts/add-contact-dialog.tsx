"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanySelector } from "@/components/companies/company-selector";
import { useCreateContact } from "@/hooks/use-contacts";
import { toast } from "sonner";
import {
  LinkedinLogoIcon,
  EnvelopeIcon,
  UsersIcon,
  CalendarDotsIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  name: "",
  companyId: "",
  companyName: "",
  companyLogoUrl: "",
  role: "",
  email: "",
  linkedinUrl: "",
  source: "",
  status: "active",
  notes: "",
};

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

export function AddContactDialog({
  open,
  onOpenChange,
}: AddContactDialogProps) {
  const [form, setForm] = useState(initialForm);
  const createContact = useCreateContact();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Contact name is required");
      return;
    }

    createContact.mutate(
      {
        name: form.name.trim(),
        company_id: form.companyId || undefined,
        role: form.role || undefined,
        email: form.email || undefined,
        linkedin_url: form.linkedinUrl || undefined,
        source: form.source || undefined,
        status: form.status || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Contact added");
          setForm(initialForm);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add contact"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Smith"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Company
            </label>
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
              <label className="text-xs font-medium text-text-muted">
                Role
              </label>
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Engineering Manager"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Email
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              LinkedIn URL
            </label>
            <Input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) =>
                setForm({ ...form, linkedinUrl: e.target.value })
              }
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Status
              </label>
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
              <label className="text-xs font-medium text-text-muted">
                Source
              </label>
              <Select
                value={form.source}
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
              rows={2}
              placeholder="Any notes about this contact..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
