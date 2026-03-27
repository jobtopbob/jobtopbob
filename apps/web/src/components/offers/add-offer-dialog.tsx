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
import { useCreateOffer } from "@/hooks/use-offers";
import { JobCombobox } from "./job-combobox";
import type { Job } from "@/hooks/use-jobs";
import { toast } from "sonner";

interface AddOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a job (e.g. when prompted from Kanban drag). */
  preselectedJob?: Job | null;
}

const initialForm = {
  baseSalary: "",
  currency: "USD",
  equity: "",
  bonus: "",
  benefits: "",
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob) {
      toast.error("Please select a job");
      return;
    }

    createOffer.mutate(
      {
        job_id: selectedJob.id,
        base_salary: form.baseSalary ? parseInt(form.baseSalary) : undefined,
        currency: form.currency || undefined,
        equity: form.equity || undefined,
        bonus: form.bonus || undefined,
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
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Offer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Job *
            </label>
            <JobCombobox
              value={selectedJob}
              onChange={setSelectedJob}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Base Salary
              </label>
              <Input
                type="number"
                value={form.baseSalary}
                onChange={(e) =>
                  setForm({ ...form, baseSalary: e.target.value })
                }
                placeholder="e.g. 150000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Currency
              </label>
              <Input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                placeholder="USD"
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
                Bonus
              </label>
              <Input
                value={form.bonus}
                onChange={(e) => setForm({ ...form, bonus: e.target.value })}
                placeholder="e.g. $20k signing"
              />
            </div>
          </div>

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
