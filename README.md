# Daily Games Hub

A self-hosted web app (PWA) for tracking daily games — Wordle, NYT Mini,
Connections and friends — with scores, streaks, and a head-to-head board for
two players. Lives at **https://dailygame.handani.dev**.

Built with React Native Web / Expo (static export) and a **PocketBase** backend
that serves both the API and the built web app from one container, following
the same pattern as Grey Tide.

Planned work — bugs, improvements and features — is tracked in
[ROADMAP.md](ROADMAP.md).

## Architecture

- **Local-first**: screens read AsyncStorage (`lib/storage.ts`); `lib/sync.ts`
  mirrors games/scores/profile to PocketBase on sign-in and app start, and each
  logged score is pushed immediately so the other player's head-to-head stays
  fresh.
- **One container**: PocketBase serves `/api/`, the admin UI at `/_/`, and the
  static Expo web export from `server/pb_public`. Same origin, no CORS; the
  client uses a relative `/` base URL in production (`lib/pocketbase.ts`).
- **Config as migrations**: collections, API rules, rate limits, nightly
  backups (03:00, keep 7) are versioned in `server/pb_migrations/`. Friend
  request/removal invariants live in `server/pb_hooks/` (both bidirectional
  friendship rows are created and removed server-side).
- **Closed registration**: accounts are created by the admin in the PocketBase
  dashboard. There is no self-serve sign-up or password reset.
- **Friends visibility**: games and scores are readable by their owner and the
  owner's friends (API rule), which is what powers the head-to-head section in
  game detail.

## Development

```bash
corepack pnpm install

# Terminal 1 — backend (PocketBase 0.39.10, pinned in server/Dockerfile).
# First time: download the binary to server/.dev/pocketbase (gitignored).
server/.dev/pocketbase serve --http=127.0.0.1:8090 \
  --dir server/pb_data_dev \
  --migrationsDir server/pb_migrations \
  --hooksDir server/pb_hooks

# First time only: create the dev superuser, then add app users in the
# dashboard at http://127.0.0.1:8090/_/ (users → New record → tick verified).
server/.dev/pocketbase superuser upsert you@example.com <password> --dir server/pb_data_dev

# Terminal 2 — web app (reads EXPO_PUBLIC_PB_URL from .env.development)
pnpm dev
```

Checks: `pnpm check` (tsc), `pnpm lint`, `pnpm test` (vitest).

## Deployment (Unraid + Cloudflare Tunnel)

```bash
pnpm build                          # expo export → dist → server/pb_public
tools/deploy/deploy.sh root@<unraid-tailscale-ip>
```

The deploy script rsyncs the compose file, Dockerfile, migrations, hooks and
built web app to `/mnt/user/appdata/dailygame/app/`, rebuilds, restarts the
`dailygame` container and waits for `/api/health`. The live database at
`/mnt/user/appdata/dailygame/pb_data` is never touched by deploys.

Host configuration lives in a `.env` beside the compose file on the host:
`PB_BIND` (bind IP; default loopback, set the Tailscale IP for tailnet access),
`PB_PORT` (default **8096** — Grey Tide holds 8095 on the same host),
`PB_DATA_DIR`, and for public access `COMPOSE_PROFILES=tunnel` plus
`CLOUDFLARE_TUNNEL_TOKEN`. Routing for `dailygame.handani.dev` →
`http://dailygame:8090` and the Cloudflare Access policy protecting `/_/*` and
`/api/collections/_superusers/*` are managed in the Cloudflare Zero Trust
dashboard, exactly as for Grey Tide.

Accounts on the live instance: create the superuser with
`docker exec dailygame /pb/pocketbase superuser upsert <email> <pw> --dir /pb/pb_data`,
then add the two app users in the dashboard (reached over the tailnet).
Password resets are done there too.

Backups run nightly inside `pb_data/backups` (restorable from the dashboard);
`pb_data` itself still needs an external copy for off-machine safety.

## History

The app started as an Expo mobile app backed by Supabase and hosted on Vercel;
it was migrated to this self-hosted setup in August 2026 (`pre-pocketbase` tag
marks the last Supabase revision). The old planning documents
(`PHASE*_PLAN.md`, `todo.md`, `design.md`, `BUG_REPORT.md`) predate the
migration.
