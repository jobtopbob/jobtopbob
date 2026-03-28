"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe, Briefcase, Linkedin, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface JobSource {
  id: string;
  name: string;
  status: "active" | "coming_soon";
  fallbackIcon: LucideIcon;
}

const SOURCES: JobSource[] = [
  { id: "adzuna", name: "Adzuna", status: "active", fallbackIcon: Globe },
  { id: "indeed", name: "Indeed", status: "coming_soon", fallbackIcon: Briefcase },
  { id: "linkedin", name: "LinkedIn", status: "coming_soon", fallbackIcon: Linkedin },
  { id: "glassdoor", name: "Glassdoor", status: "coming_soon", fallbackIcon: Building2 },
];

function SourceIcon({ source }: { source: JobSource }) {
  const [imgError, setImgError] = useState(false);
  const Icon = source.fallbackIcon;

  if (imgError) {
    return <Icon className="h-3.5 w-3.5 text-text-muted" />;
  }

  return (
    <Image
      src={`/sources/${source.id}.svg`}
      alt={source.name}
      width={14}
      height={14}
      className="h-3.5 w-3.5 object-contain"
      onError={() => setImgError(true)}
    />
  );
}

export function JobSourcesStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-text-muted">
      <span>Searching across</span>
      {SOURCES.map((source) => (
        <span
          key={source.id}
          className={`inline-flex items-center gap-1.5 ${
            source.status === "coming_soon" ? "opacity-50" : ""
          }`}
        >
          <SourceIcon source={source} />
          <span className={source.status === "active" ? "font-medium text-text-secondary" : ""}>
            {source.name}
          </span>
          {source.status === "active" && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
