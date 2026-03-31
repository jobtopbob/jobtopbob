"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateUserSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { SpinnerIcon, SparkleIcon, InfoIcon } from "@phosphor-icons/react";

const AI_PROVIDERS = [
  {
    value: "openai",
    label: "OpenAI",
    description: "GPT-4o, GPT-4o mini, and other OpenAI models",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    description: "Claude Sonnet, Haiku, and other Anthropic models",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    description: "Gemini 2.5 Flash, Pro, and other Google models",
  },
  {
    value: "ollama",
    label: "Ollama (Local)",
    description: "Free and offline — runs on your own hardware",
  },
];

interface AISetupStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function AISetupStep({ onNext, onBack }: AISetupStepProps) {
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const updateSettings = useUpdateUserSettings();

  const handleSave = () => {
    if (!provider) {
      onNext();
      return;
    }

    updateSettings.mutate(
      {
        ai_provider: provider,
        ai_model: model || null,
      },
      {
        onSuccess: () => {
          toast.success("AI provider configured");
          onNext();
        },
        onError: (err) =>
          toast.error(err.message ?? "Failed to save AI settings"),
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SparkleIcon className="size-5 text-brand" />
            <h2 className="text-xl font-bold text-text-primary">
              AI Provider Setup
            </h2>
          </div>
          <p className="text-sm text-text-muted">
            AI powers suitability scoring, cover letter generation, interview
            prep, ATS analysis, and email classification. Select the provider
            your server is configured with.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col items-start">
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider && (
            <div className="space-y-2">
              <Label htmlFor="onboarding-model">Model Override (optional)</Label>
              <Input
                id="onboarding-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  provider === "anthropic"
                    ? "e.g. claude-sonnet-4-20250514"
                    : provider === "gemini"
                      ? "e.g. gemini-2.5-flash"
                      : provider === "ollama"
                        ? "e.g. llama3.2, mistral"
                        : "e.g. gpt-4o, gpt-4o-mini"
                }
              />
              <p className="text-xs text-text-muted">
                Leave empty to use the server default. You can change this later
                in Settings.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-hover/50 p-3">
          <InfoIcon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            API keys are configured by the server admin via environment
            variables — not entered here. If you&apos;re self-hosting, see the{" "}
            <a
              href="https://docs.jobtopbob.com/features/ai-setup"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-text-primary"
            >
              AI Setup guide
            </a>{" "}
            for configuration details.
          </p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onNext}>
              Skip
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending && (
                <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
              )}
              {provider ? "Save & Continue" : "Continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
