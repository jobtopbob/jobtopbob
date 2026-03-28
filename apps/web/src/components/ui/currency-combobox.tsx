"use client";

import { useState, useRef, useEffect } from "react";
import { Command } from "cmdk";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, findCurrency, type CurrencyInfo } from "@/lib/currencies";

interface CurrencyComboboxProps {
  value: string;
  onChange: (code: string) => void;
}

/** Searchable currency selector with flag emojis. */
export function CurrencyCombobox({ value, onChange }: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = findCurrency(value);
  const displayLabel = selected
    ? `${selected.flag} ${selected.code}`
    : value || "USD";

  const filtered = search
    ? CURRENCIES.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
        );
      })
    : CURRENCIES;

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between font-normal"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[260px] rounded-lg border border-border-subtle bg-card shadow-lg">
          <Command shouldFilter={false}>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search currency..."
              className="h-10 w-full border-b border-border-subtle bg-transparent px-3 text-sm outline-none placeholder:text-text-muted"
              autoFocus
            />
            <Command.List className="max-h-[240px] overflow-y-auto p-1">
              <Command.Empty className="py-4 text-center text-xs text-text-muted">
                No matching currencies.
              </Command.Empty>
              {filtered.map((c) => (
                <CurrencyItem
                  key={c.code}
                  currency={c}
                  isSelected={c.code === value}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                    setSearch("");
                  }}
                />
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}

function CurrencyItem({
  currency,
  isSelected,
  onSelect,
}: {
  currency: CurrencyInfo;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={currency.code}
      onSelect={onSelect}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer data-[selected=true]:bg-surface-hover"
    >
      <span className="text-base leading-none">{currency.flag}</span>
      <span className={`font-medium ${isSelected ? "text-text-primary" : ""}`}>
        {currency.code}
      </span>
      <span className="text-xs text-text-muted truncate">{currency.name}</span>
    </Command.Item>
  );
}
