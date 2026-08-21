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

> **Next up:** merge and deploy `fix/high-severity-web-flows` (v1.8.2), which
> ships the two high-severity fixes below, then verify in the live web app.

---

## Bugs & fixes

- [ ] ▶ **Merge & deploy v1.8.2, then verify live** — ships H1 + H2. After
      deploy: remove a friend, import a backup, add a game with a blank field,
      then sign out and back in as the other account. `High` · ▶ Next
- [x] **Superuser auth endpoint put behind Cloudflare Access** — Access
      application hostname was a typo (`dailygames` → `dailygame`); corrected
      and re-verified live. `High` · ✅ Done · H0
- [ ] **Clear local data on sign-out** — stops a second account on a shared
      browser inheriting and re-uploading the previous user's library.
      `High` · 🔷 On branch · H1
- [ ] **Replace web-broken `Alert.alert` flows with inline UI** — remove-friend
      confirm, data import, and add-game validation were no-ops on web.
      `High` · 🔷 On branch · H2
- [ ] **Enforce or remove `is_private`** — the field exists but no rule reads
      it, so it silently does nothing. `Medium` · ⬜ Planned · M3
- [ ] **Validate imported backups** — import writes objects verbatim (then
      syncs them up); validate against a `zod` schema first. `Medium` · ⬜ Planned · M4
- [ ] **Serialise storage writes** — a UI mutation during a sync write can
      interleave and lose data; route writes through one queue. `Medium` · ⬜ Planned · M5
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
- [ ] **Bump PocketBase 0.39.10 → 0.39.11** — update `PB_VERSION` + `PB_SHA256`
      in the Dockerfile. `Medium` · ⬜ Planned · M1
- [ ] **Harden the container** — non-root user, plus `mem_limit`, `pids_limit`
      and log-size caps. `Medium` · ⬜ Planned · M2
- [ ] **Deploy rollback & stronger freshness guard** — snapshot `pb_data`
      before migrations, tag last-known-good image, roll back on failed health
      check. `Medium` · ⬜ Planned · M8
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

- [ ] **Leaderboard streaks** — the leaderboard reports every streak as 0; wire
      it to the real streak calculation. `Feature` · ⬜ Planned · `lib/friends.ts:340`
- [ ] **Accept a friend request from search results** — the add-friend search
      has an unfinished accept path. `Feature` · ⬜ Planned · `app/add-friend.tsx:134`

<!--
  Add new ideas here as they come up, e.g.:
  - [ ] **<title>** — <one line>. `Feature` · ⬜ Planned
-->
