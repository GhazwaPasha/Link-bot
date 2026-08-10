import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

/**
 * The Discord access token only ever lives inside the encrypted JWT cookie —
 * it's deliberately never put on the client-visible `session` object next-auth
 * exposes via useSession(), so this is the only way to read it, and only from
 * server-side code (Server Components / Route Handlers).
 */
export async function getDiscordAccessToken(): Promise<string | null> {
  const cookieRecord = Object.fromEntries(cookies().getAll().map((c) => [c.name, c.value]));
  const token = await getToken({
    // next-auth v4's getToken accepts a minimal { cookies } shape outside of Route Handlers.
    req: { cookies: cookieRecord } as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });
  // If the jwt callback's refresh attempt failed, the accessToken here is stale
  // and would just 401 against Discord — treat it as absent so callers fall
  // back to signed-out behavior instead of throwing on the API call.
  if (!token || token.error) return null;
  return token.accessToken ?? null;
}
