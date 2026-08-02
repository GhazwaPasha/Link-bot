import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="p-8">
      <Skeleton className="mb-6 h-8 w-24" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
