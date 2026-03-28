"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import Image from "next/image";
import {
  DollarSign,
  Banknote,
  Calendar,
  Pencil,
  Trash2,
  Check,
  X,
  TrendingUp,
  Gift,
  Briefcase,
  MapPin,
  Wifi,
  Monitor,
  Home,
  Clock,
  PiggyBank,
  Plane,
  Coins,
  CalendarClock,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useOffer, useUpdateOffer, useDeleteOffer } from "@/hooks/use-offers";
import {
  calculateTotalComp,
  remotePolicyLabel,
  intervalLabel,
} from "@/lib/offer-utils";
import { formatSalaryWithInterval, formatCurrency } from "@/lib/currency";
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { currencyLabel } from "@/lib/currencies";

interface OfferDetailSheetProps {
  offerId: string | null;
  onClose: () => void;
}

export function OfferDetailSheet({ offerId, onClose }: OfferDetailSheetProps) {
  const { data: offer } = useOffer(offerId ?? undefined);
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();
  const [editing, setEditing] = useState(false);

  function handleDelete() {
    if (!offerId) return;
    if (!window.confirm("Are you sure you want to delete this offer? This cannot be undone.")) return;
    deleteOffer.mutate(offerId, {
      onSuccess: () => {
        toast.success("Offer deleted");
        onClose();
      },
      onError: () => toast.error("Failed to delete offer"),
    });
  }

  if (!offer) return null;

  const currency = offer.currency ?? "USD";
  const totalComp = calculateTotalComp(offer);

  return (
    <Sheet open={!!offerId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0">
              {offer.company_logo_url ? (
                <div className="w-8 h-8 rounded bg-white p-0.5 shrink-0 mt-0.5">
                  <Image
                    src={offer.company_logo_url}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <Building2 className="w-8 h-8 text-text-muted shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <SheetTitle className="text-lg font-semibold text-text-primary truncate">
                  {offer.job_title ?? "Untitled Position"}
                </SheetTitle>
                {offer.company_name && (
                  <span className="text-sm text-text-muted">
                    {offer.company_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Salary highlight */}
          {offer.base_salary != null && (
            <div>
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-brand-green" />
                <span className="text-2xl font-bold text-text-primary">
                  {formatSalaryWithInterval(offer.base_salary, {
                    currency,
                    interval: offer.salary_interval,
                  })}
                </span>
              </div>
              {totalComp != null && totalComp !== offer.base_salary && (
                <span className="text-sm text-text-muted ml-7">
                  ~{formatCurrency(totalComp, { currency })} Total Comp (Year 1 est.)
                </span>
              )}
            </div>
          )}

          {/* Status */}
          {offer.accepted != null && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                offer.accepted
                  ? "bg-emerald-400/15 text-emerald-600"
                  : "bg-red-400/15 text-red-600"
              }`}
            >
              {offer.accepted ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              {offer.accepted ? "Accepted" : "Declined"}
            </span>
          )}
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex-1 px-6 pb-6 space-y-5">
          {editing ? (
            <EditForm
              offer={offer}
              onSave={(body) => {
                updateOffer.mutate(
                  { id: offer.id, body },
                  {
                    onSuccess: () => {
                      toast.success("Offer updated");
                      setEditing(false);
                    },
                    onError: () => toast.error("Failed to update offer"),
                  }
                );
              }}
              onCancel={() => setEditing(false)}
              isPending={updateOffer.isPending}
            />
          ) : (
            <DetailView offer={offer} />
          )}
        </div>

        {/* Bottom action bar */}
        <div className="border-t border-border-subtle px-6 py-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="w-3.5 h-3.5" />
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteOffer.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteOffer.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Detail View ---------- */

function DetailView({
  offer,
}: {
  offer: NonNullable<ReturnType<typeof useOffer>["data"]>;
}) {
  const currency = offer.currency ?? "USD";

  const remotePolicyIcons: Record<string, typeof Wifi> = {
    remote: Wifi,
    hybrid: Home,
    onsite: Monitor,
  };

  const compensationDetails = [
    {
      icon: DollarSign,
      label: "Base Salary",
      value:
        offer.base_salary != null
          ? formatSalaryWithInterval(offer.base_salary, { currency, interval: offer.salary_interval })
          : null,
    },
    {
      icon: Gift,
      label: "Sign-on Bonus",
      value:
        offer.sign_on_bonus != null
          ? formatCurrency(offer.sign_on_bonus, { currency })
          : null,
    },
    {
      icon: TrendingUp,
      label: "Annual Bonus",
      value: offer.annual_bonus,
    },
    {
      icon: Coins,
      label: "Equity",
      value: offer.equity,
    },
    {
      icon: DollarSign,
      label: "Equity Value",
      value:
        offer.equity_value != null
          ? formatCurrency(offer.equity_value, { currency })
          : null,
    },
    {
      icon: CalendarClock,
      label: "Vesting Schedule",
      value: offer.equity_schedule,
    },
    {
      icon: Gift,
      label: "Bonus",
      value: offer.bonus,
    },
    {
      icon: DollarSign,
      label: "Currency",
      value: currencyLabel(offer.currency),
    },
  ];

  const RemotePolicyIcon =
    offer.remote_policy && remotePolicyIcons[offer.remote_policy]
      ? remotePolicyIcons[offer.remote_policy]
      : Briefcase;

  const benefitsDetails = [
    {
      icon: Clock,
      label: "PTO Days",
      value: offer.pto_days != null ? `${offer.pto_days} days/year` : null,
    },
    {
      icon: RemotePolicyIcon,
      label: "Remote Policy",
      value: remotePolicyLabel(offer.remote_policy),
    },
    {
      icon: PiggyBank,
      label: "Retirement Match",
      value: offer.retirement_match,
    },
    {
      icon: Plane,
      label: "Relocation",
      value: offer.relocation,
    },
    {
      icon: MapPin,
      label: "Work Location",
      value: offer.work_location,
    },
  ];

  const otherDetails = [
    {
      icon: Calendar,
      label: "Deadline",
      value: offer.deadline
        ? new Date(offer.deadline).toLocaleDateString()
        : null,
    },
    {
      icon: Briefcase,
      label: "Created",
      value: new Date(offer.created_at).toLocaleDateString(),
    },
  ];

  const benefits = offer.benefits as Record<string, unknown> | null;

  return (
    <>
      {/* Compensation Section */}
      <DetailSection title="Compensation" items={compensationDetails} />

      {/* Benefits & Work Section */}
      <DetailSection title="Benefits & Work" items={benefitsDetails} />

      {/* Other Section */}
      <DetailSection title="Details" items={otherDetails} />

      {/* Dynamic Benefits (JSONB) */}
      {benefits && Object.keys(benefits).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Additional Benefits
          </h3>
          <div className="space-y-1.5">
            {Object.entries(benefits).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="text-text-muted capitalize">{key}:</span>
                <span className="text-text-primary">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negotiation Log */}
      {offer.negotiation_log && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Negotiation Log
          </h3>
          <pre className="text-xs text-text-secondary bg-surface rounded-lg p-3 whitespace-pre-wrap overflow-auto max-h-[200px]">
            {JSON.stringify(offer.negotiation_log, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

function DetailSection({
  title,
  items,
}: {
  title: string;
  items: { icon: typeof DollarSign; label: string; value: string | null | undefined }[];
}) {
  const visibleItems = items.filter((i) => i.value);
  if (visibleItems.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2.5">
        {visibleItems.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <Icon className="w-4 h-4 text-text-muted shrink-0" />
            <span className="text-text-muted w-28 shrink-0">{label}</span>
            <span className="text-text-primary truncate">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Edit Form ---------- */

interface EditFormProps {
  offer: NonNullable<ReturnType<typeof useOffer>["data"]>;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}

function EditForm({ offer, onSave, onCancel, isPending }: EditFormProps) {
  const [form, setForm] = useState({
    base_salary: offer.base_salary?.toString() ?? "",
    currency: offer.currency ?? "USD",
    salary_interval: offer.salary_interval ?? "annual",
    sign_on_bonus: offer.sign_on_bonus?.toString() ?? "",
    annual_bonus: offer.annual_bonus ?? "",
    equity: offer.equity ?? "",
    equity_value: offer.equity_value?.toString() ?? "",
    equity_schedule: offer.equity_schedule ?? "",
    bonus: offer.bonus ?? "",
    pto_days: offer.pto_days?.toString() ?? "",
    remote_policy: offer.remote_policy ?? "",
    retirement_match: offer.retirement_match ?? "",
    relocation: offer.relocation ?? "",
    work_location: offer.work_location ?? "",
    deadline: offer.deadline
      ? new Date(offer.deadline).toISOString().split("T")[0]
      : "",
    accepted: offer.accepted,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.base_salary && parseInt(form.base_salary) < 0) {
      toast.error("Base salary must be non-negative");
      return;
    }
    if (form.sign_on_bonus && parseInt(form.sign_on_bonus) < 0) {
      toast.error("Sign-on bonus must be non-negative");
      return;
    }
    if (form.equity_value && parseInt(form.equity_value) < 0) {
      toast.error("Equity value must be non-negative");
      return;
    }
    if (form.pto_days && parseInt(form.pto_days) < 0) {
      toast.error("PTO days must be non-negative");
      return;
    }
    onSave({
      base_salary: form.base_salary ? parseInt(form.base_salary) : undefined,
      currency: form.currency || undefined,
      salary_interval: form.salary_interval || undefined,
      sign_on_bonus: form.sign_on_bonus
        ? parseInt(form.sign_on_bonus)
        : undefined,
      annual_bonus: form.annual_bonus || undefined,
      equity: form.equity || undefined,
      equity_value: form.equity_value
        ? parseInt(form.equity_value)
        : undefined,
      equity_schedule: form.equity_schedule || undefined,
      bonus: form.bonus || undefined,
      pto_days: form.pto_days ? parseInt(form.pto_days) : undefined,
      remote_policy: form.remote_policy || undefined,
      retirement_match: form.retirement_match || undefined,
      relocation: form.relocation || undefined,
      work_location: form.work_location || undefined,
      deadline: form.deadline
        ? new Date(form.deadline).toISOString()
        : undefined,
      accepted: form.accepted,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Compensation */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Compensation
        </legend>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Base Salary
            </label>
            <Input
              type="number"
              min={0}
              value={form.base_salary}
              onChange={(e) =>
                setForm({ ...form, base_salary: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Interval
            </label>
            <Select
              value={form.salary_interval}
              onValueChange={(v) =>
                setForm({ ...form, salary_interval: v ?? "annual" })
              }
            >
              <SelectTrigger>
                {intervalLabel(form.salary_interval)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Currency
            </label>
            <CurrencyCombobox
              value={form.currency}
              onChange={(v) => setForm({ ...form, currency: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Sign-on Bonus
            </label>
            <Input
              type="number"
              min={0}
              value={form.sign_on_bonus}
              onChange={(e) =>
                setForm({ ...form, sign_on_bonus: e.target.value })
              }
              placeholder="e.g. 25000"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Annual Bonus
            </label>
            <Input
              value={form.annual_bonus}
              onChange={(e) =>
                setForm({ ...form, annual_bonus: e.target.value })
              }
              placeholder='e.g. 15% or $20,000'
            />
          </div>
        </div>
      </fieldset>

      {/* Equity */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Equity
        </legend>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Equity
            </label>
            <Input
              value={form.equity}
              onChange={(e) => setForm({ ...form, equity: e.target.value })}
              placeholder="e.g. 0.5% over 4y"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Equity Value ($)
            </label>
            <Input
              type="number"
              min={0}
              value={form.equity_value}
              onChange={(e) =>
                setForm({ ...form, equity_value: e.target.value })
              }
              placeholder="e.g. 200000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">
            Vesting Schedule
          </label>
          <Input
            value={form.equity_schedule}
            onChange={(e) =>
              setForm({ ...form, equity_schedule: e.target.value })
            }
            placeholder="e.g. 4 years, 1 year cliff"
          />
        </div>
      </fieldset>

      <Separator />

      {/* Benefits & Work */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Benefits & Work
        </legend>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              PTO Days/Year
            </label>
            <Input
              type="number"
              min={0}
              value={form.pto_days}
              onChange={(e) => setForm({ ...form, pto_days: e.target.value })}
              placeholder="e.g. 25"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Remote Policy
            </label>
            <Select
              value={form.remote_policy || "none"}
              onValueChange={(v) =>
                setForm({ ...form, remote_policy: v === "none" ? "" : v ?? "" })
              }
            >
              <SelectTrigger>
                {remotePolicyLabel(form.remote_policy) ?? "Select..."}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Retirement Match
            </label>
            <Input
              value={form.retirement_match}
              onChange={(e) =>
                setForm({ ...form, retirement_match: e.target.value })
              }
              placeholder='e.g. 100% up to 6%'
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Relocation
            </label>
            <Input
              value={form.relocation}
              onChange={(e) =>
                setForm({ ...form, relocation: e.target.value })
              }
              placeholder="e.g. $10k stipend"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">
            Work Location
          </label>
          <Input
            value={form.work_location}
            onChange={(e) =>
              setForm({ ...form, work_location: e.target.value })
            }
            placeholder="e.g. San Francisco, CA"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">
            Legacy Bonus
          </label>
          <Input
            value={form.bonus}
            onChange={(e) => setForm({ ...form, bonus: e.target.value })}
            placeholder="e.g. $20k signing"
          />
        </div>
      </fieldset>

      <Separator />

      {/* Status & Deadline */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Deadline</label>
        <Input
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-muted">Status</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={form.accepted === true ? "default" : "outline"}
            size="sm"
            onClick={() => setForm({ ...form, accepted: true })}
          >
            <Check className="w-3 h-3" />
            Accepted
          </Button>
          <Button
            type="button"
            variant={form.accepted === false ? "destructive" : "outline"}
            size="sm"
            onClick={() => setForm({ ...form, accepted: false })}
          >
            <X className="w-3 h-3" />
            Declined
          </Button>
          <Button
            type="button"
            variant={form.accepted == null ? "secondary" : "outline"}
            size="sm"
            onClick={() => setForm({ ...form, accepted: null })}
          >
            Pending
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
