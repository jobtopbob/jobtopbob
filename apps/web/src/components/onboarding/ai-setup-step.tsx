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
import { SpinnerIcon } from "@phosphor-icons/react";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (via OpenRouter)" },
  { value: "gemini", label: "Gemini (via OpenRouter)" },
  { value: "ollama", label: "Ollama (Local)" },
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
          <h2 className="text-xl font-bold text-text-primary">
            AI Provider Setup
          </h2>
          <p className="text-sm text-text-muted">
            JobTopBob uses AI for suitability scoring, cover letter generation,
            and more. Select your provider — API keys are configured via
            environment variables on the server.
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
                    {p.label}
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
                placeholder="e.g. gpt-4o, claude-sonnet-4-20250514"
              />
              <p className="text-xs text-text-muted">
                Leave empty to use the default model for the selected provider.
              </p>
            </div>
          )}
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
