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

# Terminal 1 — backend (PocketBase 0.39.11, pinned in server/Dockerfile).
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

Candidate future work, in rough order of intent: **Next** is what would be
picked up first, **Later** needs a reason or a design pass before it moves up,
**Deferred design questions** are items whose *decision* is the work, and
**Not planned** records what is deliberately out of scope so nobody proposes it
again. None of it is committed to a date; each item gets its own design pass
before implementation. Shipped work leaves this list — the in-app changelog
(Settings → About) is the record of what was done. A rendered mirror of this
section is published as a private artifact board; the README is the source of
truth.

Item IDs (M/L) refer to the 2026-08 stability & security audit; an ID implies
the item's severity where no tag is given.

### Next

Small, wanted, and already designed — the natural next releases, in list order.

- **Transactional friendship hooks (M7)** [risk: low] — the accept hook writes
  two friendship rows without a transaction; a half-failure leaves the
  one-directional friendship the hooks exist to prevent. Wrap in
  `runInTransaction` and narrow the swallow-all catches.
- **Leaderboard streaks** [severity: low] [risk: low] — the friends leaderboard
  reports every streak as 0 (`lib/friends.ts` TODO); wire it to the shared
  streak calculation the home screen already uses.
- **Debounce friend search (L1)** [risk: low] — the add-friend screen queries on
  every keystroke. Less pressing since exact-username lookup (one request, not
  ~40), but still unthrottled typing.
- **Error boundary and unit coverage for the risky modules** *(part of audit
  L7)* [risk: low] — one render crash still blanks the whole app;
  `lib/sync.ts`, `lib/storage.ts` and `lib/friends.ts` have no unit coverage.
  The storage-race and merge suites are the shape to extend. (A browser smoke
  rig now guards the happy path end to end — `corepack pnpm smoke`.)
- **Resize oversized icons (L3)** [risk: low] — five 5.1 MB PNGs are tracked;
  the "192px" and "512px" icons are the same file and both are precached
  (~10 MB per install).

### Later

Worth doing, not yet pressing; each needs a design pass before code.

- **Cap sync retries; cancel on timeout (M9)** [risk: medium] — the 30-second
  retry chain is unbounded with no backoff, and the 60-second sync timeout
  abandons rather than aborts, so late writes can still land. Touches the auth
  context and the sync layer's cancellation story.
- **Service worker: stale-while-revalidate (L2)** [risk: medium] — hashed
  assets are cache-first behind a hand-bumped `CACHE_NAME`; a missed bump
  serves stale bundles indefinitely. A wrong service worker strands every
  installed copy, so the smoke rig is the gate.
- **Accept a friend request from search results** — the add-friend screen shows
  "accept from the Friends tab" instead of an unfinished inline accept path.
- **Tidy dev creds and the native intent filter (L6)** — dev-only passwords
  committed in CLAUDE.md; the dormant Android intent filter uses `host: "*"`.
  Cosmetic until a native build exists.

### Deferred design questions

Recorded so the decision is taken deliberately rather than defaulted.

- **Surface storage write failures (M6)** — saves swallow errors and resolve
  successfully, so a quota failure is indistinguishable from a saved write.
  Decide the error surface first: a banner per failure, or a persistent
  "storage unhealthy" state.
- **Score finiteness; recompute longest streak (L4)** [risk: medium] —
  `parseFloat("1e999")` stores `Infinity`; `longestStreak` is a monotone max
  that never deflates after plays are deleted. The finiteness check is a plain
  fix; the deflate half is a behaviour change users can see — decide before
  shipping.
- **`is_private` is read by no rule** — known accepted behaviour, not a bug.
  Since exact-username lookup replaced browsing, the flag no longer affects who
  can find you — nobody can browse at all. Enforce it, or remove the field.

### Not planned

- **A native (Android / iOS) build** — web is the only deployment target and the
  native path is dormant: `Platform.OS` guards stay, but no native-only
  dependencies are added and nothing is tested outside the browser. Revisit
  only with a concrete reason; the Expo scaffolding makes it possible, not
  planned.

### Operational to-dos

Actions on the host or its services, not code:

- **Continuous integration** *(parked — design recorded; follows Grey Tide's
  now-running CI)* — no gate runs automatically; everything is a manual
  command. The settled shape when picked up: Gitea Actions on the existing
  self-hosted runner running `corepack pnpm check`, `lint`, `test` plus the
  smoke rig on push to `main` — verification only, no auto-deploy, no secrets.
- **Periodic checks** *(recurring)* — after any Zero Trust change, confirm the
  Access policies still cover `/_/*` and `/api/collections/_superusers/*`
  **with the hostname spelled correctly** (a typo'd hostname left the superuser
  API open until 2026-08-21; the `http.pb.js` middleware is the in-repo
  backstop, not a replacement); confirm the `/sw.js` Cache Rule still bypasses
  the edge after any Cloudflare caching change; rotate the Gitea→GitHub mirror
  token before it expires.
- **Cloudflare cache rule for `/sw.js`** — *resolved (2026-08-25)*: a Cache Rule
  (`URI Path equals /sw.js` → Bypass cache) stops the edge holding the service
  worker. Until then Cloudflare cached it for 4 hours by file extension (the
  origin sends no `Cache-Control`), so a `CACHE_NAME` bump took hours to reach
  anyone. `/sw.js` now returns `cf-cache-status: DYNAMIC` while hashed bundles
  still `HIT`, so updates propagate at once without weakening asset caching.
- **Off-host backups** — *resolved (Aug 2026)*: Duplicacy copies the whole
  appdata share (including `pb_data` and its nightly 03:00 snapshots) to
  Backblaze, storage encrypted. The newest `@auto_pb_backup_*.zip` inside
  `pb_data/backups` is the restore point (dashboard → Settings → Backups);
  a periodic restore test remains worth doing.
