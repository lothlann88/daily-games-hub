# Daily Games Hub

A self-hosted web app (PWA) for tracking daily games — Wordle, NYT Mini,
Connections and friends — with scores, streaks, and a head-to-head board for
two players. Lives at **https://dailygame.handani.dev**.

Built with React Native Web / Expo (static export) and a **PocketBase** backend
that serves both the API and the built web app from one container, following
the same pattern as Grey Tide.

Planned work is tracked in the [Roadmap](#roadmap) at the end of this file.

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
- **Invite-gated registration**: sign-up needs a code from the `invites`
  collection and goes through `POST /api/dgh/signup`. `users.createRule` stays
  `null`, so that endpoint is the only way in — a direct record create, or one
  smuggled through `/api/batch`, is refused. There is no self-serve password
  reset (no SMTP); the admin resets passwords in the dashboard.
- **Friends visibility**: games and scores are readable by their owner and the
  owner's friends (API rule), which is what powers the head-to-head section in
  game detail.
- **Account discovery**: `users.listRule` is self-only, so the account list
  cannot be browsed. People are found by exact username through
  `GET /api/dgh/users/lookup`. Set a username in Settings, or friends cannot
  find you.

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

To let someone sign up, add a row to `invites` in the dashboard: a `code`
(upper-case letters and digits, 8-64 chars — generate one with
`openssl rand -hex 8` rather than picking a memorable phrase, since the rate
limit assumes a high-entropy code), `max_uses`, and tick `active`. New rows are
inactive until you tick it. Codes can be expired (`expires_at`) or revoked by
unticking `active`, and `last_used_by` records who used one.

Backups run nightly inside `pb_data/backups` (restorable from the dashboard);
`pb_data` itself still needs an external copy for off-machine safety.

## History

The app started as an Expo mobile app backed by Supabase and hosted on Vercel;
it was migrated to this self-hosted setup in August 2026 (`pre-pocketbase` tag
marks the last Supabase revision).

## Roadmap

Candidate future work, roughly ordered. None of it is committed; each item gets
its own design pass before implementation. Shipped work leaves this list — the
in-app changelog (Settings → About) is the record of what was done. A rendered
mirror of this section is published as a private artifact board; the README is
the source of truth.

Item IDs (M/L) refer to the 2026-08 stability & security audit.

- **Container hardening (M2)** *(from the 2026-08 audit; landing in the playbook
  retrofit)* — non-root fixed UID, `no-new-privileges`, `cap_drop: ALL`, a
  memory limit and log rotation, matching Grey Tide's pattern.
- **Trust only `CF-Connecting-IP` (L8)** *(from the 2026-08 audit; landing in
  the playbook retrofit)* — PocketBase trusts a configured proxy header by
  presence alone, so the `X-Forwarded-For` fallback would let a direct
  (tailnet) client adopt any rate-limit identity.
- **Surface storage write failures (M6)** — saves swallow errors and resolve
  successfully, so a quota failure is indistinguishable from a saved write.
  Needs an error surface decision: banner per failure, or a persistent
  "storage unhealthy" state.
- **Transactional friendship hooks (M7)** — the accept hook writes two
  friendship rows without a transaction; a half-failure leaves the
  one-directional friendship the hooks exist to prevent. Wrap in
  `runInTransaction` and narrow the swallow-all catches.
- **Cap sync retries; cancel on timeout (M9)** — the 30-second retry chain is
  unbounded with no backoff, and the 60-second sync timeout abandons rather
  than aborts, so late writes can still land. Touches the auth context and the
  sync layer's cancellation story — needs a design pass.
- **Debounce friend search (L1)** — the add-friend screen queries on every
  keystroke. Less pressing since exact-username lookup (one request, not ~40),
  but still unthrottled typing.
- **Score finiteness; recompute longest streak (L4)** — `parseFloat("1e999")`
  stores `Infinity`; `longestStreak` is a monotone max that never deflates
  after plays are deleted. The deflate half is a behaviour change users can
  see — decide before shipping.
- **Error boundary and tests for the risky modules** *(the code half of audit
  L7)* — one render crash blanks the whole app; `lib/sync.ts`, `lib/storage.ts`
  and `lib/friends.ts` have no coverage. The storage-race and merge suites are
  the shape to extend.
- **Service worker: stale-while-revalidate (L2)** — hashed assets are
  cache-first behind a hand-bumped `CACHE_NAME`; a missed bump serves stale
  bundles indefinitely.
- **Resize oversized icons (L3)** — five 5.1 MB PNGs are tracked; the "192px"
  and "512px" icons are the same file and both are precached (~10 MB per
  install).
- **Close latent config footguns (L5)** — gitignore `.env.production`; delete
  the vestigial Manus env mapping in `scripts/load-env.js`, which would copy
  any matching host variable into the public bundle.
- **Tidy dev creds and the native intent filter (L6)** — dev-only passwords
  committed in CLAUDE.md; the dormant Android intent filter uses `host: "*"`.
  Cosmetic until a native build exists.
- **Leaderboard streaks** — the friends leaderboard reports every streak as 0
  (`lib/friends.ts` TODO); wire it to the real calculation.
- **Accept a friend request from search results** — the add-friend screen shows
  "accept from the Friends tab" instead of an unfinished inline accept path.
- Known accepted behaviour, not a bug: **`is_private` is read by no rule.**
  Since exact-username lookup replaced browsing, the flag no longer affects who
  can find you — nobody can browse at all. Enforcing or removing it is a design
  question, deferred.

### Operational to-dos

Actions on the host or its services, not code:

- **Cloudflare cache rule for `/sw.js`** *(open, found 2026-08-23)* — the edge
  caches the service worker for 4 hours (`cf-cache-status: HIT`,
  `max-age=14400`), so a `CACHE_NAME` bump takes hours to reach anyone.
  Navigation is network-first so the app itself updates; the worker lags. Fix
  is a cache rule (or short max-age) for `/sw.js` in the Cloudflare dashboard.
- **Continuous integration** *(parked; design follows Grey Tide's parked CI
  entry)* — no gate runs automatically; everything is a manual command. The
  settled shape when picked up: Gitea Actions or GitHub Actions running
  `corepack pnpm check`, `lint`, `test` plus the smoke rig on push to `main` —
  verification only, no auto-deploy.
- **Off-host backups** — *resolved (Aug 2026)*: Duplicacy copies the whole
  appdata share (including `pb_data` and its nightly 03:00 snapshots) to
  Backblaze, storage encrypted. The newest `@auto_pb_backup_*.zip` inside
  `pb_data/backups` is the restore point (dashboard → Settings → Backups);
  a periodic restore test remains worth doing.
- **Periodic checks** — after any Zero Trust change, confirm the Access
  policies still cover `/_/*` and `/api/collections/_superusers/*` **with the
  hostname spelled correctly** (a typo'd hostname left the superuser API open
  until 2026-08-21; the `http.pb.js` middleware is the in-repo backstop, not a
  replacement); rotate the Gitea→GitHub mirror token before it expires.
