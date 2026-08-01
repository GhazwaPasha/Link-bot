"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
      className="rounded bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-hover"
    >
      Login with Discord
    </button>
  );
}
