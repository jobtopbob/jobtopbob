"use client";

import { SettingsLayout } from "@/components/settings/settings-layout";

export default function SettingsPage() {
  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col gap-6 p-7 pt-7 overflow-y-auto">
        {/* Page Header */}
        <div>
          <h1
            className="text-4xl font-bold text-text-primary tracking-tight"
            style={{ letterSpacing: -1 }}
          >
            Settings
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Manage your profile, preferences, and integrations.
          </p>
        </div>

        {/* Settings Content */}
        <SettingsLayout />
      </div>
    </div>
  );
}
