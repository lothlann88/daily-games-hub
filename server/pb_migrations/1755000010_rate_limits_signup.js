/// <reference path="../pb_data/types.d.ts" />

// Rate limits for the sign-up and username-lookup endpoints.
//
// The existing *:auth rule does NOT cover these: it is a tag matching auth
// endpoints (auth-with-password, refresh, OAuth2), not custom routes and not
// record creates. Without the rules below both would fall to the generic
// '/api/' rule at 300 requests per 10s per IP — enough to brute-force an
// invite code in minutes.
//
// 3 sign-ups per 5 minutes per IP caps guessing at roughly 864 attempts a day,
// which is hopeless against a 12-character code, while still letting a
// household behind one NAT create a couple of accounts.
//
// audience is left at the default '' (guests AND authenticated). Scoping the
// sign-up rule to '@guest' would let a signed-in attacker fall through to the
// 300/10s rule and grind codes from there.
//
// Note these labels do not protect against a create smuggled through
// /api/batch — batch dispatches via its own handler map. That hole is closed
// by users.createRule staying null, which is why it must stay null. Do not
// "simplify" sign-up by opening it.
//
// settings.rateLimits.rules is an array, so this rewrites the whole list; the
// three existing rules are restated verbatim from 1755000004_rate_limits.js.
migrate(
  (app) => {
    const settings = app.settings()
    settings.rateLimits.enabled = true
    settings.rateLimits.rules = [
      { label: 'POST /api/dgh/signup', maxRequests: 3, duration: 300 },
      { label: 'GET /api/dgh/users/lookup', maxRequests: 20, duration: 60 },
      { label: '*:auth', maxRequests: 5, duration: 3 },
      { label: '/api/batch', maxRequests: 5, duration: 1 },
      { label: '/api/', maxRequests: 300, duration: 10 },
    ]
    app.save(settings)
  },
  (app) => {
    // Restore the previous rules explicitly. Emptying the array would leave
    // the instance with no auth throttling at all.
    const settings = app.settings()
    settings.rateLimits.rules = [
      { label: '*:auth', maxRequests: 5, duration: 3 },
      { label: '/api/batch', maxRequests: 5, duration: 1 },
      { label: '/api/', maxRequests: 300, duration: 10 },
    ]
    app.save(settings)
  },
)
