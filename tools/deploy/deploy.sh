#!/usr/bin/env bash
# Deploy Daily Games Hub to an Unraid host over SSH.
#
#   tools/deploy/deploy.sh root@100.80.49.22
#
# rsyncs the compose file, Dockerfile, migrations, hooks and the built web app
# to /mnt/user/appdata/dailygame/app/, then runs `docker compose up -d --build`
# there. The live database at /mnt/user/appdata/dailygame/pb_data is NEVER
# touched. Build the web app first: pnpm build.
#
# If the container fails its health check after the build, the deploy rolls the
# container back to the image that was running before (captured up front) and
# exits non-zero. Rollback is image-level only — pb_data is never snapshotted or
# restored, so a failed deploy cannot harm the database.
set -euo pipefail

TARGET="${1:-}"
APP_DIR="/mnt/user/appdata/dailygame/app"
# Live database dir on the host; must stay owned by UID 8090 (the container's
# unprivileged pocketbase user — see server/Dockerfile). Override with
# PB_DATA_DIR if the host .env moves it.
DATA_DIR="${PB_DATA_DIR:-/mnt/user/appdata/dailygame/pb_data}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Compose project/service names (see docker-compose.yml). The build produces an
# image named "<project>-<service>"; the container is named "dailygame".
CONTAINER="dailygame"
IMAGE="dailygame-pocketbase"

if [[ -z "$TARGET" ]]; then
  echo "usage: $0 <ssh-target>   e.g. root@100.80.49.22" >&2
  exit 2
fi

# Guard: refuse to deploy an unbuilt web app.
PB_PUBLIC="$REPO/server/pb_public"
if [[ ! -f "$PB_PUBLIC/index.html" ]]; then
  echo "error: server/pb_public/index.html is missing — run 'pnpm build' first." >&2
  exit 1
fi

# Guard: refuse to deploy a stale build. `pnpm build` exports to dist/ and then
# copies it to server/pb_public, so pb_public should be at least as new as both
# dist/ and any source file. If dist/ or a source file is newer than the built
# bundle, the export never ran (or ran against older code) — bail rather than
# ship yesterday's UI.
STALE=""
if [[ -f "$REPO/dist/index.html" && "$REPO/dist/index.html" -nt "$PB_PUBLIC/index.html" ]]; then
  STALE="dist/ is newer than server/pb_public/"
else
  # Any tracked source file newer than the built bundle means the build is stale.
  for src in app components lib hooks contexts types app.config.ts package.json; do
    [[ -e "$REPO/$src" ]] || continue
    if [[ -n "$(find "$REPO/$src" -type f -newer "$PB_PUBLIC/index.html" -print -quit 2>/dev/null)" ]]; then
      STALE="$src has changes newer than the built bundle"
      break
    fi
  done
fi
if [[ -n "$STALE" ]]; then
  echo "error: build looks stale ($STALE) — run 'pnpm build' first." >&2
  exit 1
fi

echo "→ deploying $REPO to $TARGET:$APP_DIR"
ssh -o BatchMode=yes "$TARGET" "mkdir -p '$APP_DIR/server'"

# Compose file + Dockerfile (context is ./server; .dockerignore keeps it lean).
rsync -az --delete-excluded "$REPO/docker-compose.yml" "$TARGET:$APP_DIR/docker-compose.yml"
rsync -az "$REPO/server/Dockerfile" "$REPO/server/.dockerignore" "$TARGET:$APP_DIR/server/"

# Per-directory --delete so removed migrations/hooks/assets disappear on the
# host too, without ever naming the sibling pb_data mount.
for dir in pb_migrations pb_hooks pb_public; do
  rsync -az --delete "$REPO/server/$dir/" "$TARGET:$APP_DIR/server/$dir/"
done

# Capture the image the container is currently running as "last known good",
# BEFORE the build replaces it. Empty on a first-ever deploy (no container yet).
echo "→ ensuring pb_data is owned by the container user (UID 8090)"
# The container runs unprivileged; the bind-mounted database dir must be
# writable by its fixed UID. Idempotent — file contents are never touched.
ssh -o BatchMode=yes "$TARGET" "mkdir -p '$DATA_DIR' && chown -R 8090:8090 '$DATA_DIR'"

echo "→ recording current image for rollback"
GOOD_IMAGE="$(ssh -o BatchMode=yes "$TARGET" "docker inspect --format '{{.Image}}' '$CONTAINER' 2>/dev/null || true")"
GOOD_IMAGE="${GOOD_IMAGE//[$'\r\n']/}"
if [[ -n "$GOOD_IMAGE" ]]; then
  echo "  last known good: $GOOD_IMAGE"
else
  echo "  no running container yet — rollback will be unavailable"
fi

echo "→ building and starting the container"
# Migrations and hooks are bind-mounted, so `up` alone won't apply changed ones
# when the image is unchanged — restart to guarantee they take effect. The
# web app (pb_public) is served from its mount either way. Brief downtime only.
ssh -o BatchMode=yes "$TARGET" "cd '$APP_DIR' && docker compose up -d --build && docker restart '$CONTAINER' >/dev/null"

echo "→ waiting for health"
# Poll the container's own health endpoint. Exit 0 if it comes up, non-zero if
# it never does — the non-zero path below triggers a rollback.
if ssh -o BatchMode=yes "$TARGET" "
  for i in \$(seq 1 30); do
    if docker exec '$CONTAINER' wget -q --spider http://127.0.0.1:8090/api/health 2>/dev/null; then
      echo 'healthy'; exit 0
    fi
    sleep 2
  done
  echo 'did not become healthy in time'; docker logs --tail 30 '$CONTAINER'; exit 1
"; then
  echo "✓ deployed"
  exit 0
fi

# --- Health check failed: roll back to the last known good image ------------
echo "✗ new build is unhealthy — rolling back" >&2

if [[ -z "$GOOD_IMAGE" ]]; then
  echo "error: no previous image to roll back to (first deploy?). Leaving the" >&2
  echo "       failed container up for inspection; pb_data is untouched." >&2
  exit 1
fi

# Re-tag the known-good image under the compose image name and bring the
# container back up from it WITHOUT rebuilding, then restart to re-apply the
# bind-mounted hooks/migrations. pb_data is never touched here.
if ssh -o BatchMode=yes "$TARGET" "
  set -e
  cd '$APP_DIR'
  docker tag '$GOOD_IMAGE' '$IMAGE':latest
  docker compose up -d --no-build
  docker restart '$CONTAINER' >/dev/null
  for i in \$(seq 1 30); do
    if docker exec '$CONTAINER' wget -q --spider http://127.0.0.1:8090/api/health 2>/dev/null; then
      echo 'rolled back and healthy'; exit 0
    fi
    sleep 2
  done
  echo 'rollback did not become healthy'; docker logs --tail 30 '$CONTAINER'; exit 1
"; then
  echo "✓ rolled back to the previous image — deploy aborted (investigate the build)" >&2
  exit 1
fi

# Rollback itself failed — make it loud. The service may be down; manual action
# is needed. pb_data is still untouched.
echo "!! ROLLBACK FAILED — $CONTAINER may be DOWN. Manual intervention required." >&2
echo "   Last known good image: $GOOD_IMAGE (pb_data was not modified)." >&2
exit 2
