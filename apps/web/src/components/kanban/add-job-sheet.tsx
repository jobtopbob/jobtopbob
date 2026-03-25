"use client";

import { useState, useEffect, useRef } from "react";
import { Controller, useForm, type UseFormReturn, type Control } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { useCreateJob } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import {
  SOURCES,
  LOCATION_TYPES,
  CURRENCIES,
  JOB_TYPES,
  JOB_LEVELS,
  SALARY_INTERVALS,
} from "@/lib/constants";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

// --- Schema ---

const formSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  companyName: z.string(),
  stageId: z.string(),
  jobType: z.string(),
  jobLevel: z.string(),
  source: z.string(),
  locationType: z.string(),
  sourceUrl: z.string(),
  location: z.string(),
  applicationUrl: z.string(),
  experienceRange: z.string(),
  salaryCurrency: z.string(),
  salaryInterval: z.string(),
  salaryMin: z.string(),
  salaryMax: z.string(),
  deadline: z.string(),
  appliedAt: z.string(),
  followUpAt: z.string(),
  interest: z.string(),
  jdRaw: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  title: "",
  companyName: "",
  stageId: "",
  jobType: "",
  jobLevel: "",
  source: "",
  locationType: "",
  sourceUrl: "",
  location: "",
  applicationUrl: "",
  experienceRange: "",
  salaryCurrency: "USD",
  salaryInterval: "annual",
  salaryMin: "",
  salaryMax: "",
  deadline: "",
  appliedAt: "",
  followUpAt: "",
  interest: "",
  jdRaw: "",
};

// Step 0 fields validated when clicking "Next"
const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["title"],
  1: [],
  2: [],
};

const STEPS = [
  { label: "The Basics" },
  { label: "Source & Location" },
  { label: "Details" },
] as const;

const LAST_STEP = STEPS.length - 1;

// --- Helpers ---

function findLabel(
  options: readonly { value: string; label: string }[],
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return options.find((o) => o.value === value)?.label;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold text-text-tertiary uppercase tracking-wide">
      {children}
    </h3>
  );
}

// --- Types ---

interface AddJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
}

// --- Main Component ---

