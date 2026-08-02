import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/SignInButton";
import { DiscordModalPreview } from "@/components/preview/DiscordModalPreview";
import { ClipboardList, GitBranch, Webhook } from "lucide-react";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Native forms",
    description: "Button → modal, no external site. Submissions land straight back in Discord.",
  },
  {
    icon: GitBranch,
    title: "Review flow",
    description: "Route submissions to a review channel with Approve/Reject, gated by role.",
  },
  {
    icon: Webhook,
    title: "Sheets & webhooks",
    description: "Send approved submissions to Google Sheets or any webhook URL, automatically.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
          Self-hosted &middot; open source
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Discord Forms</h1>
        <p className="max-w-lg text-balance text-muted">
          Native button-and-modal forms for your server, with review flows and Sheets/webhook output.
        </p>
        <SignInButton />
      </div>

      <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-5 text-left">
            <f.icon className="mb-3 h-5 w-5 text-primary" />
            <h3 className="mb-1 text-sm font-semibold">{f.title}</h3>
            <p className="text-sm text-muted">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 flex w-full justify-center">
        <DiscordModalPreview
          title="Staff Application"
          fields={[
            { id: "1", type: "short_text", label: "Why do you want to join staff?", required: true },
            { id: "2", type: "paragraph", label: "Relevant experience", required: false },
          ]}
        />
      </div>
    </main>
  );
}
