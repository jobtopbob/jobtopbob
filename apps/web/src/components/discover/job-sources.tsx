"use client";

import { AvatarCircles } from "@/components/ui/avatar-circles";

const JOB_BOARD_AVATARS = [
  { imageUrl: "/sources/linkedin.svg", profileUrl: "https://linkedin.com/jobs" },
  { imageUrl: "/sources/dice.svg", profileUrl: "https://dice.com" },
  { imageUrl: "/sources/wellfound.svg", profileUrl: "https://wellfound.com" },
  { imageUrl: "/sources/roberthalf.svg", profileUrl: "https://roberthalf.com" },
];

export function JobSourcesStrip() {
  return (
    <div className="flex flex-col items-center gap-3">
      <AvatarCircles avatarUrls={JOB_BOARD_AVATARS} numPeople={15} />
      <p className="text-xs text-text-muted">
        Aggregating from{" "}
        <span className="font-medium text-text-secondary">15+ job boards</span>
      </p>
    </div>
  );
}
