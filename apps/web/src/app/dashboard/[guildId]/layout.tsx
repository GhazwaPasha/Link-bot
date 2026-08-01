import { requireGuildAccess } from "@/lib/guildAccess";
import { SidebarNav } from "@/components/SidebarNav";

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
      <div className="min-h-screen flex-1">{children}</div>
    </div>
  );
}
