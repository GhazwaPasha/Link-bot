import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/SignInButton";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Discord Forms</h1>
      <p className="max-w-md text-muted">
        Native button-and-modal forms for your server, with review flows and Sheets/webhook output — self-hosted.
      </p>
      <SignInButton />
    </main>
  );
}
