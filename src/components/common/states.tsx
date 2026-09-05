import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        {icon ?? <Inbox className="size-6" />}
      </span>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button variant="neutral" size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function LockedState({
  title = "Premium feature",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-gold/30 bg-gold-soft/50 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-gold/20 text-gold-foreground">
        <Lock className="size-6" />
      </span>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card w-full min-w-0 max-w-full">
      <Skeleton className="aspect-[3/3.8] w-full rounded-none" />
      <div className="space-y-1.5 sm:space-y-2 p-2.5 sm:p-3.5 min-w-0 w-full">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <Skeleton className="h-4 w-1/2 min-w-0" />
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
        <Skeleton className="h-3 w-3/4 min-w-0" />
        <Skeleton className="h-3 w-2/3 min-w-0" />
        <div className="flex gap-1 sm:gap-1.5 pt-2 border-t border-border/50 min-w-0">
          <Skeleton className="h-7.5 sm:h-8 flex-1 min-w-0 rounded-xl" />
          <Skeleton className="h-7.5 sm:h-8 flex-[1.4] min-w-0 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
