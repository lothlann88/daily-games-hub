/// <reference path="../pb_data/types.d.ts" />

// Trust only CF-Connecting-IP for the client IP. X-Forwarded-For was listed as
// a fallback, but PocketBase trusts a configured header by presence alone — a
// client reaching the port directly (tailnet/host; public traffic can't, and
// Cloudflare overwrites CF-Connecting-IP on tunnel traffic) could send its own
// X-Forwarded-For and adopt any per-IP rate-limit identity. Dropping it means
// direct requests fall back to the real socket IP.
//
// Closes audit finding L8.
migrate(
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = ['CF-Connecting-IP']
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = ['CF-Connecting-IP', 'X-Forwarded-For']
    app.save(settings)
  },
)
