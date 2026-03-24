"use client";

import { useState } from "react";
import { SettingsNav, type SettingsSection } from "./settings-nav";
import { ProfileSection } from "./profile-section";
import { AIPreferencesSection } from "./ai-preferences-section";
import { IntegrationsSection } from "./integrations-section";
import { AccountSection } from "./account-section";

export function SettingsLayout() {
  const [active, setActive] = useState<SettingsSection>("profile");

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <SettingsNav active={active} onSelect={setActive} />
      <div className="flex-1 min-w-0 max-w-2xl">
        {active === "profile" && <ProfileSection />}
        {active === "ai" && <AIPreferencesSection />}
        {active === "integrations" && <IntegrationsSection />}
        {active === "account" && <AccountSection />}
      </div>
    </div>
  );
}
