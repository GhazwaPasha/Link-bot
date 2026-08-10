import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManageableGuilds } from "@/lib/guildAccess";
import { guildIconUrl, botInviteUrl } from "@/lib/discord";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default async function ServerPickerPage() {
  const session = await getServerSession(authOptions);
  // Middleware only guarantees a token exists, not that it's still valid —
  // a Discord token whose refresh failed carries session.error instead.
  if (!session || session.error) redirect("/");

  const manageableGuilds = await getManageableGuilds();
  const installedGuilds = await prisma.guild.findMany({
    where: { guildId: { in: manageableGuilds.map((g) => g.id) }, leftAt: null },
    select: { guildId: true },
  });
  const installedIds = new Set(installedGuilds.map((g) => g.guildId));

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Select a server</h1>
      <p className="mb-8 text-sm text-muted">Servers you manage. Install the bot on any that don&apos;t have it yet.</p>

      {manageableGuilds.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No manageable servers found. You need the &quot;Manage Server&quot; permission to configure forms.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {manageableGuilds.map((guild) => {
          const installed = installedIds.has(guild.id);
          const icon = guildIconUrl(guild);
          return (
            <li
              key={guild.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {icon && <AvatarImage src={icon} alt="" />}
                  <AvatarFallback>{guild.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{guild.name}</span>
              </div>

              {installed ? (
                <Button asChild size="sm">
                  <Link href={`/dashboard/${guild.id}`}>Manage</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <a href={botInviteUrl(guild.id)}>Invite bot</a>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
