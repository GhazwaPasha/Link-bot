/**
 * Posts straight to a Discord channel via REST, using the same bot token the
 * dashboard already uses read-only (see discordBot.ts). The web app has no gateway
 * connection — but Discord doesn't care who posts a message via REST vs. the
 * gateway, and a message's buttons stay fully interactive either way (clicks route
 * through Discord to whichever process is connected with matching custom_ids,
 * which is the bot's interactionCreate.ts). This is what lets a web-form
 * submission's image go straight from the browser to Discord with nothing of ours
 * in between — no storage, no polling handoff.
 */
const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordEmbedPayload {
  title: string;
  description: string;
  color: number;
  fields: { name: string; value: string; inline: boolean }[];
  timestamp: string;
}

export interface DiscordActionRowPayload {
  type: 1;
  components: { type: 2; style: number; label: string; custom_id: string }[];
}

export interface DiscordImageFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

function botToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not set");
  return token;
}

export async function postDiscordMessage(
  channelId: string,
  payload: { embeds: DiscordEmbedPayload[]; components?: DiscordActionRowPayload[] },
  images: DiscordImageFile[],
): Promise<{ messageId: string }> {
  const headers: Record<string, string> = { Authorization: `Bot ${botToken()}` };
  let body: BodyInit;

  if (images.length > 0) {
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    images.forEach((img, i) => {
      form.append(`files[${i}]`, new Blob([new Uint8Array(img.buffer)], { type: img.mimeType }), img.fileName);
    });
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, { method: "POST", headers, body });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Discord message post failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string };
  return { messageId: data.id };
}
