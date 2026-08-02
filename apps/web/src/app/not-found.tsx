import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <FileQuestion className="h-10 w-10 text-muted" />
      <h1 className="text-xl font-bold tracking-tight">Not found</h1>
      <p className="max-w-sm text-sm text-muted">This form, panel, or page doesn&apos;t exist — or you don&apos;t have access to it.</p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
