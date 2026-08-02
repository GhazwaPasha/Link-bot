import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="p-8">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
