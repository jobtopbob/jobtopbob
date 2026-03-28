"use client";

import { XIcon, ColumnsIcon } from "@phosphor-icons/react";

interface OfferSelectionBarProps {
  selectedCount: number;
  onCompare: () => void;
  onClear: () => void;
}

export function OfferSelectionBar({
  selectedCount,
  onCompare,
  onClear,
}: OfferSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-brand/5 border border-brand/20">
      <span className="text-sm font-medium text-text-primary">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-border-subtle" />

      <button
        onClick={onCompare}
        disabled={selectedCount < 2}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border-subtle hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ColumnsIcon className="w-3.5 h-3.5" />
        Compare ({selectedCount})
      </button>

      <div className="flex-1" />

      <button
        onClick={onClear}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <XIcon className="w-3.5 h-3.5" />
        Clear
      </button>
    </div>
  );
}
