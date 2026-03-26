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
  Globe,
  MapPin,
  Users,
  Calendar,
  Linkedin,
  Pencil,
  Trash2,
  Building2,
  Briefcase,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCompany,
  useUpdateCompany,
  useDeleteCompany,
  useEnrichCompany,
  useUploadCompanyLogo,
  useDeleteCompanyLogo,
  useEnrichmentLogs,
  type EnrichmentLog,
} from "@/hooks/use-companies";

const logoColors = [
  "#635BFF",
  "#2A85FF",
  "#FF8400",
  "#83BF6E",
  "#8E59FF",
  "#E53E3E",
  "#0EA5E9",
  "#F59E0B",
];

function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return logoColors[Math.abs(hash) % logoColors.length];
}

interface CompanyDetailSheetProps {
  companyId: string | null;
  onClose: () => void;
}

export function CompanyDetailSheet({
  companyId,
  onClose,
}: CompanyDetailSheetProps) {
  const { data: company } = useCompany(companyId ?? undefined);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const enrichCompany = useEnrichCompany();
  const uploadLogo = useUploadCompanyLogo();
  const deleteLogo = useDeleteCompanyLogo();
  const [editing, setEditing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!company) return null;

  const initial = company.name.charAt(0).toUpperCase();
  const color = getLogoColor(company.name);
  const jobCount = company.job_count ?? 0;

  function handleDelete() {
    if (!companyId) return;
    deleteCompany.mutate(companyId, {
      onSuccess: () => {
        toast.success("Company deleted");
        onClose();
      },
      onError: () => toast.error("Failed to delete company"),
    });
  }

  return (
    <Sheet open={!!companyId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0 space-y-4">
          {/* Logo + Name */}
          <div className="flex items-start gap-4">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !companyId) return;
                uploadLogo.mutate(
                  { id: companyId, file },
                  {
                    onSuccess: () => toast.success("Logo uploaded"),
                    onError: (err) => toast.error(err.message),
                  }
                );
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative group shrink-0 rounded-xl focus:outline-none"
              title="Click to upload logo"
            >
              {company.logo_url ? (
                <Image
                  src={company.logo_url}
                  alt={company.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 rounded-xl object-contain bg-card border border-border-subtle p-0.5"
                />
              ) : (
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-lg font-bold text-white">
                    {initial}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                <Pencil className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-text-primary truncate">
                {company.name}
              </SheetTitle>
              {company.domain && (
                <span className="text-sm text-text-muted">{company.domain}</span>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                title="Enrich company data"
                disabled={enrichCompany.isPending}
                onClick={() => {
                  if (!companyId) return;
                  enrichCompany.mutate(companyId, {
                    onSuccess: () => toast.success("Enrichment queued"),
                    onError: () => toast.error("Failed to enrich company"),
                  });
                }}
              >
                <Wand2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(!editing)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {company.industry && (
              <Badge variant="secondary">
                <Building2 className="w-3 h-3" />
                {company.industry}
              </Badge>
            )}
            {company.size && (
              <Badge variant="secondary">
                <Users className="w-3 h-3" />
                {company.size}
              </Badge>
            )}
            <Badge variant="outline">
              <Briefcase className="w-3 h-3" />
              {jobCount} {jobCount === 1 ? "application" : "applications"}
            </Badge>
            {company.enrichment_status !== "none" && (
              <Badge
                variant={
                  company.enrichment_status === "enriched"
                    ? "secondary"
                    : company.enrichment_status === "failed"
                      ? "destructive"
                      : "outline"
                }
              >
                <Wand2 className="w-3 h-3" />
                {company.enrichment_status === "enriched"
                  ? "Enriched"
                  : company.enrichment_status === "pending"
                    ? "Enriching..."
                    : "Enrichment Failed"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex-1 px-6 pb-6 space-y-5">
          {editing ? (
            <EditForm
              company={company}
              onSave={(body) => {
                updateCompany.mutate(
                  { id: company.id, body },
                  {
                    onSuccess: () => {
                      toast.success("Company updated");
                      setEditing(false);
                    },
                    onError: () => toast.error("Failed to update company"),
                  }
                );
              }}
              onCancel={() => setEditing(false)}
              isPending={updateCompany.isPending}
            />
          ) : (
            <DetailView company={company} companyId={companyId!} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailView({
  company,
  companyId,
}: {
  company: NonNullable<ReturnType<typeof useCompany>["data"]>;
  companyId: string;
}) {
  const { data: enrichmentLogs } = useEnrichmentLogs(companyId);
  const details = [
    {
      icon: Globe,
      label: "Website",
      value: company.website,
      href: company.website,
    },
    { icon: MapPin, label: "Location", value: company.location },
    { icon: Users, label: "Employees", value: company.employee_count?.toLocaleString() },
    { icon: Calendar, label: "Founded", value: company.founded_year },
    {
      icon: Linkedin,
      label: "LinkedIn",
      value: company.linkedin_url ? "View Profile" : null,
      href: company.linkedin_url,
    },
  ];

  return (
    <>
      {/* Description */}
      {company.description && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            About
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {company.description}
          </p>
        </div>
      )}

      {/* Details */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Details
        </h3>
        <div className="space-y-2.5">
          {details.map(
            ({ icon: Icon, label, value, href }) =>
              value && (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-muted w-20 shrink-0">{label}</span>
                  {href ? (
                    <a
                      href={href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline truncate"
                    >
                      {value as string}
                    </a>
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
      {company.notes && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Notes
          </h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {company.notes}
          </p>
        </div>
      )}

      {/* Enrichment History */}
      {enrichmentLogs && enrichmentLogs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Enrichment History
          </h3>
          <div className="space-y-2">
            {enrichmentLogs.map((log: EnrichmentLog) => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                    log.status === "success"
                      ? "bg-emerald-400"
                      : log.status === "failed"
                        ? "bg-red-400"
                        : "bg-text-muted/40"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-text-primary">
                      {log.provider}
                    </span>
                    <span className="text-text-muted">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {log.fields_set && log.fields_set.length > 0 && (
                    <span className="text-text-muted">
                      Set: {log.fields_set.join(", ")}
                    </span>
                  )}
                  {log.error && (
                    <span className="text-red-400">{log.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data source info */}
      <div className="flex items-center gap-2 pt-2 text-xs text-text-muted">
        <span>Source: {company.data_source.charAt(0).toUpperCase() + company.data_source.slice(1)}</span>
        {company.last_enriched_at && (
          <>
            <span>&middot;</span>
            <span>
              Enriched:{" "}
              {new Date(company.last_enriched_at).toLocaleDateString()}
            </span>
          </>
        )}
      </div>
    </>
  );
}

interface EditFormProps {
  company: NonNullable<ReturnType<typeof useCompany>["data"]>;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}

function EditForm({ company, onSave, onCancel, isPending }: EditFormProps) {
  const [form, setForm] = useState({
    name: company.name,
    website: company.website ?? "",
    description: company.description ?? "",
    industry: company.industry ?? "",
    size: company.size ?? "",
    location: company.location ?? "",
    founded_year: company.founded_year?.toString() ?? "",
    linkedin_url: company.linkedin_url ?? "",
    employee_count: company.employee_count?.toString() ?? "",
    notes: company.notes ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: form.name || undefined,
      website: form.website || undefined,
      description: form.description || undefined,
      industry: form.industry || undefined,
      size: form.size || undefined,
      location: form.location || undefined,
      founded_year: form.founded_year ? parseInt(form.founded_year) : undefined,
      linkedin_url: form.linkedin_url || undefined,
      employee_count: form.employee_count
        ? parseInt(form.employee_count)
        : undefined,
      notes: form.notes || undefined,
    });
  }

  const fields = [
    { key: "name", label: "Name", type: "text" },
    { key: "website", label: "Website", type: "url" },
    { key: "industry", label: "Industry", type: "text" },
    { key: "size", label: "Size", type: "text", placeholder: "e.g. 201-500" },
    { key: "location", label: "Location", type: "text" },
    { key: "founded_year", label: "Founded Year", type: "number" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "url" },
    { key: "employee_count", label: "Employee Count", type: "number" },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(({ key, label, type, ...rest }) => (
        <div key={key} className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">{label}</label>
          <Input
            type={type}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            {...rest}
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">
          Description
        </label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
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
