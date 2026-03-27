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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Calendar,
  Pencil,
  Check,
  X,
  TrendingUp,
  Gift,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { useOffer, useUpdateOffer } from "@/hooks/use-offers";

interface OfferDetailSheetProps {
  offerId: string | null;
  onClose: () => void;
}

export function OfferDetailSheet({ offerId, onClose }: OfferDetailSheetProps) {
  const { data: offer } = useOffer(offerId ?? undefined);
  const updateOffer = useUpdateOffer();
  const [editing, setEditing] = useState(false);

  if (!offer) return null;

  const currency = offer.currency ?? "USD";

  return (
    <Sheet open={!!offerId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0 space-y-3">
          <div className="flex items-start justify-between">
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
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(!editing)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Salary highlight */}
          {offer.base_salary != null && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-green" />
              <span className="text-2xl font-bold text-text-primary">
                {currency === "USD" ? "$" : currency + " "}
                {offer.base_salary.toLocaleString()}
              </span>
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
      </SheetContent>
    </Sheet>
  );
}

function DetailView({
  offer,
}: {
  offer: NonNullable<ReturnType<typeof useOffer>["data"]>;
}) {
  const details = [
    { icon: DollarSign, label: "Currency", value: offer.currency },
    { icon: TrendingUp, label: "Equity", value: offer.equity },
    { icon: Gift, label: "Bonus", value: offer.bonus },
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
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Details
        </h3>
        <div className="space-y-2.5">
          {details.map(
            ({ icon: Icon, label, value }) =>
              value && (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-muted w-24 shrink-0">{label}</span>
                  <span className="text-text-primary truncate">
                    {String(value)}
                  </span>
                </div>
              )
          )}
        </div>
      </div>

      {/* Benefits */}
      {benefits && Object.keys(benefits).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Benefits
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
    equity: offer.equity ?? "",
    bonus: offer.bonus ?? "",
    deadline: offer.deadline
      ? new Date(offer.deadline).toISOString().split("T")[0]
      : "",
    accepted: offer.accepted,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      base_salary: form.base_salary ? parseInt(form.base_salary) : undefined,
      currency: form.currency || undefined,
      equity: form.equity || undefined,
      bonus: form.bonus || undefined,
      deadline: form.deadline
        ? new Date(form.deadline).toISOString()
        : undefined,
      accepted: form.accepted,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">
            Base Salary
          </label>
          <Input
            type="number"
            value={form.base_salary}
            onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">
            Currency
          </label>
          <Input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Equity</label>
          <Input
            value={form.equity}
            onChange={(e) => setForm({ ...form, equity: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Bonus</label>
          <Input
            value={form.bonus}
            onChange={(e) => setForm({ ...form, bonus: e.target.value })}
          />
        </div>
      </div>

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
