"use client";

import { useState, useEffect, useRef } from "react";
import { Controller, useForm, type Control, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { useCreateOffer } from "@/hooks/use-offers";
import { JobCombobox } from "./job-combobox";
import type { Job } from "@/hooks/use-jobs";
import { toast } from "sonner";
import { intervalLabel, remotePolicyLabel } from "@/lib/offer-utils";
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

// --- Schema ---

const formSchema = z.object({
  jobId: z.string().min(1, "Please select a job"),
  baseSalary: z.string(),
  currency: z.string(),
  salaryInterval: z.string(),
  signOnBonus: z.string(),
  annualBonus: z.string(),
  equity: z.string(),
  equityValue: z.string(),
  equitySchedule: z.string(),
  bonus: z.string(),
  ptoDays: z.string(),
  remotePolicy: z.string(),
  retirementMatch: z.string(),
  relocation: z.string(),
  workLocation: z.string(),
  deadline: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  jobId: "",
  baseSalary: "",
  currency: "USD",
  salaryInterval: "annual",
  signOnBonus: "",
  annualBonus: "",
  equity: "",
  equityValue: "",
  equitySchedule: "",
  bonus: "",
  ptoDays: "",
  remotePolicy: "",
  retirementMatch: "",
  relocation: "",
  workLocation: "",
  deadline: "",
};

// --- Step config ---

const STEPS = [
  { label: "Job & Pay" },
  { label: "Equity" },
  { label: "Benefits" },
] as const;

const LAST_STEP = STEPS.length - 1;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["jobId"],
  1: [],
  2: [],
};

// --- Types ---

interface AddOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedJob?: Job | null;
}

// --- Main Component ---

