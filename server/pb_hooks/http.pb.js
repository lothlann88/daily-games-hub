/// <reference path="../pb_data/types.d.ts" />

// HTTP-level hardening, applied to every route. Two concerns:
//
// 1. Superuser backstop: the Cloudflare Tunnel publishes the whole origin and
//    the only control on the superuser surface is an out-of-repo Access
//    policy. That policy failed once already — until 2026-08-21 it pointed at
//    a mistyped hostname and the superuser AUTH API was open to the internet.
//    Requests that arrived via the tunnel carry CF-Connecting-IP (Cloudflare
//    always sets it and overwrites any client-sent value); tailnet/host
//    requests don't. So: any _superusers API request carrying that header gets
//    a 404, keeping superuser auth reachable only off-tunnel. In-repo
//    backstop, not a replacement for the Access policy.
//
// 2. Security headers: PocketBase sets none on the SPA or API responses.
//    nosniff and DENY are safe everywhere (nothing frames this app, including
//    /_/). HSTS only makes sense on the HTTPS path, i.e. via the tunnel.
//    Deliberately no CSP this pass — a wrong one breaks the app worse than
//    its absence.
//
// JSVM note: handlers run in isolated contexts — everything used here is
// inlined; nothing may reference module scope.
routerUse((e) => {
  const viaTunnel = e.request.header.get('CF-Connecting-IP') !== ''
  const path = (e.request.url && e.request.url.path) || ''

  if (viaTunnel && path.indexOf('/api/collections/_superusers/') === 0) {
    throw new NotFoundError()
  }

  const headers = e.response.header()
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  if (viaTunnel) {
    headers.set('Strict-Transport-Security', 'max-age=31536000')
  }

  e.next()
})
