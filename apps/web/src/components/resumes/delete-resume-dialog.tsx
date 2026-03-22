"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteResume, type Resume } from "@/hooks/use-resumes";
import { toast } from "sonner";

interface DeleteResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: Resume | null;
}

export function DeleteResumeDialog({
  open,
  onOpenChange,
  resume,
}: DeleteResumeDialogProps) {
  const deleteResume = useDeleteResume();

  const handleDelete = () => {
    if (!resume) return;

    deleteResume.mutate(resume.id, {
      onSuccess: () => {
        toast.success("Resume deleted");
        onOpenChange(false);
      },
      onError: () => {
        toast.error("Failed to delete resume");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Resume</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{resume?.name}&rdquo;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteResume.isPending}
          >
            {deleteResume.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
