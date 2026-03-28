"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateJob } from "@/hooks/use-jobs";
import { toast } from "sonner";
import { SpinnerIcon } from "@phosphor-icons/react";

interface FirstJobStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function FirstJobStep({ onNext, onBack }: FirstJobStepProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const createJob = useCreateJob();

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Job title is required");
      return;
    }

    createJob.mutate(
      {
        title: title.trim(),
        source: "manual",
        source_url: url.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Application added");
          onNext();
        },
        onError: (err) =>
          toast.error(err.message ?? "Failed to create application"),
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-2">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary">
            Add Your First Application
          </h2>
          <p className="text-sm text-text-muted">
            Track a job you&apos;re interested in or have already applied to. You can
            always add more later.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboarding-title">Job Title</Label>
            <Input
              id="onboarding-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-url">Job Posting URL (optional)</Label>
            <Input
              id="onboarding-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onNext}>
              Skip
            </Button>
            <Button onClick={handleCreate} disabled={createJob.isPending}>
              {createJob.isPending && (
                <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add & Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
