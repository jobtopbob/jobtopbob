"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Building2, Plus, X, Check, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchCompanies, useCreateCompany } from "@/hooks/use-companies";
import type { Company } from "@/hooks/use-companies";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const logoColors = [
  "#635BFF",
  "#2A85FF",
  "#FF8400",
  "#83BF6E",
  "#8E59FF",
  "#E53E3E",
  "#0EA5E9",
  "#F59E0B",
];

function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return logoColors[Math.abs(hash) % logoColors.length];
}

interface CompanySelectorProps {
  value: string | null | undefined;
  displayName?: string | null;
  logoUrl?: string | null;
  onChange: (companyId: string | null, companyName: string | null, logoUrl?: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** "default" for forms, "inline" for detail sheets matching InlineEditField style */
  variant?: "default" | "inline";
}

export function CompanySelector({
  value,
  displayName,
  logoUrl,
  onChange,
  placeholder = "Search or add company...",
  className,
  disabled,
  variant = "default",
}: CompanySelectorProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results } = useSearchCompanies(query);
  const createCompany = useCreateCompany();

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
        setQuery("");
      }
    }
    if (editing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [editing]);

  function handleSelect(company: Company) {
    onChange(company.id, company.name, company.logo_url);
    setQuery("");
    setEditing(false);
  }

  function handleClear() {
    onChange(null, null);
    setQuery("");
    setEditing(false);
  }

  function handleCreateNew() {
    const name = query.trim();
    if (!name) return;

    createCompany.mutate(
      { name },
      {
        onSuccess: (company) => {
          onChange(company.id, company.name);
          setQuery("");
          setEditing(false);
          toast.success(`Company "${company.name}" created`);
        },
        onError: () => toast.error("Failed to create company"),
      }
    );
  }

  const isInline = variant === "inline";

  // --- Selected state ---
  if (value && displayName && !editing) {
    const initial = displayName.charAt(0).toUpperCase();
    const color = getLogoColor(displayName);

    if (isInline) {
      // Inline variant: plain text matching InlineEditField display style
      return (
        <div className={cn("group flex items-center gap-1.5 flex-1 min-w-0", className)}>
          <button
            type="button"
            onClick={() => !disabled && setEditing(true)}
            disabled={disabled}
            className="flex items-center gap-1.5 w-full text-left rounded-md px-2 py-1 text-sm text-text-primary hover:bg-surface-hover transition-colors cursor-pointer truncate"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={displayName}
                width={18}
                height={18}
                unoptimized
                className="w-[18px] h-[18px] rounded object-contain shrink-0"
              />
            ) : (
              <div
                className="flex items-center justify-center w-[18px] h-[18px] rounded shrink-0"
                style={{ backgroundColor: color }}
              >
                <span className="text-[9px] font-bold text-white">{initial}</span>
              </div>
            )}
            <span className="truncate">{displayName}</span>
            {!disabled && (
              <X
                className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
          </button>
        </div>
      );
    }

    // Default variant: bordered chip
    return (
      <div
        className={cn(
          "flex items-center gap-2 h-10 px-3 rounded-lg border border-border-subtle bg-background",
          disabled && "opacity-60 pointer-events-none",
          className
        )}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={displayName}
            width={20}
            height={20}
            unoptimized
            className="w-5 h-5 rounded object-contain shrink-0"
          />
        ) : (
          <div
            className="flex items-center justify-center w-5 h-5 rounded shrink-0"
            style={{ backgroundColor: color }}
          >
            <span className="text-[10px] font-bold text-white">{initial}</span>
          </div>
        )}
        <span className="text-sm text-text-primary truncate flex-1">
          {displayName}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-surface-hover transition-colors"
          >
            <X className="w-3.5 h-3.5 text-text-muted" />
          </button>
        )}
      </div>
    );
  }

  // --- Empty / editing state ---
  const hasQuery = query.trim().length >= 2;
  const searchResults = results ?? [];
  const exactMatch = searchResults.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase()
  );

  // Inline variant: show placeholder text when not editing
  if (isInline && !editing) {
    return (
      <div className={cn("flex-1 min-w-0", className)}>
        <button
          type="button"
          onClick={() => !disabled && setEditing(true)}
          disabled={disabled}
          className="flex items-center gap-1.5 w-full text-left rounded-md px-2 py-1 text-sm text-text-muted hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <span>{placeholder ?? "Add company"}</span>
          {!disabled && (
            <Pencil className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", isInline ? "flex-1 min-w-0" : "", className)}>
      <div className="relative">
        {!isInline && (
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        )}
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!editing) setEditing(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setQuery("");
            }
          }}
          placeholder={placeholder}
          className={isInline ? "h-8 text-sm" : "pl-9"}
          disabled={disabled}
        />
      </div>

      {editing && hasQuery && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border-subtle bg-card shadow-lg overflow-hidden">
          {searchResults.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto">
              {searchResults.map((company) => {
                const initial = company.name.charAt(0).toUpperCase();
                const color = getLogoColor(company.name);

                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelect(company)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors"
                  >
                    {company.logo_url ? (
                      <Image
                        src={company.logo_url}
                        alt={company.name}
                        width={24}
                        height={24}
                        unoptimized
                        className="w-6 h-6 rounded object-contain shrink-0"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        <span className="text-[11px] font-bold text-white">
                          {initial}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary truncate block">
                        {company.name}
                      </span>
                      {company.domain && (
                        <span className="text-[11px] text-text-muted">
                          {company.domain}
                        </span>
                      )}
                    </div>
                    {company.id === value && (
                      <Check className="w-4 h-4 text-brand shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!exactMatch && query.trim().length > 0 && (
            <>
              {searchResults.length > 0 && (
                <div className="border-t border-border-subtle" />
              )}
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={createCompany.isPending}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-surface-hover transition-colors text-brand"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">
                  {createCompany.isPending
                    ? "Creating..."
                    : `Create "${query.trim()}"`}
                </span>
              </button>
            </>
          )}

          {searchResults.length === 0 && exactMatch && (
            <div className="px-3 py-2.5 text-sm text-text-muted">
              No results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
