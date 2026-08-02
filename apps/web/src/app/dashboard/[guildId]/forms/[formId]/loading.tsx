import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-center gap-3 px-8 pt-8">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="px-8 pt-4">
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-2">
        <Skeleton className="h-96 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}
