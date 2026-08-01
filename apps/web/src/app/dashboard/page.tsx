import Image from "next/image";
import Link from "next/link";
import { getManageableGuilds } from "@/lib/guildAccess";
import { guildIconUrl, botInviteUrl } from "@/lib/discord";
import { prisma } from "@/lib/db";

export default async function ServerPickerPage() {
  const manageableGuilds = await getManageableGuilds();
  const installedGuilds = await prisma.guild.findMany({
    where: { guildId: { in: manageableGuilds.map((g) => g.id) }, leftAt: null },
    select: { guildId: true },
  });
  const installedIds = new Set(installedGuilds.map((g) => g.guildId));

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Select a server</h1>
      <p className="mb-8 text-sm text-muted">Servers you manage. Install the bot on any that don&apos;t have it yet.</p>

      {manageableGuilds.length === 0 && (
        <p className="text-muted">
          No manageable servers found. You need the &quot;Manage Server&quot; permission to configure forms.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {manageableGuilds.map((guild) => {
          const installed = installedIds.has(guild.id);
          const icon = guildIconUrl(guild);
          return (
            <li
              key={guild.id}
              className="flex items-center justify-between rounded border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {icon ? (
                  <Image src={icon} alt="" width={36} height={36} className="rounded-full" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold">
                    {guild.name.slice(0, 1)}
                  </div>
                )}
                <span className="font-medium">{guild.name}</span>
              </div>

              {installed ? (
                <Link
                  href={`/dashboard/${guild.id}`}
                  className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Manage
                </Link>
              ) : (
                <a
                  href={botInviteUrl(guild.id)}
                  className="rounded border border-border px-4 py-2 text-sm font-semibold hover:border-accent"
                >
                  Invite bot
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
