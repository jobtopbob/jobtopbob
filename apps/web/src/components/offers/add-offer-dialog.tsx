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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useCreateOffer } from "@/hooks/use-offers";
import { JobCombobox } from "./job-combobox";
import type { Job } from "@/hooks/use-jobs";
import { toast } from "sonner";
import { intervalLabel, remotePolicyLabel } from "@/lib/offer-utils";

interface AddOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a job (e.g. when prompted from Kanban drag). */
  preselectedJob?: Job | null;
}

const initialForm = {
  baseSalary: "",
  currency: "USD",
  salaryInterval: "annual",
  signOnBonus: "",
  annualBonus: "",
  equity: "",
  equityValue: "",
  equitySchedule: "",
  bonus: "",
  ptoDays: "",
  remotePolicy: "",
  retirementMatch: "",
  relocation: "",
  workLocation: "",
  deadline: "",
};

export function AddOfferDialog({
  open,
  onOpenChange,
  preselectedJob,
}: AddOfferDialogProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(
    preselectedJob ?? null
  );
  const [form, setForm] = useState(initialForm);
  const createOffer = useCreateOffer();

  /** Pre-fill form fields from job data when a job is selected. */
  function handleJobSelect(job: Job | null) {
    setSelectedJob(job);
    if (!job) return;

    // Map location_type to remote_policy
    const remotePolicyMap: Record<string, string> = {
      remote: "remote",
      hybrid: "hybrid",
      "on-site": "onsite",
      onsite: "onsite",
    };

    // Normalize interval to valid enum value
    const validIntervals = ["annual", "monthly", "hourly"];
    const interval = job.salary_interval?.toLowerCase();

    setForm((prev) => ({
      ...prev,
      baseSalary:
        (job.salary_offered ?? job.salary_max ?? job.salary_min)?.toString() ?? prev.baseSalary,
      currency: job.salary_currency?.toUpperCase() ?? prev.currency,
      salaryInterval:
        interval && validIntervals.includes(interval) ? interval : prev.salaryInterval,
      workLocation: job.location ?? prev.workLocation,
      remotePolicy:
        (job.location_type ? remotePolicyMap[job.location_type.toLowerCase()] : undefined) ?? prev.remotePolicy,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob) {
      toast.error("Please select a job");
      return;
    }
    if (form.baseSalary && parseInt(form.baseSalary) < 0) {
      toast.error("Base salary must be non-negative");
      return;
    }
    if (form.signOnBonus && parseInt(form.signOnBonus) < 0) {
      toast.error("Sign-on bonus must be non-negative");
      return;
    }
    if (form.equityValue && parseInt(form.equityValue) < 0) {
      toast.error("Equity value must be non-negative");
      return;
    }
    if (form.ptoDays && parseInt(form.ptoDays) < 0) {
      toast.error("PTO days must be non-negative");
      return;
    }

    createOffer.mutate(
      {
        job_id: selectedJob.id,
        base_salary: form.baseSalary ? parseInt(form.baseSalary) : undefined,
        currency: form.currency || undefined,
        salary_interval: (form.salaryInterval as "annual" | "monthly" | "hourly") || undefined,
        sign_on_bonus: form.signOnBonus
          ? parseInt(form.signOnBonus)
          : undefined,
        annual_bonus: form.annualBonus || undefined,
        equity: form.equity || undefined,
        equity_value: form.equityValue
          ? parseInt(form.equityValue)
          : undefined,
        equity_schedule: form.equitySchedule || undefined,
        bonus: form.bonus || undefined,
        pto_days: form.ptoDays ? parseInt(form.ptoDays) : undefined,
        remote_policy: (form.remotePolicy as "remote" | "hybrid" | "onsite") || undefined,
        retirement_match: form.retirementMatch || undefined,
        relocation: form.relocation || undefined,
        work_location: form.workLocation || undefined,
        deadline: form.deadline
          ? new Date(form.deadline).toISOString()
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Offer added");
          setForm(initialForm);
          setSelectedJob(null);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add offer"),
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setForm(initialForm);
          setSelectedJob(preselectedJob ?? null);
        } else if (preselectedJob) {
          handleJobSelect(preselectedJob);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Offer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Job Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Job *
            </label>
            <JobCombobox value={selectedJob} onChange={handleJobSelect} />
          </div>

          {/* Compensation */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Base Salary
              </label>
              <Input
                type="number"
                min={0}
                value={form.baseSalary}
                onChange={(e) =>
                  setForm({ ...form, baseSalary: e.target.value })
                }
                placeholder="e.g. 150000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Interval
              </label>
              <Select
                value={form.salaryInterval}
                onValueChange={(v) =>
                  setForm({ ...form, salaryInterval: v ?? "annual" })
                }
              >
                <SelectTrigger>
                  {intervalLabel(form.salaryInterval)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Currency
              </label>
              <Input
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value.toUpperCase() })
                }
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Sign-on Bonus
              </label>
              <Input
                type="number"
                min={0}
                value={form.signOnBonus}
                onChange={(e) =>
                  setForm({ ...form, signOnBonus: e.target.value })
                }
                placeholder="e.g. 25000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Annual Bonus
              </label>
              <Input
                value={form.annualBonus}
                onChange={(e) =>
                  setForm({ ...form, annualBonus: e.target.value })
                }
                placeholder='e.g. 15% or $20,000'
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Equity
              </label>
              <Input
                value={form.equity}
                onChange={(e) => setForm({ ...form, equity: e.target.value })}
                placeholder="e.g. 0.5% over 4y"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Equity Value ($)
              </label>
              <Input
                type="number"
                min={0}
                value={form.equityValue}
                onChange={(e) =>
                  setForm({ ...form, equityValue: e.target.value })
                }
                placeholder="e.g. 200000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Vesting Schedule
            </label>
            <Input
              value={form.equitySchedule}
              onChange={(e) =>
                setForm({ ...form, equitySchedule: e.target.value })
              }
              placeholder="e.g. 4 years, 1 year cliff"
            />
          </div>

          <Separator />

          {/* Benefits & Work */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Benefits & Work
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                PTO Days/Year
              </label>
              <Input
                type="number"
                min={0}
                value={form.ptoDays}
                onChange={(e) =>
                  setForm({ ...form, ptoDays: e.target.value })
                }
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Remote Policy
              </label>
              <Select
                value={form.remotePolicy || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, remotePolicy: v === "none" ? "" : v ?? "" })
                }
              >
                <SelectTrigger>
                  {remotePolicyLabel(form.remotePolicy) ?? "Select..."}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Retirement Match
              </label>
              <Input
                value={form.retirementMatch}
                onChange={(e) =>
                  setForm({ ...form, retirementMatch: e.target.value })
                }
                placeholder='e.g. 100% up to 6%'
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Relocation
              </label>
              <Input
                value={form.relocation}
                onChange={(e) =>
                  setForm({ ...form, relocation: e.target.value })
                }
                placeholder="e.g. $10k stipend"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Work Location
            </label>
            <Input
              value={form.workLocation}
              onChange={(e) =>
                setForm({ ...form, workLocation: e.target.value })
              }
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Deadline
            </label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
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
            <Button type="submit" disabled={createOffer.isPending}>
              {createOffer.isPending ? "Adding..." : "Add Offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
