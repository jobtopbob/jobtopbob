"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TemplateSelector } from "./template-selector";
import { useCreateResume, type CreateResumeRequest } from "@/hooks/use-resumes";
import { toast } from "sonner";

interface CreateResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateResumeDialog({
  open,
  onOpenChange,
}: CreateResumeDialogProps) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("onyx");
  const [withSampleData, setWithSampleData] = useState(false);

  const createResume = useCreateResume();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createResume.mutate(
      {
        name: name.trim(),
        template: template as CreateResumeRequest["template"],
        with_sample_data: withSampleData,
      },
      {
        onSuccess: () => {
          toast.success("Resume created");
          onOpenChange(false);
          setName("");
          setTemplate("onyx");
          setWithSampleData(false);
        },
        onError: () => {
          toast.error("Failed to create resume");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Resume</DialogTitle>
            <DialogDescription>
              Choose a template and name for your resume.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resume-name">Name</Label>
              <Input
                id="resume-name"
                placeholder="My Resume"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <TemplateSelector value={template} onChange={setTemplate} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={withSampleData}
                onCheckedChange={(checked) =>
                  setWithSampleData(checked === true)
                }
              />
              <span className="text-sm text-text-secondary">
                Start with sample data
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createResume.isPending}
            >
              {createResume.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
