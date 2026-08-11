# Daily Games Hub — project instructions

Self-hosted PWA for two players (Serhan and his wife) tracking daily games,
scores and streaks. Live at https://dailygame.handani.dev. React Native Web /
Expo static export served by PocketBase from one container (Grey Tide
pattern). The README covers dev/deploy workflow; this file records the
invariants and gotchas that are not obvious from the code.

## Toolchain

- `pnpm` via corepack: plain `pnpm` is not on PATH on this box — use
  `corepack pnpm <cmd>`.
- Checks before committing: `corepack pnpm check` (tsc), `lint`, `test`
  (vitest; `--passWithNoTests` is intentional — the suite is currently empty).
- Local backend: `server/.dev/pocketbase` (0.39.10, gitignored, version pinned
  in `server/Dockerfile` with SHA256). Dev db `server/pb_data_dev` has test
  users `alice@test.local` / `bob@test.local` (pass12345) and superuser
  `admin@test.local` (admin12345).

## Data model invariants

- **Local-first**: screens only read AsyncStorage via `lib/storage.ts`;
  `lib/sync.ts` mirrors to PocketBase. Keep the exported function signatures of
  `lib/sync.ts` and `lib/friends.ts` stable — screens are written against them,
  and `lib/friends.ts` deliberately maps PB records into the pre-migration
  snake_case shapes in `types/friends.ts`.
- **Client ids vs record ids**: the app keys games/scores by a client-generated
  text id (`client_id`, e.g. `"wordle"`), unique per owner. PB record ids are
  internal to sync. `scores.game_id` holds the game's *client_id* — deliberately
  not a relation, because each player has their own copy of every game.
- **`scores.score` is a json field, not number**: PB number fields coerce empty
  to 0, which would be indistinguishable from a real score of 0. Consequence:
  never rely on server-side sort by score — aggregate client-side (see
  `lib/friends.ts`).
- **Friendships are a bidirectional two-row model written only by hooks**:
  create/update rules are `null`; `server/pb_hooks/main.pb.js` creates both
  rows on request acceptance and cascade-deletes the mirror row. Never write
  friendship rows from the client — a one-directional row silently breaks
  friend visibility one way.
- **Friend visibility rule** on games/scores (`@collection.friendships` join)
  is what powers head-to-head. Repeated `@collection.friendships` refs in one
  rule share a single join — that sharing is load-bearing.

## PocketBase gotchas (this repo hit all of these)

- Migration order matters: a collection rule referencing `@collection.X` fails
  to compile unless X already exists — `friendships` is created before
  `games`/`scores` in `1755000002_init_schema.js`.
- JSVM hooks run each handler in an isolated context: shared code must be
  `require()`d *inside* the handler body from `${__hooks}/utils.js`; module-scope
  references fail silently.
- Schema changes go in **new** migration files, never dashboard edits: the live
  container mounts `pb_migrations` read-only by design.
- `pb.authStore.record` returns a fresh object on every access — cache the
  snapshot (see `contexts/auth-context.tsx`) or `useSyncExternalStore` loops.
- Registration is closed and OAuth2 pinned off; PB would auto-create users on
  OAuth2 sign-in, bypassing `createRule: null`.

## Web-only platform notes

- Web is the only deployment target; the native path is dormant. `Platform.OS`
  guards stay, but don't add native-only dependencies.
- RN-web's `Alert.alert` is a **no-op** — user-facing errors must render inline
  (see `app/auth/login.tsx`). `Alert` still works for confirm dialogs on native
  but never rely on it on web.
- `public/sw.js`: bump `CACHE_NAME` when changing cached assets; keep `/api/`
  and `/_/` network-first.

## Deployment

- `pnpm build && tools/deploy/deploy.sh root@<unraid-tailscale-ip>`. Deploys
  never touch the live db at `/mnt/user/appdata/dailygame/pb_data`.
- `docker-compose.yml` pins `name: dailygame` — both this app and Grey Tide
  deploy from a directory named `app` on the same host, and an unpinned
  project name made one deploy adopt and destroy the other's stack. Do not
  remove it. Host port is **8096** (Grey Tide holds 8095).
- Admin `/_/` is reached over the tailnet and protected by Cloudflare Access on
  the public hostname; account creation and password resets happen there
  (no SMTP configured).

## History

Migrated from Expo mobile + Supabase + Vercel in August 2026; tag
`pre-pocketbase` is the last Supabase revision. `PHASE*_PLAN.md`, `todo.md`,
`design.md` and `BUG_REPORT.md` predate the migration — do not treat them as
current.
