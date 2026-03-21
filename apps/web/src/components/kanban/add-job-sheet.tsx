"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateJob } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { toast } from "sonner";

interface AddJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
}

const SOURCES = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Company Website",
  "Referral",
  "Other",
];

const LOCATION_TYPES = ["Remote", "Hybrid", "Onsite"];

export function AddJobSheet({ open, onOpenChange, stages }: AddJobSheetProps) {
  const createJob = useCreateJob();
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [stageId, setStageId] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [interest, setInterest] = useState("");
  const [jdRaw, setJdRaw] = useState("");

  const resetForm = () => {
    setTitle("");
    setCompanyName("");
    setStageId("");
    setSource("");
    setSourceUrl("");
    setLocation("");
    setLocationType("");
    setSalaryMin("");
    setSalaryMax("");
    setInterest("");
    setJdRaw("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createJob.mutate(
      {
        title: title.trim(),
        stage_id: stageId || undefined,
        source: source || undefined,
        source_url: sourceUrl || undefined,
        location: location || undefined,
        location_type: locationType || undefined,
        salary_min: salaryMin ? parseInt(salaryMin) : undefined,
        salary_max: salaryMax ? parseInt(salaryMax) : undefined,
        interest: interest ? parseInt(interest) : undefined,
        jd_raw: jdRaw || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Job added successfully");
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Failed to add job");
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Job Application</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Stripe"
            />
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageId} onValueChange={(v) => setStageId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={(v) => setLocationType(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt.toLowerCase()}>
                      {lt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="salaryMin">Salary Min</Label>
              <Input
                id="salaryMin"
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="e.g. 150000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMax">Salary Max</Label>
              <Input
                id="salaryMax"
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="e.g. 200000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interest (1-5)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInterest(String(n))}
                  className={`w-8 h-8 rounded-full text-sm font-medium ${
                    parseInt(interest) >= n
                      ? "bg-[#FF8400] text-white"
                      : "bg-[#F5F5F7] text-[#8B8FA3]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jdRaw">Job Description</Label>
            <Textarea
              id="jdRaw"
              value={jdRaw}
              onChange={(e) => setJdRaw(e.target.value)}
              placeholder="Paste the job description here..."
              rows={5}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#FF8400] text-white hover:bg-[#FF8400]/90"
              disabled={!title.trim() || createJob.isPending}
            >
              {createJob.isPending ? "Adding..." : "Add Job"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
