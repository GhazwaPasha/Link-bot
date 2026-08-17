import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Discord Forms" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        &larr; Back home
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated August 18, 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. What we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">From Discord sign-in:</span> your Discord user ID, username, and
              avatar, plus the list of servers you&apos;re in — requested so the dashboard can show you the servers
              you have Manage Server access to. We don&apos;t see your Discord password; sign-in goes through
              Discord&apos;s own OAuth flow.
            </li>
            <li>
              <span className="text-foreground">Server data:</span> for servers the bot is added to, its server ID,
              name, and icon.
            </li>
            <li>
              <span className="text-foreground">Forms and submissions:</span> the questions a form asks (written by
              a server admin), and the answers members submit — which include the submitting member&apos;s Discord
              user ID. If a form has a review step, we also record which admin approved or rejected a submission.
            </li>
            <li>
              <span className="text-foreground">Integration settings:</span> if a server admin sets up a Google
              Sheets or webhook integration, we store the configuration they provide (e.g. a spreadsheet ID or
              webhook URL) so the bot can send approved submissions there.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. How we use it</h2>
          <p>
            To run the dashboard and bot: authenticating you, showing you the right servers and forms, posting form
            buttons and collecting submissions in Discord, running the optional review flow, and forwarding approved
            submissions to any integration you&apos;ve configured. We don&apos;t use this data for advertising, and
            we don&apos;t sell it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Where it&apos;s stored</h2>
          <p>
            Server, form, and submission data lives in our database. Your sign-in session (including the Discord
            access token used to talk to Discord&apos;s API on your behalf) is kept in an encrypted cookie in your
            browser, not on our servers, and expires automatically.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Who else sees it</h2>
          <p>
            Only Discord (as the platform we operate on) and, if a server admin has configured one, the specific
            Google Sheets account or webhook endpoint they pointed the integration at. We don&apos;t share data with
            anyone else.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. How long we keep it</h2>
          <p>
            Data for a server is kept for as long as the bot remains there (or until a server admin deletes a
            specific form or its submissions). If the bot is removed from a server, existing data isn&apos;t
            automatically erased — contact us using the details below if you&apos;d like it deleted.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Your choices</h2>
          <p>
            You can stop using the dashboard at any time by not signing in again. A server admin can remove the bot
            from a server, or delete individual forms and submissions from the dashboard. To request deletion of
            data we haven&apos;t given you a self-service way to remove, contact us below.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Children</h2>
          <p>
            The Service is meant to be used within Discord, which requires users to meet Discord&apos;s own minimum
            age requirement. We don&apos;t knowingly collect data from children below that age outside of what
            Discord itself already governs.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Changes</h2>
          <p>We may update this policy as the Service changes. Material changes will update the date at the top of this page.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">9. Contact</h2>
          <p>
            Questions about this policy, or a data deletion request:{" "}
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
