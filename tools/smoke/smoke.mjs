// Browser smoke: the one happy path, driven in the BUILT app at phone
// viewport against a throwaway PocketBase with the real migrations and hooks.
//
//   sign up with an invite code → onboarding → dashboard renders →
//   log a play → the score is stored and the play history follows.
//
// One-off setup: `npm install` in this directory (Playwright's Chromium is
// shared with grey-tide's rigs and is usually already present; otherwise
// `npx playwright install chromium --only-shell`).
//
// Fails on any console error; screenshots land in tools/smoke/shots/. The
// exit code carries the verdict — a rig that always exits 0 reads as green to
// anything scripting it.
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

import { REPO, assertFreshBuild, autoCleanup, waitForHealth } from './rig.mjs'

assertFreshBuild()

const PORT = 8093 // scratch port; grey-tide's rigs hold 8092/8098/9101/9102
const BASE = `http://127.0.0.1:${PORT}`
const PB = join(REPO, 'server/.dev/pocketbase')
const SUPERUSER = ['smoke-admin@test.local', 'smokeadminpass123']

const dataDir = mkdtempSync(join(tmpdir(), 'dgh-pb-smoke-'))
const args = [
  `--dir=${dataDir}`,
  `--migrationsDir=${join(REPO, 'server/pb_migrations')}`,
  `--hooksDir=${join(REPO, 'server/pb_hooks')}`,
  `--publicDir=${join(REPO, 'server/pb_public')}`,
]
execFileSync(PB, ['superuser', 'upsert', ...SUPERUSER, ...args.slice(0, 3)], { stdio: 'pipe' })
const proc = spawn(PB, ['serve', `--http=127.0.0.1:${PORT}`, ...args], { stdio: 'pipe' })
autoCleanup(proc, dataDir)
await waitForHealth(BASE)

// Seed through the real API: a superuser makes an invite, the smoke user
// signs up through the real endpoint — the same path a person takes.
const su = await (
  await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: SUPERUSER[0], password: SUPERUSER[1] }),
  })
).json()
const inviteRes = await fetch(`${BASE}/api/collections/invites/records`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: su.token },
  body: JSON.stringify({ code: 'SMOKECODE123', label: 'smoke', max_uses: 2, active: true }),
})
if (!inviteRes.ok) {
  console.error('SETUP FAILED: could not create invite:', await inviteRes.text())
  process.exit(1)
}

const errors = []
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
// React #418/#423 are hydration-mismatch warnings from the Expo static export
// (server HTML vs first client render) — inherent to the output-mode, not a
// defect in our code. Everything else is a real console error and fails the run.
const isHydrationNoise = (t) => /Minified React error #(418|423)/.test(t)
// Game logos are fetched from Google's favicon service; a miss is an external
// 404 for a placeholder image, not a fault in this app. Scoped narrowly — a
// blanket 404 filter once hid a real defect for weeks (playbook §4).
const isLogoMiss = (t) =>
  /Failed to load resource: the server responded with a status of 404/.test(t)
page.on('console', (msg) => {
  const t = msg.text()
  if (msg.type() === 'error' && !isHydrationNoise(t) && !isLogoMiss(t)) errors.push(t)
})
page.on('pageerror', (err) => {
  if (!isHydrationNoise(String(err))) errors.push(String(err))
})
// Suppress the What's-new modal — an unseeded last-seen key means it
// intercepts every click (a rig gotcha the playbook records as biting twice).
await page.addInitScript(() => localStorage.setItem('lastSeenVersion', '99.0.0'))
mkdirSync(new URL('./shots', import.meta.url), { recursive: true })
const shot = (name) =>
  page.screenshot({ path: fileURLToPath(new URL(`./shots/${name}.png`, import.meta.url)), fullPage: true })

let failed = false
try {
  // ── reach sign-up the way a person does ──────────────────────────────────
  // The auth guard bounces an unauthenticated /auth/signup straight to
  // /auth/login, so start there and follow the link, as a real visitor would.
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 })
  await page.getByText('New here? Create an account', { exact: true }).click({ timeout: 15000 })
  await page.waitForURL('**/auth/signup', { timeout: 15000 })
  await page.getByPlaceholder('you@example.com').fill('smoke@test.local', { timeout: 10000 })
  await page.getByPlaceholder('At least 8 characters').fill('smokepass123')
  await page.getByPlaceholder('Type it again').fill('smokepass123')
  await page.getByPlaceholder('e.g. 7F3K2QB9XA4M').fill('smoke-code-123') // lowercase+hyphens on purpose
  await shot('1-signup')
  await page.getByText('Create account', { exact: true }).click({ timeout: 10000 })

  // ── onboarding ───────────────────────────────────────────────────────────
  await page.waitForURL('**/onboarding', { timeout: 20000 })
  await page.getByPlaceholder('Enter your name').fill('Smokey', { timeout: 10000 })
  await page.getByPlaceholder('username (3-20 characters)').fill('smokey')
  await shot('2-onboarding')
  await page.getByText('Get Started', { exact: true }).click({ timeout: 10000 })

  // ── dashboard renders ────────────────────────────────────────────────────
  await page.waitForSelector('text=Ten weeks of play', { timeout: 20000 })
  await page.waitForSelector('text=The Daily', { timeout: 10000 })
  await shot('3-dashboard')

  // ── log a play ───────────────────────────────────────────────────────────
  await page.getByText('Wordle', { exact: true }).first().click({ timeout: 10000 })
  await page.waitForSelector('text=LOG TODAY', { timeout: 15000 })
  const logButton = page.getByText('Log it', { exact: true })
  await logButton.click({ timeout: 10000 })
  // The same button relabels to "✓ Logged" — wait on it exactly, not on a
  // substring ("Nothing logged this month" would match a loose selector).
  await page.getByText('✓ Logged', { exact: true }).waitFor({ timeout: 10000 })
  await shot('4-logged')

  // ── the write really landed: score stored, play history follows ──────────
  const stored = await page.evaluate(() => ({
    scores: JSON.parse(localStorage.getItem('scores') || '[]').length,
    wordleHistory: (JSON.parse(localStorage.getItem('games') || '[]').find((g) => g.id === 'wordle')
      ?.playHistory ?? []).length,
  }))
  if (stored.scores < 1 || stored.wordleHistory < 1) {
    throw new Error(`play not persisted: ${JSON.stringify(stored)}`)
  }
} catch (err) {
  failed = true
  await shot('failure')
  console.error('DRIVE FAILED:', err.message)
}

await browser.close()
proc.kill()
await new Promise((r) => setTimeout(r, 500))
rmSync(dataDir, { recursive: true, force: true })

if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
if (failed) process.exit(1)
console.log('SMOKE OK — screenshots in tools/smoke/shots')
