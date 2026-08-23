# Daily Games Hub — Roadmap

The single running list of what's planned for Daily Games Hub: bugs to fix,
improvements to make, and features to build. This is the source of truth;
a rendered, monitor-friendly version is published as an artifact and
regenerated from this file whenever it changes.

Daily Games Hub is a self-hosted PWA for two players (Serhan and his wife) to
track daily games, scores and streaks, with a head-to-head board — React
Native Web / Expo on a PocketBase backend, one container, live at
dailygame.handani.dev. See [README.md](README.md) for architecture and
[the audit dossier](https://claude.ai/code/artifact/f19aefda-2019-4f15-9310-9a9fe7cb2c18)
for the stability/security review these items came from.

**Priority:** `High` · `Medium` · `Low` · `Feature` (new capability)
**Status:** ✅ Done (live) · 🔷 On branch (pending deploy) · ▶ Next · ⬜ Planned

Item IDs (H/M/L) match the audit dossier so the two cross-reference. Add new
items freely under the right heading with a priority and status.

> **Next up:** the remaining medium-severity backlog (M2, M6, M7, M9).
> v1.11.0 is deployed and verified live (23 Aug): invite-code sign-up,
> exact-username discovery, and the storage-write serialisation.

---

## Bugs & fixes

- [x] **Merged & deployed v1.8.3, verified live (22 Aug)** — PocketBase 0.39.11
      running, served bundle hash matches the build, container healthy with no
      errors, data and backups intact. Still worth a manual pass through the
      repaired flows in the browser. `High` · ✅ Done
- [x] **Superuser auth endpoint put behind Cloudflare Access** — Access
      application hostname was a typo (`dailygames` → `dailygame`); corrected
      and re-verified live. `High` · ✅ Done · H0
- [x] **Clear local data on sign-out** — stops a second account on a shared
      browser inheriting and re-uploading the previous user's library.
      `High` · ✅ Done · H1
- [x] **Replace web-broken `Alert.alert` flows with inline UI** — remove-friend
      confirm, data import, and add-game validation were no-ops on web.
      `High` · ✅ Done · H2
- [x] **Streaks broke when the clocks went forward** — day counting floored a
      23-hour spring-forward gap to zero, so the streak silently reset. Found
      while building the dashboard; fixed with a shared date module.
      `Medium` · ✅ Done
- [x] **Account list is no longer browsable** — `users.listRule` is self-only
      and people are found by exact username through `GET /api/dgh/users/lookup`.
      Note `is_private` is still read by no rule; it no longer affects who can
      find you, because nobody can browse at all. `Medium` · ✅ Done · M3
- [x] **Validate imported backups** — imports are now validated against a `zod`
      schema before anything is written (replace and merge paths), so a bad file
      is rejected with a clear message. `Medium` · ✅ Done · M4
- [x] **Serialise storage writes** — every read-modify-write now goes through a
      single queue, so a play logged during a sync is no longer overwritten.
      `Medium` · ✅ Done · M5
- [ ] **Surface storage write failures** — saves swallow errors and resolve
      successfully, so a quota failure looks like a save. `Medium` · ⬜ Planned · M6
- [ ] **Make friendship hooks transactional** — the paired row writes aren't in
      a transaction; a half-failure leaves a one-directional friendship.
      `Medium` · ⬜ Planned · M7
- [ ] **Cap sync retries; cancel on timeout** — replace the unbounded 30s retry
      chain with capped backoff, and make the 60s timeout actually abort work.
      `Medium` · ⬜ Planned · M9
- [ ] **Debounce friend search** — it fires on every keystroke (~40 requests)
      and trips the rate limit. `Low` · ⬜ Planned · L1
- [ ] **Score finiteness check; recompute longest streak** — `parseFloat`
      accepts `Infinity`; longest streak never deflates after deletions.
      `Low` · ⬜ Planned · L4

## Improvements

- [x] **Off-host backups** — daily backups are copied off-host to Backblaze by
      Unraid. Follow-up: a periodic restore test. `Medium` · ✅ Done
- [x] **Bump PocketBase 0.39.10 → 0.39.11** — `PB_VERSION` + `PB_SHA256` updated
      (hash checked against upstream checksums); 0.39.11 confirmed running in
      production. `Medium` · ✅ Done · M1
- [ ] **Harden the container** — non-root user, plus `mem_limit`, `pids_limit`
      and log-size caps. `Medium` · ⬜ Planned · M2
- [x] **Deploy rollback & stronger freshness guard** — deploy now fails on a
      stale build, tags the last-known-good image before rebuilding, and rolls
      back to it if the container is unhealthy afterwards. `pb_data` is never
      touched (snapshotting it was deliberately left out of scope).
      `Medium` · ✅ Done · M8
- [ ] **`sw.js` is edge-cached for 4 hours** — Cloudflare serves the old service
      worker after a deploy (`cf-cache-status: HIT`, `max-age=14400`), so a
      `CACHE_NAME` bump takes hours to reach anyone. Navigation is network-first
      so the app itself updates, but the worker lags. Needs a cache rule or a
      short max-age on `/sw.js`. `Low` · ⬜ Planned
- [ ] **Service worker: stale-while-revalidate** — hashed assets are cache-first
      with a manual `CACHE_NAME` bump; a missed bump serves stale bundles.
      `Low` · ⬜ Planned · L2
- [ ] **Resize oversized icons** — five 5.1 MB PNGs are tracked; the 192px and
      512px icons are the same file, both precached (~10 MB/install).
      `Low` · ⬜ Planned · L3
- [ ] **Close latent config footguns** — gitignore `.env.production`; delete the
      vestigial Manus env mapping in `scripts/load-env.js`. `Low` · ⬜ Planned · L5
- [ ] **Remove committed dev creds; tighten native intent filter** — dev
      passwords in `CLAUDE.md`; Android intent filter uses `host: "*"`.
      `Low` · ⬜ Planned · L6
- [ ] **Add error boundary, CI, and tests for the risky modules** — no error
      boundary (one crash blanks the app); no CI; no tests for
      sync/storage/friends/hooks. `Low` · ⬜ Planned · L7
- [ ] **Drop spoofable `X-Forwarded-For`** — trust only `CF-Connecting-IP` so
      per-IP rate limiting can't be defeated if exposure widens. `Low` · ⬜ Planned · L8

## Features & ideas

- [x] **Invite-code sign-up** — people can create their own account with a code
      from the `invites` collection, gated server-side through
      `POST /api/dgh/signup`. `Feature` · ✅ Done

- [x] **Swipeable activity dashboard** — the top of the home screen is three
      panels (Activity / Streak / Calendar) you can swipe between, showing the
      days any game was played, shaded by how many. Shipped in v1.9.0,
      deployed and verified live 23 Aug. `Feature` · ✅ Done
- [ ] **Leaderboard streaks** — the leaderboard reports every streak as 0; wire
      it to the real streak calculation. `Feature` · ⬜ Planned · `lib/friends.ts:340`
- [ ] **Accept a friend request from search results** — the add-friend search
      has an unfinished accept path. `Feature` · ⬜ Planned · `app/add-friend.tsx:134`

<!--
  Add new ideas here as they come up, e.g.:
  - [ ] **<title>** — <one line>. `Feature` · ⬜ Planned
-->
