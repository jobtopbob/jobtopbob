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
  { value: "file", label: "File" },
  { value: "template", label: "Template" },
];

const CATEGORY_OPTIONS = [
  "interview-prep",
  "salary-negotiation",
  "resume-tips",
  "networking",
  "career-development",
  "company-research",
  "other",
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
                value={form.category || undefined}
                onValueChange={(v) =>
                  setForm({ ...form, category: v ?? "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
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

          {(form.type === "note" || form.type === "template") && (
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
