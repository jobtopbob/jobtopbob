"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 260);
    const spaceRight = window.innerWidth - rect.left;

    // Align right edge to trigger's right edge if it would overflow the viewport
    const left = spaceRight < width ? rect.right - width : rect.left;

    setPos({ top: rect.bottom + 4, left, width });
  }, []);

  // Position the dropdown and handle outside clicks
  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }

    function handleScroll() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

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
    <div>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between font-normal"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[100] rounded-lg border border-border-subtle bg-card shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
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
          </div>,
          document.body
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
