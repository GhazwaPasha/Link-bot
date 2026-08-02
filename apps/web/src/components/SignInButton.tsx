"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/icons/DiscordIcon";

export function SignInButton() {
  return (
    <Button size="lg" onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}>
      <DiscordIcon className="h-4 w-4" />
      Log in with Discord
    </Button>
  );
}