export function AddOfferDialog({
  open,
  onOpenChange,
  preselectedJob,
}: AddOfferDialogProps) {
  const createOffer = useCreateOffer();
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(
    preselectedJob ?? null
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onTouched",
  });

  const { control, handleSubmit, reset, trigger, watch, setValue, formState } = form;
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === LAST_STEP;

  const jobIdValue = watch("jobId");
  const canAdvance = currentStep === 0 ? (jobIdValue?.length ?? 0) > 0 : true;

  // Focus first input on step change
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      contentRef.current
        ?.querySelector<HTMLElement>("input, textarea")
        ?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [currentStep, open]);

  // Apply preselectedJob when dialog opens
  useEffect(() => {
    if (open && preselectedJob) {
      handleJobSelect(preselectedJob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedJob]);

  function handleJobSelect(job: Job | null) {
    setSelectedJob(job);
    setValue("jobId", job?.id ?? "", { shouldValidate: true });
    if (!job) return;

    const remotePolicyMap: Record<string, string> = {
      remote: "remote",
      hybrid: "hybrid",
      "on-site": "onsite",
      onsite: "onsite",
    };

    const validIntervals = ["annual", "monthly", "hourly"];
    const interval = job.salary_interval?.toLowerCase();

    const salary = (job.salary_offered ?? job.salary_max ?? job.salary_min)?.toString() ?? "";
    if (salary) setValue("baseSalary", salary);
    if (job.salary_currency) setValue("currency", job.salary_currency.toUpperCase());
    if (interval && validIntervals.includes(interval)) setValue("salaryInterval", interval);
    if (job.location) setValue("workLocation", job.location);
    if (job.location_type) {
      const mapped = remotePolicyMap[job.location_type.toLowerCase()];
      if (mapped) setValue("remotePolicy", mapped);
    }
  }

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep] ?? [];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    if (currentStep < LAST_STEP) {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  function handleReset() {
    reset(defaultValues);
    setSelectedJob(preselectedJob ?? null);
    setCurrentStep(0);
  }

  function onSubmit(data: FormValues) {
    createOffer.mutate(
      {
        job_id: data.jobId,
        base_salary: data.baseSalary ? parseInt(data.baseSalary) : undefined,
        currency: data.currency || undefined,
        salary_interval: (data.salaryInterval as "annual" | "monthly" | "hourly") || undefined,
        sign_on_bonus: data.signOnBonus ? parseInt(data.signOnBonus) : undefined,
        annual_bonus: data.annualBonus || undefined,
        equity: data.equity || undefined,
        equity_value: data.equityValue ? parseInt(data.equityValue) : undefined,
        equity_schedule: data.equitySchedule || undefined,
        bonus: data.bonus || undefined,
        pto_days: data.ptoDays ? parseInt(data.ptoDays) : undefined,
        remote_policy: (data.remotePolicy as "remote" | "hybrid" | "onsite") || undefined,
        retirement_match: data.retirementMatch || undefined,
        relocation: data.relocation || undefined,
        work_location: data.workLocation || undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Offer added");
          handleReset();
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add offer"),
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleReset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Offer</DialogTitle>
          <Stepper
            currentStep={currentStep}
            steps={[...STEPS]}
            onStepClick={(i) => {
              if (i < currentStep) setCurrentStep(i);
              else if (i === currentStep + 1 && canAdvance) handleNext();
            }}
            canAdvance={canAdvance}
            className="mx-auto mt-4 w-full max-w-[320px]"
          />
        </DialogHeader>

        <div ref={contentRef} className="min-h-[240px]">
          <div key={currentStep} className="animate-in fade-in-0 duration-200">
            {currentStep === 0 && (
              <StepJobAndPay
                control={control}
                selectedJob={selectedJob}
                onJobSelect={handleJobSelect}
              />
            )}
            {currentStep === 1 && <StepEquity control={control} />}
            {currentStep === 2 && <StepBenefits control={control} />}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {currentStep > 0 && (
              <Button type="button" variant="ghost" onClick={handleBack}>
                <CaretLeftIcon className="size-4" />
                Back
              </Button>
            )}
          </div>
          <div>
            {!isLastStep ? (
              <Button
                type="button"
                className="bg-brand text-white hover:bg-brand/90"
                onClick={handleNext}
                disabled={!canAdvance}
              >
                Next
                <CaretRightIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-brand text-white hover:bg-brand/90"
                onClick={handleSubmit(onSubmit)}
                disabled={createOffer.isPending}
              >
                {createOffer.isPending ? "Adding..." : "Add Offer"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Step Components ---

function StepJobAndPay({
  control,
  selectedJob,
  onJobSelect,
}: {
  control: Control<FormValues>;
  selectedJob: Job | null;
  onJobSelect: (job: Job | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Job selection — full width */}
      <div className="sm:col-span-3">
        <Controller
          name="jobId"
          control={control}
          render={({ fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel>
                Job <span className="text-brand-red">*</span>
              </FieldLabel>
              <JobCombobox value={selectedJob} onChange={onJobSelect} />
              {fieldState.error && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </div>

      {/* Base Salary */}
      <Controller
        name="baseSalary"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Base Salary</FieldLabel>
            <Input
              {...field}
              type="number"
              min={0}
              placeholder="e.g. 150000"
            />
          </Field>
        )}
      />

      {/* Interval */}
      <Controller
        name="salaryInterval"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Interval</FieldLabel>
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v ?? "annual")}
            >
              <SelectTrigger>{intervalLabel(field.value)}</SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      {/* Currency */}
      <Controller
        name="currency"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Currency</FieldLabel>
            <CurrencyCombobox
              value={field.value}
              onChange={field.onChange}
            />
          </Field>
        )}
      />

      {/* Sign-on Bonus */}
      <Controller
        name="signOnBonus"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Sign-on Bonus</FieldLabel>
            <Input
              {...field}
              type="number"
              min={0}
              placeholder="e.g. 25000"
            />
          </Field>
        )}
      />

      {/* Annual Bonus */}
      <div className="sm:col-span-2">
        <Controller
          name="annualBonus"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Annual Bonus</FieldLabel>
              <Input
                {...field}
                placeholder='e.g. 15% or $20,000'
              />
            </Field>
          )}
        />
      </div>
    </div>
  );
}

function StepEquity({ control }: { control: Control<FormValues> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Equity */}
      <Controller
        name="equity"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Equity</FieldLabel>
            <Input {...field} placeholder="e.g. 0.5% over 4y" />
          </Field>
        )}
      />

      {/* Equity Value */}
      <Controller
        name="equityValue"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Equity Value ($)</FieldLabel>
            <Input
              {...field}
              type="number"
              min={0}
              placeholder="e.g. 200000"
            />
          </Field>
        )}
      />

      {/* Vesting Schedule — full width */}
      <div className="sm:col-span-2">
        <Controller
          name="equitySchedule"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Vesting Schedule</FieldLabel>
              <Input {...field} placeholder="e.g. 4 years, 1 year cliff" />
            </Field>
          )}
        />
      </div>

      {/* Other Bonus — full width */}
      <div className="sm:col-span-2">
        <Controller
          name="bonus"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Other Bonus</FieldLabel>
              <Input {...field} placeholder="e.g. performance bonus" />
            </Field>
          )}
        />
      </div>
    </div>
  );
}

function StepBenefits({ control }: { control: Control<FormValues> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* PTO Days */}
      <Controller
        name="ptoDays"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>PTO Days/Year</FieldLabel>
            <Input
              {...field}
              type="number"
              min={0}
              placeholder="e.g. 25"
            />
          </Field>
        )}
      />

      {/* Remote Policy */}
      <Controller
        name="remotePolicy"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Remote Policy</FieldLabel>
            <Select
              value={field.value || "none"}
              onValueChange={(v) => field.onChange(v === "none" ? "" : v ?? "")}
            >
              <SelectTrigger>
                {remotePolicyLabel(field.value) ?? "Select..."}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      {/* Retirement Match */}
      <Controller
        name="retirementMatch"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Retirement Match</FieldLabel>
            <Input {...field} placeholder='e.g. 100% up to 6%' />
          </Field>
        )}
      />

      {/* Relocation */}
      <Controller
        name="relocation"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Relocation</FieldLabel>
            <Input {...field} placeholder="e.g. $10k stipend" />
          </Field>
        )}
      />

      {/* Work Location — full width */}
      <div className="sm:col-span-2">
        <Controller
          name="workLocation"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Work Location</FieldLabel>
              <Input {...field} placeholder="e.g. San Francisco, CA" />
            </Field>
          )}
        />
      </div>

      {/* Deadline — full width */}
      <div className="sm:col-span-2">
        <Controller
          name="deadline"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Deadline</FieldLabel>
              <Input {...field} type="date" />
            </Field>
          )}
        />
      </div>
    </div>
  );
}
