import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface StepperProps {
  currentStep: number;
  steps: { label: string }[];
  onStepClick?: (step: number) => void;
  canAdvance?: boolean;
  className?: string;
}

export function Stepper({
  currentStep,
  steps,
  onStepClick,
  canAdvance = true,
  className,
}: StepperProps) {
  function isClickable(index: number) {
    if (index < currentStep) return true;
    if (index === currentStep + 1 && canAdvance) return true;
    return false;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Row 1: Circles + connector lines */}
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <div
              key={index}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <button
                type="button"
                disabled={!isClickable(index) && index !== currentStep}
                onClick={() => isClickable(index) && onStepClick?.(index)}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  index < currentStep &&
                    "bg-brand text-white cursor-pointer hover:bg-brand/80",
                  index === currentStep && "bg-brand text-white",
                  index > currentStep && "bg-surface-hover text-text-muted",
                  isClickable(index) &&
                    index !== currentStep &&
                    "cursor-pointer",
                  !isClickable(index) &&
                    index !== currentStep &&
                    "cursor-default"
                )}
                aria-current={index === currentStep ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.label}`}
              >
                {index < currentStep ? (
                  <CheckIcon className="size-3.5" weight="bold" />
                ) : (
                  index + 1
                )}
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-[2px] flex-1 rounded-full transition-colors",
                    index < currentStep ? "bg-brand" : "bg-surface-hover"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2: Labels */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <span
            key={index}
            className={cn(
              "text-[11px] leading-tight text-center whitespace-nowrap",
              index === 0 && "text-left",
              index === steps.length - 1 && "text-right",
              index === currentStep
                ? "text-text-primary font-medium"
                : "text-text-muted"
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}
