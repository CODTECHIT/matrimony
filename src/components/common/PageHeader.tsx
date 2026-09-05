import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between w-full min-w-0 max-w-full">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C59B27]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 min-w-0">{actions}</div> : null}
    </header>
  );
}
