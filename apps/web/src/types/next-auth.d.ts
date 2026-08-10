import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
    error?: "RefreshAccessTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Epoch ms when accessToken expires. */
    accessTokenExpires?: number;
    discordId?: string;
    /** Set when a refresh attempt fails — callers should treat the session as signed out. */
    error?: "RefreshAccessTokenError";
  }
}
