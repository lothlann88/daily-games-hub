/// <reference path="../pb_data/types.d.ts" />

// Per-IP rate limits, on by default so the public tunnel's login page is
// protected from day one. Auth attempts are throttled hard (5 per 3s per IP
// still allows a household behind one NAT to sign in together, while making
// credential stuffing impractical); batch and global limits are generous
// ceilings that normal app use never approaches.
migrate(
  (app) => {
    const settings = app.settings()
    settings.rateLimits.enabled = true
    settings.rateLimits.rules = [
      { label: '*:auth', maxRequests: 5, duration: 3 },
      { label: '/api/batch', maxRequests: 5, duration: 1 },
      { label: '/api/', maxRequests: 300, duration: 10 },
    ]
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.rateLimits.enabled = false
    settings.rateLimits.rules = []
    app.save(settings)
  },
)
