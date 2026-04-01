"use client";

import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, MapPinIcon, SpinnerIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResumeSearchDialog } from "@/components/discover/resume-search-dialog";
import { useQuickSearch } from "@/hooks/use-discover";
import { detectCountry, detectLanguage, SUPPORTED_COUNTRIES } from "@/lib/locale";
import { toast } from "sonner";

/** Emoji flags from country code (works via regional indicator symbols). */
function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
        title={SUPPORTED_COUNTRIES[value] ?? value}
      >
        <span className="text-sm leading-none">{countryFlag(value)}</span>
        <span>{value}</span>
        <CaretDownIcon className="h-3 w-3 text-text-muted" />
      </button>
      {open && (
        <div className="fixed z-[100] mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-border-subtle bg-card p-1 shadow-xl" style={{
          top: ref.current ? ref.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
          left: ref.current ? ref.current.getBoundingClientRect().left : 0,
        }}>
          {Object.entries(SUPPORTED_COUNTRIES).map(([code, name]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                onChange(code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover ${
                code === value
                  ? "bg-surface-hover font-medium text-text-primary"
                  : "text-text-secondary"
              }`}
            >
              <span className="text-base leading-none">{countryFlag(code)}</span>
              <span className="truncate">{name}</span>
              <span className="ml-auto text-xs text-text-muted">{code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeroSearch() {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("US");
  const [language, setLanguage] = useState("en");
  const quickSearch = useQuickSearch();

  useEffect(() => {
    setLanguage(detectLanguage());
    detectCountry().then(setCountry);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywordList.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }

    quickSearch.mutate(
      {
        keywords: keywordList,
        location: location || undefined,
        country,
        language,
      },
      {
        onSuccess: () => {
          toast.success("Search started! Results will appear below.");
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <div className="relative shrink-0 overflow-hidden px-7 pb-8 pt-10">
      {/* Gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.65 0.12 250 / 0.07) 0%, transparent 70%)",
        }}
      />
      {/* Dot grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.5 0 0 / 0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-4 px-3 py-1 text-xs font-medium"
        >
          Multi-source job discovery
        </Badge>

        <h1 className="font-heading text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Discover Your Next Opportunity
        </h1>
        <p className="mt-2 text-sm text-text-muted sm:text-base">
          Search across multiple job boards to find roles that match your skills
          and experience.
        </p>

        {/* Unified search bar */}
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="rounded-2xl bg-card shadow-lg shadow-black/5 ring-1 ring-border-subtle">
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-1 sm:p-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface-hover px-3 sm:rounded-none sm:bg-transparent">
                <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  type="text"
                  placeholder="Job title, skills, or keywords..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="h-10 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
              <div className="hidden h-6 w-px shrink-0 bg-border-subtle sm:block" />
              <div className="flex items-center gap-1 rounded-lg bg-surface-hover px-1.5 sm:rounded-none sm:bg-transparent">
                <CountrySelect value={country} onChange={setCountry} />
                <div className="h-5 w-px shrink-0 bg-border-subtle" />
                <div className="flex flex-1 items-center gap-1.5 px-1.5">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    type="text"
                    placeholder="City or region"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-10 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted sm:w-36"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={quickSearch.isPending}
                className="w-full shrink-0 rounded-xl bg-brand text-white hover:bg-brand/90 sm:w-auto sm:px-5"
              >
                {quickSearch.isPending ? (
                  <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </div>
        </form>

        {/* Quick actions + sources */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <ResumeSearchDialog />
        </div>
      </div>
    </div>
  );
}
