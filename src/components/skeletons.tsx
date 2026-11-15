import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for table screens: an optional filter bar, then rows. */
export function TableSkeleton({ rows = 6, withFilters = false }: { rows?: number; withFilters?: boolean }) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      {withFilters && <Skeleton className="h-24 w-full rounded-lg" />}
      <div className="grid gap-2 rounded-lg border p-3">
        <Skeleton className="h-6 w-full" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Loading placeholder for the Tax Advice / IRD Payments grids. */
export function GridSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="grid grid-cols-[14rem_repeat(5,1fr)] gap-2 rounded-lg border p-3">
        {Array.from({ length: 36 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

/** Loading placeholder for add / edit forms. */
export function FormSkeleton() {
  return (
    <div className="grid max-w-2xl gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

/** Loading placeholder for the dashboard cards. */
export function CardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-xl" />
      ))}
      <Skeleton className="h-32 rounded-xl md:col-span-2 xl:col-span-3" />
    </div>
  );
}
