// Shared guards for the browser rigs, copied from grey-tide's rig.mjs — the
// reference implementation the App Playbook was distilled from. Three
// non-negotiables: abort on a stale build, deadline every wait, reap what was
// spawned however the process exits.
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO = fileURLToPath(new URL('../..', import.meta.url))

// The rigs drive whatever sits in server/pb_public — the LAST build. Running
// them after editing the app without rebuilding exercises stale code, and a
// green result then means nothing. Abort loudly.
export function assertFreshBuild() {
  const built = join(REPO, 'server/pb_public/index.html')
  if (!existsSync(built)) {
    console.error('stale build: server/pb_public is missing — run `corepack pnpm build` first.')
    process.exit(1)
  }
  const builtAt = statSync(built).mtimeMs
  const roots = [
    'app',
    'components',
    'contexts',
    'hooks',
    'lib',
    'constants',
    'public',
    'package.json',
    'app.config.ts',
  ]
  for (const rel of roots) {
    const root = join(REPO, rel)
    if (!existsSync(root)) continue
    const files = statSync(root).isDirectory()
      ? readdirSync(root, { withFileTypes: true, recursive: true })
          .filter((e) => e.isFile())
          .map((e) => join(e.parentPath, e.name))
      : [root]
    for (const file of files) {
      if (statSync(file).mtimeMs > builtAt) {
        console.error(
          `stale build: ${file} is newer than the last build — run \`corepack pnpm build\` first.`,
        )
        process.exit(1)
      }
    }
  }
}

// Poll /api/health with a deadline — a bare for(;;) hangs forever when the
// port is already occupied or the server dies during startup.
export async function waitForHealth(base, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      console.error(`PocketBase at ${base} did not become healthy within ${timeoutMs / 1000}s`)
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 200))
  }
}

// Kill the spawned server and remove its temp dir however the process exits —
// a throw mid-run must not orphan a PocketBase holding the rig's fixed port.
export function autoCleanup(proc, dataDir) {
  process.on('exit', () => {
    try {
      proc.kill()
    } catch {
      /* already gone */
    }
    try {
      rmSync(dataDir, { recursive: true, force: true })
    } catch {
      /* best effort */
    }
  })
}