export function AddJobSheet({ open, onOpenChange, stages }: AddJobSheetProps) {
  const createJob = useCreateJob();
  const contentRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onTouched",
  });

  const { control, handleSubmit, reset, trigger, watch, formState } = form;
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === LAST_STEP;

  const titleValue = watch("title");
  const canAdvance = currentStep === 0 ? (titleValue?.trim().length ?? 0) > 0 : true;

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
    setCurrentStep(0);
  }

  function onSubmit(data: FormValues) {
    createJob.mutate(
      {
        title: data.title.trim(),
        stage_id: data.stageId || undefined,
        source: data.source || undefined,
        source_url: data.sourceUrl || undefined,
        location: data.location || undefined,
        location_type: data.locationType || undefined,
        salary_currency: data.salaryCurrency || undefined,
        salary_min: data.salaryMin ? parseInt(data.salaryMin) : undefined,
        salary_max: data.salaryMax ? parseInt(data.salaryMax) : undefined,
        salary_interval: data.salaryInterval || undefined,
        interest: data.interest ? parseInt(data.interest) : undefined,
        jd_raw: data.jdRaw || undefined,
        applied_at: data.appliedAt
          ? new Date(data.appliedAt).toISOString()
          : undefined,
        follow_up_at: data.followUpAt
          ? new Date(data.followUpAt).toISOString()
          : undefined,
        deadline: data.deadline
          ? new Date(data.deadline).toISOString()
          : undefined,
        job_type: data.jobType || undefined,
        job_level: data.jobLevel || undefined,
        application_url: data.applicationUrl || undefined,
        experience_range: data.experienceRange || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Job added successfully");
          handleReset();
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add job"),
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
          <DialogTitle>Add Job Application</DialogTitle>
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

        {/* Step content */}
        <div ref={contentRef} className="min-h-[280px]">
          <div key={currentStep} className="animate-in fade-in-0 duration-200">
            {currentStep === 0 && (
              <StepBasics control={control} stages={stages} />
            )}
            {currentStep === 1 && (
              <StepSourceLocation control={control} />
            )}
            {currentStep === 2 && <StepDetails form={form} />}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {currentStep > 0 && (
              <Button type="button" variant="ghost" onClick={handleBack}>
                <ChevronLeft className="size-4" />
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
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-brand text-white hover:bg-brand/90"
                onClick={handleSubmit(onSubmit)}
                disabled={!formState.isValid || createJob.isPending}
              >
                {createJob.isPending ? "Adding..." : "Add Application"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Step Components ---

function StepBasics({ control, stages }: { control: Control<FormValues>; stages: Stage[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel>
                Job Title <span className="text-brand-red">*</span>
              </FieldLabel>
              <Input
                {...field}
                placeholder="e.g. Senior Frontend Engineer"
                aria-invalid={fieldState.invalid}
                autoFocus
              />
              {fieldState.error && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </div>
      <Controller
        name="companyName"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Company</FieldLabel>
            <Input {...field} placeholder="e.g. Stripe" />
          </Field>
        )}
      />
      <Controller
        name="stageId"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Stage</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stage">
                  {stages.find((s) => s.id === field.value)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <Controller
        name="jobType"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Job Type</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type">
                  {findLabel(JOB_TYPES, field.value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((jt) => (
                  <SelectItem key={jt.value} value={jt.value}>
                    {jt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <Controller
        name="jobLevel"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Level</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select level">
                  {findLabel(JOB_LEVELS, field.value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {JOB_LEVELS.map((jl) => (
                  <SelectItem key={jl.value} value={jl.value}>
                    {jl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
    </div>
  );
}

function StepSourceLocation({ control }: { control: Control<FormValues> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Controller
        name="source"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Source</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select">
                  {findLabel(SOURCES, field.value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <Controller
        name="locationType"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Location Type</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select">
                  {findLabel(LOCATION_TYPES, field.value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {lt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <Controller
        name="sourceUrl"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Source URL</FieldLabel>
            <Input {...field} placeholder="https://..." />
          </Field>
        )}
      />
      <Controller
        name="location"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input {...field} placeholder="e.g. San Francisco, CA" />
          </Field>
        )}
      />
      <Controller
        name="applicationUrl"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Application URL</FieldLabel>
            <Input {...field} placeholder="Direct apply link" />
          </Field>
        )}
      />
      <Controller
        name="experienceRange"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Experience</FieldLabel>
            <Input {...field} placeholder="e.g. 3-5 years" />
          </Field>
        )}
      />
    </div>
  );
}

function StepDetails({ form }: { form: UseFormReturn<FormValues> }) {
  const { control, watch, setValue } = form;
  const interest = watch("interest");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          <SectionHeading>Compensation</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="salaryCurrency"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Currency</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {findLabel(CURRENCIES, field.value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="salaryInterval"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Interval</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {findLabel(SALARY_INTERVALS, field.value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SALARY_INTERVALS.map((si) => (
                        <SelectItem key={si.value} value={si.value}>
                          {si.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="salaryMin"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Min</FieldLabel>
                  <Input {...field} type="number" placeholder="150k" />
                </Field>
              )}
            />
            <Controller
              name="salaryMax"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Max</FieldLabel>
                  <Input {...field} type="number" placeholder="200k" />
                </Field>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeading>Dates</SectionHeading>
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
          <Controller
            name="appliedAt"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Applied Date</FieldLabel>
                <Input {...field} type="date" />
              </Field>
            )}
          />
          <Controller
            name="followUpAt"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Follow Up</FieldLabel>
                <Input {...field} type="date" />
              </Field>
            )}
          />
        </div>
      </div>

      <Separator />

      <Field>
        <FieldLabel>Interest</FieldLabel>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue("interest", String(n))}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                parseInt(interest || "0") >= n
                  ? "bg-brand text-white"
                  : "bg-surface-hover text-text-muted hover:bg-surface-active"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <Controller
        name="jdRaw"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Job Description</FieldLabel>
            <Textarea
              {...field}
              placeholder="Paste the job description here..."
              rows={4}
            />
          </Field>
        )}
      />
    </div>
  );
}
