"use client";

import { useState } from "react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SpinnerIcon } from "@phosphor-icons/react";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
];

const WRITING_STYLES = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal" },
];

export function AIPreferencesSection() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);

  // Sync local form state when settings load for the first time
  if (settings && !initialized) {
    setProvider(settings.ai_provider ?? "");
    setModel(settings.ai_model ?? "");
    setWritingStyle(settings.writing_style ?? "");
    setWeeklyGoal(settings.weekly_goal ?? 0);
    setInitialized(true);
  }

  const handleSave = () => {
    updateSettings.mutate(
      {
        ai_provider: provider || null,
        ai_model: model || null,
        writing_style: writingStyle || null,
        weekly_goal: weeklyGoal,
      },
      {
        onSuccess: () => toast.success("Preferences saved"),
        onError: (err) => toast.error(err.message ?? "Failed to save preferences"),
      },
    );
  };

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full bg-blue-500" />
          <h2 className="text-lg font-semibold text-text-primary">Artificial Intelligence</h2>
        </div>
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <SpinnerIcon className="w-5 h-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full bg-blue-500" />
        <h2 className="text-lg font-semibold text-text-primary">Artificial Intelligence</h2>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-2">
          {/* AI Provider */}
          <div className="space-y-2">
            <Label>AI Provider</Label>
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
            <p className="text-xs text-muted-foreground">
              API keys are configured via environment variables on the server.
            </p>
          </div>

          {/* AI Model */}
          <div className="space-y-2">
            <Label htmlFor="ai-model">Model Override</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o, claude-sonnet-4-20250514"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default model for the selected provider.
            </p>
          </div>

          <Separator />

          {/* Writing Style */}
          <div className="space-y-2">
            <Label>Writing Style</Label>
            <Select value={writingStyle} onValueChange={(v) => setWritingStyle(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {WRITING_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sets the tone for AI-generated cover letters, messages, and suggestions.
            </p>
          </div>

          {/* Weekly Goal */}
          <div className="space-y-2">
            <Label htmlFor="weekly-goal">Weekly Application Goal</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeeklyGoal(Math.max(0, weeklyGoal - 1))}
                disabled={weeklyGoal <= 0}
                className="w-8 h-8 p-0"
              >
                -
              </Button>
              <Input
                id="weekly-goal"
                type="number"
                min={0}
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeeklyGoal(weeklyGoal + 1)}
                className="w-8 h-8 p-0"
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground">applications per week</span>
            </div>
          </div>

          <Separator />

          {/* Task Models — deferred */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Task-Specific Model Routing</Label>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure different AI models for specific tasks like scoring, cover letters, and interview prep.
            </p>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending && (
                <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
