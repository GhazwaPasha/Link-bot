import { requireGuildAccess } from "@/lib/guildAccess";
import { SidebarNav } from "@/components/SidebarNav";
import { UserMenu } from "@/components/UserMenu";

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  const guild = await requireGuildAccess(params.guildId);

  return (
    <div className="flex">
      <SidebarNav guildId={params.guildId} guildName={guild.name} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-end border-b border-border px-6">
          <UserMenu />
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
