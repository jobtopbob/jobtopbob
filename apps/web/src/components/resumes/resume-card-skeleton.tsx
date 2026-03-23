import { Skeleton } from "@/components/ui/skeleton";

export function ResumeCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-card overflow-hidden">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-4 pt-3.5 space-y-2.5">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}
