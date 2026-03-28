"use client";

import { useState } from "react";
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
  ArrowSquareOutIcon,
  PencilIcon,
  TrashIcon,
  PushPinIcon,
  LinkIcon,
  NoteIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useResource,
  useUpdateResource,
  useDeleteResource,
  useToggleResourcePin,
} from "@/hooks/use-resources";

const typeIcons: Record<string, typeof LinkIcon> = {
  link: LinkIcon,
  note: NoteIcon,
};

interface ResourceDetailSheetProps {
  resourceId: string | null;
  onClose: () => void;
}

export function ResourceDetailSheet({
  resourceId,
  onClose,
}: ResourceDetailSheetProps) {
  const { data: resource } = useResource(resourceId ?? undefined);
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();
  const togglePin = useToggleResourcePin();
  const [editing, setEditing] = useState(false);

  if (!resource) return null;

  const Icon = typeIcons[resource.type] ?? LinkIcon;

  function handleDelete() {
    if (!resourceId) return;
    deleteResource.mutate(resourceId, {
      onSuccess: () => {
        toast.success("Resource deleted");
        onClose();
      },
      onError: () => toast.error("Failed to delete resource"),
    });
  }

  return (
    <Sheet open={!!resourceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface shrink-0">
              <Icon className="w-5 h-5 text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-text-primary truncate">
                {resource.title}
              </SheetTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {resource.type}
                </Badge>
                {resource.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_OPTIONS.find((o) => o.value === resource.category)?.label ?? resource.category}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (!resourceId) return;
                  togglePin.mutate(resourceId, {
                    onError: () => toast.error("Failed to toggle pin"),
                  });
                }}
                title={resource.pinned ? "Unpin" : "Pin"}
              >
                <PushPinIcon
                  className={`w-4 h-4 ${resource.pinned ? "text-brand" : ""}`}
                />
              </Button>
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
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex-1 px-6 pb-6 space-y-5">
          {editing ? (
            <EditForm
              resource={resource}
              onSave={(body) => {
                updateResource.mutate(
                  { id: resource.id, body },
                  {
                    onSuccess: () => {
                      toast.success("Resource updated");
                      setEditing(false);
                    },
                    onError: () => toast.error("Failed to update resource"),
                  }
                );
              }}
              onCancel={() => setEditing(false)}
              isPending={updateResource.isPending}
            />
          ) : (
            <>
              {resource.url && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    URL
                  </h3>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-brand hover:underline"
                  >
                    <ArrowSquareOutIcon className="w-4 h-4" />
                    {resource.url}
                  </a>
                </div>
              )}

              {resource.description && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">
                    {resource.description}
                  </p>
                </div>
              )}

              {resource.content && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Content
                  </h3>
                  <div className="text-sm text-text-secondary bg-surface rounded-lg p-4 whitespace-pre-wrap max-h-[400px] overflow-auto">
                    {resource.content}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 text-xs text-text-muted">
                <span>
                  Added: {new Date(resource.created_at).toLocaleDateString()}
                </span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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

interface EditFormProps {
  resource: NonNullable<ReturnType<typeof useResource>["data"]>;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}

function EditForm({ resource, onSave, onCancel, isPending }: EditFormProps) {
  const [form, setForm] = useState({
    title: resource.title,
    url: resource.url ?? "",
    type: resource.type,
    category: resource.category ?? "",
    description: resource.description ?? "",
    content: resource.content ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      title: form.title || undefined,
      url: form.url || undefined,
      type: form.type || undefined,
      category: form.category || undefined,
      description: form.description || undefined,
      content: form.content || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Title</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Type</label>
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
            onValueChange={(v) => setForm({ ...form, category: v ?? "" })}
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
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">
          Description
        </label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Content</label>
        <Textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={4}
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
