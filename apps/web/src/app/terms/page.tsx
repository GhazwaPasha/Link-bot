import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service — Discord Forms" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        &larr; Back home
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated August 18, 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. What this is</h2>
          <p>
            Discord Forms (&quot;the Service&quot;) is a Discord bot and web dashboard that lets a server let its members fill out
            native forms (button &rarr; modal) and, optionally, routes submissions through a review flow and out to
            Google Sheets or a webhook. By adding the bot to a server or signing in to the dashboard, you agree to these
            terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. Discord&apos;s own rules still apply</h2>
          <p>
            Using the Service also means following Discord&apos;s{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://discord.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://discord.com/guidelines"
              target="_blank"
              rel="noopener noreferrer"
            >
              Community Guidelines
            </a>
            . We can&apos;t override those, and violating them may get your access to the Service revoked independently
            of anything here.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Accounts and access</h2>
          <p>
            The dashboard is accessed by signing in with Discord. What you can see and edit there is scoped to servers
            where you have the Manage Server permission (or an equivalent role a server admin has granted). Server
            admins are responsible for who they give that access to.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Acceptable use</h2>
          <p>
            Don&apos;t use the Service to collect or distribute illegal content, to harass or deceive people, to build
            forms designed to phish or impersonate someone, or to circumvent Discord&apos;s rate limits or platform
            protections. We can suspend or remove access for use that violates this or puts the Service or other
            users at risk.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Content you and your members submit</h2>
          <p>
            Form questions are written by whoever builds the form (typically a server admin), and answers are
            submitted by server members who choose to fill the form out. That content is the responsibility of the
            people who wrote and submitted it, not the Service. Server admins are responsible for moderating the
            forms they publish and the submissions their servers collect.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Optional third-party integrations</h2>
          <p>
            If a server admin configures a Google Sheets or webhook integration, approved submissions are sent to the
            destination they specify. Once data leaves the Service through an integration you configured, it&apos;s
            subject to that third party&apos;s own terms and handling — we&apos;re not responsible for what happens to
            it there.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. No warranty, provided as-is</h2>
          <p>
            The Service is provided on a best-effort basis with no uptime guarantee. It&apos;s offered &quot;as
            is,&quot; without warranties of any kind, express or implied. We&apos;re not liable for lost data,
            missed submissions, or any other damages arising from using or being unable to use the Service, to the
            fullest extent the law allows.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Changes</h2>
          <p>
            We may update these terms or the Service itself over time. Material changes will be reflected by
            updating the date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">9. Ending use</h2>
          <p>
            A server can remove the bot at any time to stop using the Service. We may also suspend or terminate
            access for accounts or servers that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">10. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a className="underline underline-offset-2 hover:text-foreground" href="mailto:ghazwairshad@gmail.com">
              ghazwairshad@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
