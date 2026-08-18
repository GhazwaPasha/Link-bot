# Discord Forms

Self-hosted alternative to discordforms.app: native Discord forms (button → modal), a web dashboard to build them, submission review, and Sheets/webhook output.

## Structure

```
apps/
  bot/    Node.js + discord.js bot (Render background worker)
  web/    Next.js dashboard (Vercel)
packages/
  db/     Drizzle schema + client, shared by bot and web
  shared/ Field-type definitions, validation, answer formatting — shared by bot and web
```

The bot and dashboard don't talk to each other directly. They share one Postgres database. When the dashboard creates a panel, it's just a DB row with no `messageId`; the bot polls for those every ~20s (`apps/bot/src/poller.ts`) and posts the actual Discord message, since only the bot process holds a live gateway connection.

## 1. Discord Developer Portal setup

1. Create an application at https://discord.com/developers/applications.
2. **Bot** tab → reset token, copy it (`DISCORD_TOKEN`). Copy the **Application ID** too (`DISCORD_CLIENT_ID`).
3. **OAuth2** tab → copy **Client Secret** (`DISCORD_CLIENT_SECRET`, dashboard only).
4. **OAuth2 → Redirects** → add `http://localhost:3000/api/auth/callback/discord` for local dev, and your production dashboard URL's equivalent once deployed.

## 2. Database (Supabase)

1. Create a free Postgres project at https://supabase.com.
2. From the project's **Connect** dialog, copy two connection strings:
   - the pooled one (port 6543, `?pgbouncer=true`) into `DATABASE_URL` — this is what the bot and dashboard query through at runtime.
   - the direct one (port 5432, no pooler) into `DIRECT_URL` — this is only used to run migrations (`drizzle-kit` needs a non-pooled connection).
3. Set both in **all three** of `packages/db/.env`, `apps/bot/.env`, and `apps/web/.env`.
4. From the repo root:
   ```
   pnpm install
   pnpm db:migrate   # applies packages/db/src/schema.ts via drizzle-kit
   ```

## 3. Configure env files

Copy `.env.example` → `.env` in both `apps/bot` and `apps/web`, filling in:

- `apps/bot/.env`: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`, `DIRECT_URL`, `DASHBOARD_URL`
- `apps/web/.env`: `DATABASE_URL`, `DIRECT_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN` (same as the bot's `DISCORD_TOKEN` — the dashboard uses it read-only, to list a guild's channels/roles), `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)

## 4. Run locally

```
pnpm install
pnpm --filter @discord-forms/bot register-commands   # registers /form once
pnpm dev:bot     # terminal 1
pnpm dev:web     # terminal 2
```

Visit http://localhost:3000, log in with Discord, invite the bot to a server you manage, then use `/form create`, `/form publish`, `/form panel` in Discord — or build/publish/post from the dashboard directly.

## 5. Using it

- **Build a form**: dashboard → Forms → New Form → add fields in the Questions tab (live preview updates as you type) → Publish.
- **Post it**: Panels tab → pick the published form + a channel → Post panel. The bot picks it up within ~20s and posts the button message.
- **Review**: if a form has a review channel set (Settings tab), submissions post there with Approve/Reject buttons, restricted to Manage Server or roles picked in the guild Settings page. No review channel = auto-approved straight to the output channel.
- **Integrations**: per-form Webhook (POST submission JSON, optionally HMAC-signed) and Google Sheets (append row via a service account) — both configured in the form's Settings tab, run on approval.

## 6. Deploying

- **Dashboard → Vercel**: import the repo, set root directory to `apps/web`, add the same env vars as above (with production `NEXTAUTH_URL` and the Discord redirect URI updated to match). Free Hobby tier is fine for non-commercial use.
- **Bot → Render**: new Background Worker, root directory `apps/bot`, build command `pnpm install --frozen-lockfile && pnpm run build`, start command `pnpm start`. Add the same env vars.
  - **Open decision on tier**: a free Render web service + an external keep-alive ping (e.g. UptimeRobot) works at $0/mo but the gateway connection drops and reconnects (~10-30s outage) on every restart, and Render's 750 free instance-hours/month cap only just covers one always-pinged service — not officially supported for long-running bots. The $7/mo Background Worker tier is always-on with no reconnect gaps. Recommendation: start free to validate, move to paid once real members depend on it.
- **Supabase**: already hosting the DB from step 2 — nothing else to do. Run `pnpm db:migrate` (with `DIRECT_URL` set) whenever `packages/db/src/schema.ts` changes, before deploying.
- After deploying, update the OAuth2 redirect URI in the Developer Portal and re-run `register-commands` if you changed `DISCORD_CLIENT_ID`.

## Notes / known limitations (v1)

- The select-menu chain (dropdown/checkbox/user/role/channel fields) is held in an in-memory session on the bot process — fine for a single instance, but won't survive a bot restart mid-submission or scale to multiple bot instances without moving that state to Redis.
- Discord modals cap out at 5 text inputs; the shared field validator (`packages/shared/src/fields.ts`) enforces that plus a 4-field cap on the select-menu chain before a form can be published.
