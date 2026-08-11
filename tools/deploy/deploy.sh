#!/usr/bin/env bash
# Deploy Daily Games Hub to an Unraid host over SSH.
#
#   tools/deploy/deploy.sh root@100.80.49.22
#
# rsyncs the compose file, Dockerfile, migrations, hooks and the built web app
# to /mnt/user/appdata/dailygame/app/, then runs `docker compose up -d --build`
# there. The live database at /mnt/user/appdata/dailygame/pb_data is NEVER
# touched. Build the web app first: pnpm build.
set -euo pipefail

TARGET="${1:-}"
APP_DIR="/mnt/user/appdata/dailygame/app"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "$TARGET" ]]; then
  echo "usage: $0 <ssh-target>   e.g. root@100.80.49.22" >&2
  exit 2
fi

# Guard: refuse to deploy an unbuilt (or stale) web app.
if [[ ! -f "$REPO/server/pb_public/index.html" ]]; then
  echo "error: server/pb_public/index.html is missing — run 'pnpm build' first." >&2
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

echo "→ building and starting the container"
# Migrations and hooks are bind-mounted, so `up` alone won't apply changed ones
# when the image is unchanged — restart to guarantee they take effect. The
# web app (pb_public) is served from its mount either way. Brief downtime only.
ssh -o BatchMode=yes "$TARGET" "cd '$APP_DIR' && docker compose up -d --build && docker restart dailygame >/dev/null"

echo "→ waiting for health"
ssh -o BatchMode=yes "$TARGET" "
  for i in \$(seq 1 30); do
    if docker exec dailygame wget -q --spider http://127.0.0.1:8090/api/health 2>/dev/null; then
      echo 'healthy'; exit 0
    fi
    sleep 2
  done
  echo 'did not become healthy in time'; docker logs --tail 30 dailygame; exit 1
"
echo "✓ deployed"
