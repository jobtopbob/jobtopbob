"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileTextIcon } from "@phosphor-icons/react";

interface ResumeStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ResumeStep({ onNext, onBack }: ResumeStepProps) {
  return (
    <Card>
      <CardContent className="space-y-6 pt-2">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary">
            Resume Builder
          </h2>
          <p className="text-sm text-text-muted">
            JobTopBob includes an integrated resume builder powered by Reactive
            Resume. Create and manage multiple resume versions, then link them to
            specific applications.
          </p>
        </div>

        <div className="flex items-start gap-4 rounded-lg border border-border p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
            <FileTextIcon className="size-5 text-brand" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">
              Create your first resume
            </p>
            <p className="text-xs text-text-muted">
              You can create and import resumes from the Resumes page after
              setup. Each application can be linked to a specific resume version
              for tracking which resume performs best.
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={onNext}>Continue</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
