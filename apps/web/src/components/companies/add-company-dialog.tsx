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
import { useCreateCompany } from "@/hooks/use-companies";
import { toast } from "sonner";

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  name: "",
  website: "",
  industry: "",
  size: "",
  location: "",
  notes: "",
};

export function AddCompanyDialog({ open, onOpenChange }: AddCompanyDialogProps) {
  const [form, setForm] = useState(initialForm);
  const createCompany = useCreateCompany();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    createCompany.mutate(
      {
        name: form.name.trim(),
        website: form.website || undefined,
        industry: form.industry || undefined,
        size: form.size || undefined,
        location: form.location || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Company added");
          setForm(initialForm);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add company"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Name *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Stripe"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Website
            </label>
            <Input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://stripe.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Industry
              </label>
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Technology"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Size
              </label>
              <Input
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="e.g. 201-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Location
            </label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Any notes about this company..."
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
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? "Adding..." : "Add Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
