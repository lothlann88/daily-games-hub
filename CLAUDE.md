# Daily Games Hub — project instructions

Self-hosted PWA for two players (Serhan and his wife) tracking daily games,
scores and streaks. Live at https://dailygame.handani.dev. React Native Web /
Expo static export served by PocketBase from one container (Grey Tide
pattern). The README covers dev/deploy workflow; this file records the
invariants and gotchas that are not obvious from the code.

## Toolchain

- Deployment model: **(a) self-hosted on Unraid** (App Playbook §6) behind
  Cloudflare Tunnel, deployed by `tools/deploy/deploy.sh`.
- `pnpm` via corepack: plain `pnpm` is not on PATH on this box — use
  `corepack pnpm <cmd>`. That also means package.json scripts must not invoke
  nested `pnpm` (the root `build` script calls expo directly for this reason).
- Gate ladder before committing: `corepack pnpm check` (tsc, strict, includes
  tests) · `lint` (eslint direct with `--max-warnings 0` — `expo lint` does not
  forward the flag) · `test` (vitest).
- `corepack pnpm build` exports the web app into `server/pb_public` and stamps
  `version.json` there (playbook §5) — generated, never hand-edited.
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
- **`users.listRule` is self-only**; discovery goes through
  `GET /api/dgh/users/lookup` (exact username). `users.viewRule` allows self,
  friends and pending-request counterparties — and it is what **`expand`**
  resolves against, so `lib/friends.ts` reading friends' profiles depends on
  it. Tighten it and the Friends tab and head-to-head go *silently empty*
  (`getFriends` filters out rows whose expand is missing). Test expand after
  any change to it.

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
- Registration is invite-gated through `POST /api/dgh/signup` (a `routerAdd`
  hook), **not** by opening `users.createRule` — it stays `null` on purpose.
  The batch API dispatches through its own handler map, so a route rate limit
  would not cover a create smuggled into `/api/batch`; a null createRule
  refuses both. It also fails closed: if the hook stops loading, sign-up simply
  stops rather than falling open. OAuth2 stays pinned off for the same reason —
  PB auto-creates users on OAuth2 sign-in, bypassing `createRule`.
- The `invites` collection has every rule `null` (superuser-only); the hook
  reaches it via `runInTransaction`, which bypasses rules. Never give it a read
  rule — that would publish the codes.
- New accounts are created with `verified: false` and there is no SMTP, so
  **never** set a `users.authRule` requiring verified accounts: nobody could
  ever verify and everyone would be locked out.

## Web-only platform notes

- Web is the only deployment target; the native path is dormant. `Platform.OS`
  guards stay, but don't add native-only dependencies.
- RN-web's `Alert.alert` is a **no-op** — user-facing errors must render inline
  (see `app/auth/login.tsx`). `Alert` still works for confirm dialogs on native
  but never rely on it on web.
- `public/sw.js`: bump `CACHE_NAME` when changing cached assets; keep `/api/`
  and `/_/` network-first.

## Versioning & changelog (mandatory)

Every user-visible change adds an entry to `lib/changelog.ts` (newest release
first) AND bumps `version` in **both** `package.json` and `app.config.ts` —
patch for fixes, minor for features. `APP_VERSION` derives from the newest
changelog entry and drives the What's new pop-up (shown once per update,
tracked via the `lastSeenVersion` AsyncStorage key); Settings → About shows
the version and the full update log. Entries are user-facing prose (UK
English), not commit messages. The tests in `lib/__tests__/changelog.test.ts`
enforce ordering and format.

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
