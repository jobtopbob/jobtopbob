"use client";

import { useState } from "react";
import {
  useRxResumeKeyStatus,
  useResumeConfig,
  useConnectRxResumeKey,
  useDisconnectRxResumeKey,
} from "@/hooks/use-resumes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Circle, FileText, Mail } from "lucide-react";

export function IntegrationsSection() {
  const { data: rxKeyStatus, isLoading: rxLoading } = useRxResumeKeyStatus();
  const { data: resumeConfig } = useResumeConfig();
  const connectKey = useConnectRxResumeKey();
  const disconnectKey = useDisconnectRxResumeKey();

  const apiKeysUrl = resumeConfig?.builder_url
    ? `${resumeConfig.builder_url}/dashboard/settings/api-keys`
    : null;

  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleConnect = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }
    connectKey.mutate(apiKey.trim(), {
      onSuccess: () => {
        toast.success("Resume Builder connected");
        setApiKey("");
        setShowKeyInput(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDisconnect = () => {
    disconnectKey.mutate(undefined, {
      onSuccess: () => toast.success("Resume Builder disconnected"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full bg-emerald-500" />
        <h2 className="text-lg font-semibold text-text-primary">Integrations</h2>
      </div>

      <div className="space-y-4">
        {/* Resume Builder */}
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-text-primary">Resume Builder</h3>
                  {rxLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  ) : rxKeyStatus?.connected ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Circle className="w-3 h-3" />
                      Not connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Reactive Resume API key to enable resume syncing, creation, and PDF export.
                </p>

                {rxKeyStatus?.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnectKey.isPending}
                  >
                    {disconnectKey.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Disconnect
                  </Button>
                ) : showKeyInput ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="rx-api-key">API Key</Label>
                      <Input
                        id="rx-api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Resume Builder API key"
                        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                      />
                      <p className="text-xs text-muted-foreground">
                        {apiKeysUrl ? (
                          <>
                            Find your API key in{" "}
                            <a
                              href={apiKeysUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 hover:text-foreground transition-colors"
                            >
                              Resume Builder &rarr; Settings &rarr; API Keys
                            </a>
                            .
                          </>
                        ) : (
                          "Find your API key in Resume Builder \u2192 Settings \u2192 API Keys."
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleConnect}
                        disabled={connectKey.isPending}
                      >
                        {connectKey.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Connect
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowKeyInput(false);
                          setApiKey("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowKeyInput(true)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gmail / Smart Router — Coming Soon */}
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-text-primary">Gmail Smart Router</h3>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect your Gmail to automatically detect interview invitations, rejections, and offer emails.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
