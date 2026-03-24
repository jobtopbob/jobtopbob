"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConnectRxResumeKey, useSyncResumes } from "@/hooks/use-resumes";
import { ExternalLink, Key } from "lucide-react";
import { toast } from "sonner";

interface ConnectBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderURL: string;
}

export function ConnectBuilderDialog({
  open,
  onOpenChange,
  builderURL,
}: ConnectBuilderDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const connectKey = useConnectRxResumeKey();
  const syncResumes = useSyncResumes();

  const handleConnect = () => {
    if (!apiKey.trim()) return;
    connectKey.mutate(apiKey.trim(), {
      onSuccess: () => {
        toast.success("Resume Builder connected — syncing resumes…");
        setApiKey("");
        onOpenChange(false);
        syncResumes.mutate(undefined, {
          onSuccess: (data) => {
            if (data.sync_status === "synced") {
              toast.success(
                data.resumes.length > 0
                  ? `Synced ${data.resumes.length} resume${data.resumes.length === 1 ? "" : "s"}`
                  : "Sync complete — no resumes found in Resume Builder",
              );
            }
          },
          onError: () => toast.error("Initial sync failed — you can sync manually later"),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Resume Builder</DialogTitle>
          <DialogDescription>
            Link your Resume Builder account to sync resumes, export PDFs, and
            create new resumes directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface text-text-muted text-xs font-medium shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="text-text-primary font-medium">
                  Open the Resume Builder
                </p>
                <p className="text-text-muted mt-0.5">
                  Sign in with your account (SSO will log you in automatically).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => window.open(`${builderURL}/dashboard/settings/api-keys`, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Builder
                </Button>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface text-text-muted text-xs font-medium shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="text-text-primary font-medium">
                  Generate an API key
                </p>
                <p className="text-text-muted mt-0.5">
                  Go to <strong>Settings &rarr; API Keys</strong> and generate a
                  new key.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface text-text-muted text-xs font-medium shrink-0 mt-0.5">
                3
              </span>
              <div>
                <p className="text-text-primary font-medium">
                  Paste it below
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Paste your API key here"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    type="password"
                  />
                </div>
              </div>
            </li>
          </ol>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!apiKey.trim() || connectKey.isPending}
            className="gap-1.5"
          >
            {connectKey.isPending ? (
              "Connecting..."
            ) : (
              <>
                <Key className="w-4 h-4" />
                Connect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
