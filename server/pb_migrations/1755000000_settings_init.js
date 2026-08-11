/// <reference path="../pb_data/types.d.ts" />

// Instance settings: app identity, transactional batch API (used by the sync
// layer's upsert), and trusted proxy headers for running behind Cloudflare
// Tunnel. cloudflared sets CF-Connecting-IP to the real client IP, so trust it
// first for correct per-IP rate limiting; keep X-Forwarded-For as a fallback.
migrate(
  (app) => {
    const settings = app.settings()
    settings.meta.appName = 'Daily Games Hub'
    settings.batch.enabled = true
    settings.batch.maxRequests = 200
    settings.batch.timeout = 10
    settings.trustedProxy.headers = ['CF-Connecting-IP', 'X-Forwarded-For']
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.batch.enabled = false
    settings.trustedProxy.headers = []
    app.save(settings)
  },
)
