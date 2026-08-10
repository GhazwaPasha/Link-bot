import type { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

/**
 * Discord access tokens expire after ~7 days. Without this, `token.accessToken`
 * set at initial sign-in goes stale forever and every Discord API call made
 * from it (see lib/discord.ts) starts 401ing — which surfaces as an unhandled
 * server-side exception on every /dashboard page, not a graceful re-login.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) throw new Error("No refresh token available");

    const res = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      // Discord may rotate the refresh token; fall back to the old one if not.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (err) {
    console.error("[auth] failed to refresh Discord access token:", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
        token.discordId = account.providerAccountId;
        return token;
      }

      // Still valid (with a minute of slack) — nothing to do.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId ?? "";
      }
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
