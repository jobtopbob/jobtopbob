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
import { useCreateResource } from "@/hooks/use-resources";
import { toast } from "sonner";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialForm = {
  title: "",
  url: "",
  type: "link",
  category: "",
  description: "",
  content: "",
};

const TYPE_OPTIONS = [
  { value: "link", label: "Link" },
  { value: "note", label: "Note" },
];

const CATEGORY_OPTIONS = [
  { value: "interview-prep", label: "Interview Prep" },
  { value: "salary-negotiation", label: "Salary Negotiation" },
  { value: "resume-tips", label: "Resume Tips" },
  { value: "networking", label: "Networking" },
  { value: "career-development", label: "Career Development" },
  { value: "company-research", label: "Company Research" },
  { value: "other", label: "Other" },
];

export function AddResourceDialog({
  open,
  onOpenChange,
}: AddResourceDialogProps) {
  const [form, setForm] = useState(initialForm);
  const createResource = useCreateResource();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    createResource.mutate(
      {
        title: form.title.trim(),
        url: form.url || undefined,
        type: form.type || undefined,
        category: form.category || undefined,
        description: form.description || undefined,
        content: form.content || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Resource added");
          setForm(initialForm);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add resource"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Title *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. STAR Method Guide"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Type
              </label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v ?? "link" })}
                items={TYPE_OPTIONS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Category
              </label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v ?? "" })
                }
                items={CATEGORY_OPTIONS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">URL</label>
            <Input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Description
            </label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              placeholder="Brief description..."
            />
          </div>

          {form.type === "note" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">
                Content
              </label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                placeholder="Write your note or template content..."
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createResource.isPending}>
              {createResource.isPending ? "Adding..." : "Add Resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
