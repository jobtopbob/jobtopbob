"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateJob } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { SOURCES, LOCATION_TYPES, CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";

interface AddJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
}

interface FormState {
  title: string;
  companyName: string;
  stageId: string;
  source: string;
  sourceUrl: string;
  location: string;
  locationType: string;
  salaryCurrency: string;
  salaryMin: string;
  salaryMax: string;
  appliedAt: string;
  followUpAt: string;
  interest: string;
  jdRaw: string;
}

const initialForm: FormState = {
  title: "",
  companyName: "",
  stageId: "",
  source: "",
  sourceUrl: "",
  location: "",
  locationType: "",
  salaryCurrency: "USD",
  salaryMin: "",
  salaryMax: "",
  appliedAt: "",
  followUpAt: "",
  interest: "",
  jdRaw: "",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold text-text-tertiary uppercase tracking-wide">
      {children}
    </h3>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-brand-red ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function AddJobSheet({ open, onOpenChange, stages }: AddJobSheetProps) {
  const createJob = useCreateJob();
  const [form, setForm] = useState<FormState>(initialForm);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    createJob.mutate(
      {
        title: form.title.trim(),
        stage_id: form.stageId || undefined,
        source: form.source || undefined,
        source_url: form.sourceUrl || undefined,
        location: form.location || undefined,
        location_type: form.locationType || undefined,
        salary_currency: form.salaryCurrency || undefined,
        salary_min: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        salary_max: form.salaryMax ? parseInt(form.salaryMax) : undefined,
        interest: form.interest ? parseInt(form.interest) : undefined,
        jd_raw: form.jdRaw || undefined,
        applied_at: form.appliedAt
          ? new Date(form.appliedAt).toISOString()
          : undefined,
        follow_up_at: form.followUpAt
          ? new Date(form.followUpAt).toISOString()
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Job added successfully");
          setForm(initialForm);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add job"),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setForm(initialForm);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Job Application</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Job Title" required>
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  required
                />
              </Field>
            </div>
            <Field label="Company">
              <Input
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="e.g. Stripe"
              />
            </Field>
            <Field label="Stage">
              <Select
                value={form.stageId}
                onValueChange={(v) => set("stageId", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          {/* Source & Location */}
          <div className="space-y-3">
            <SectionHeading>Source & Location</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Source">
                <Select
                  value={form.source}
                  onValueChange={(v) => set("source", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Location Type">
                <Select
                  value={form.locationType}
                  onValueChange={(v) => set("locationType", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((lt) => (
                      <SelectItem key={lt.value} value={lt.value}>
                        {lt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Source URL">
                <Input
                  value={form.sourceUrl}
                  onChange={(e) => set("sourceUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                />
              </Field>
            </div>
          </div>

          <Separator />

          {/* Compensation + Dates side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <SectionHeading>Compensation</SectionHeading>
              <Field label="Currency">
                <Select
                  value={form.salaryCurrency}
                  onValueChange={(v) => set("salaryCurrency", v ?? "USD")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Min">
                  <Input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => set("salaryMin", e.target.value)}
                    placeholder="150k"
                  />
                </Field>
                <Field label="Max">
                  <Input
                    type="number"
                    value={form.salaryMax}
                    onChange={(e) => set("salaryMax", e.target.value)}
                    placeholder="200k"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3">
              <SectionHeading>Dates</SectionHeading>
              <Field label="Applied Date">
                <Input
                  type="date"
                  value={form.appliedAt}
                  onChange={(e) => set("appliedAt", e.target.value)}
                />
              </Field>
              <Field label="Follow Up">
                <Input
                  type="date"
                  value={form.followUpAt}
                  onChange={(e) => set("followUpAt", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            <SectionHeading>Details</SectionHeading>
            <Field label="Interest">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("interest", String(n))}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      parseInt(form.interest) >= n
                        ? "bg-brand text-white"
                        : "bg-surface-hover text-text-muted hover:bg-surface-active"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Job Description">
              <Textarea
                value={form.jdRaw}
                onChange={(e) => set("jdRaw", e.target.value)}
                placeholder="Paste the job description here..."
                rows={4}
              />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              className="bg-brand text-white hover:bg-brand/90"
              disabled={!form.title.trim() || createJob.isPending}
            >
              {createJob.isPending ? "Adding..." : "Add Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
