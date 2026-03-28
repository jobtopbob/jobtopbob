"use client";

import { useState } from "react";
import { Stepper } from "@/components/ui/stepper";
import { WelcomeStep } from "./welcome-step";
import { AISetupStep } from "./ai-setup-step";
import { ResumeStep } from "./resume-step";
import { FirstJobStep } from "./first-job-step";
import { DoneStep } from "./done-step";
import { AppLogo } from "@/components/app-logo";

const steps = [
  { label: "Welcome" },
  { label: "AI Setup" },
  { label: "Resume" },
  { label: "First Job" },
  { label: "Done" },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3">
        <AppLogo size={32} />
        <span className="text-xl font-bold text-text-primary tracking-tight">
          JobTopBob
        </span>
      </div>

      <Stepper
        currentStep={currentStep}
        steps={steps}
        onStepClick={setCurrentStep}
      />

      <div className="min-h-[320px]">
        {currentStep === 0 && <WelcomeStep onNext={next} />}
        {currentStep === 1 && <AISetupStep onNext={next} onBack={back} />}
        {currentStep === 2 && <ResumeStep onNext={next} onBack={back} />}
        {currentStep === 3 && <FirstJobStep onNext={next} onBack={back} />}
        {currentStep === 4 && <DoneStep />}
      </div>
    </div>
  );
}
