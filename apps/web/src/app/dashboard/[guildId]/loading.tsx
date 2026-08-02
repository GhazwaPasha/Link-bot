import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="p-8">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
