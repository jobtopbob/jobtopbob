"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCompleteOnboarding } from "@/hooks/use-onboarding";
import { SpinnerIcon, CheckCircleIcon } from "@phosphor-icons/react";

export function DoneStep() {
  const router = useRouter();
  const completeOnboarding = useCompleteOnboarding();

  const handleFinish = () => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        router.push("/dashboard");
        router.refresh();
      },
    });
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-2">
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircleIcon className="size-8 text-green-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">
              You're all set!
            </h2>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Your workspace is ready. Start tracking applications, building
              resumes, and using AI to land your next role.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleFinish}
            disabled={completeOnboarding.isPending}
          >
            {completeOnboarding.isPending && (
              <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
            )}
            Go to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
