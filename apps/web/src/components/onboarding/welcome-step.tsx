"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BriefcaseIcon,
  FileTextIcon,
  EnvelopeIcon,
  SparkleIcon,
} from "@phosphor-icons/react";

const features = [
  {
    icon: BriefcaseIcon,
    title: "Track Applications",
    description:
      "Kanban board, calendar, and table views to manage every application.",
  },
  {
    icon: FileTextIcon,
    title: "Resume Builder",
    description:
      "Integrated resume builder with version snapshots per application.",
  },
  {
    icon: SparkleIcon,
    title: "AI Assistant",
    description:
      "Suitability scoring, cover letters, interview prep — bring your own key.",
  },
  {
    icon: EnvelopeIcon,
    title: "Email Integration",
    description:
      "Auto-detect interview invites, rejections, and offers from Gmail.",
  },
];

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-6 pt-2">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-text-primary">
            Welcome to JobTopBob
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Your open-source job search command center. Let's get you set up in
            a few quick steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex gap-3 rounded-lg border border-border p-4"
            >
              <f.icon className="size-5 shrink-0 text-brand mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {f.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext}>Get Started</Button>
        </div>
      </CardContent>
    </Card>
  );
}
