"use client";

import { useState, useRef, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface BaseProps {
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  placeholder?: string;
  onSave: (value: string) => void;
}

interface TextFieldProps extends BaseProps {
  type: "text" | "number" | "date";
  value: string | number | null | undefined;
  options?: never;
}

interface SelectFieldProps extends BaseProps {
  type: "select";
  value: string | null | undefined;
  options: readonly { readonly value: string; readonly label: string }[];
}

type InlineEditFieldProps = TextFieldProps | SelectFieldProps;

export function InlineEditField({
  label,
  value,
  type,
  options,
  onSave,
  icon: Icon,
  disabled,
  placeholder,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text") inputRef.current.select();
    }
  }, [editing, type]);

  const displayValue =
    value != null && value !== "" ? String(value) : null;

  const displayLabel =
    type === "select" && options && displayValue
      ? options.find((o) => o.value === displayValue)?.label ?? displayValue
      : displayValue;

  const startEdit = () => {
    if (disabled) return;
    setDraft(displayValue ?? "");
    setEditing(true);
  };

  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (displayValue ?? "")) {
      onSave(trimmed);
    }
  };

  const cancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      cancel();
    }
  };

  return (
    <div className="group flex items-center sm:flex-row flex-col sm:items-center items-start gap-2 min-h-[36px] py-1">
      {/* Label */}
      <div className="flex items-center gap-2 sm:w-32 w-full shrink-0">
        {Icon && <Icon className="w-4 h-4 text-text-muted shrink-0" />}
        <span className="text-[13px] text-text-muted">{label}</span>
      </div>

      {/* Value / Edit */}
      <div className="flex-1 w-full min-w-0">
        {editing ? (
          type === "select" && options ? (
            <Select
              value={draft}
              onValueChange={(v) => {
                setDraft(v ?? "");
                setEditing(false);
                if (v && v !== (displayValue ?? "")) onSave(v);
              }}
              open={true}
              onOpenChange={(open) => {
                if (!open) cancel();
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={placeholder ?? "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              ref={inputRef}
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              placeholder={placeholder}
            />
          )
        ) : (
          <button
            type="button"
            onClick={startEdit}
            disabled={disabled}
            className={`flex items-center gap-1.5 w-full text-left rounded-md px-2 py-1 text-sm transition-colors ${
              disabled
                ? "text-text-muted cursor-default"
                : "text-text-primary hover:bg-surface-hover cursor-pointer"
            }`}
          >
            <span className="truncate">
              {displayLabel ?? (
                <span className="text-text-muted">
                  {placeholder ?? "Not set"}
                </span>
              )}
            </span>
            {!disabled && (
              <Pencil className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
