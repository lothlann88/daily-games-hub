/// <reference path="../pb_data/types.d.ts" />

// Stop the account list being browsable.
//
// Until now any signed-in user could list every user, which is how friend
// search worked. With self-serve sign-up that means a stranger can enumerate
// everyone, so discovery moves to GET /api/dgh/users/lookup, which needs an
// exact username.
//
// listRule and viewRule do different jobs here and must not be conflated:
//
//   listRule  — browsing. Self-only, which is the change that matters.
//   viewRule  — ALSO what `expand` resolves against. lib/friends.ts reads
//               friends' and requesters' profiles by expanding relations on
//               friendships/friend_requests, so if this rule is too tight the
//               Friends tab and the head-to-head silently go EMPTY — nothing
//               throws, the rows just vanish. Test expand after changing it.
//
// This is the last migration on purpose: `migrate down 1` reverts exactly this
// change and nothing else.
//
// On the shared-join behaviour (see the note in 1755000002_init_schema.js):
// repeated @collection.X references inside one rule share a single join, so
// the friendships clause means "one friendship row where user is this person
// and friend is me". Friendships are stored bidirectionally, so direction
// never matters. The friend_requests clause relies on the same sharing, with
// the two directions as alternatives on that one joined row.
const SELF = 'id = @request.auth.id'

const FRIEND =
  '(@collection.friendships.user ?= id && @collection.friendships.friend ?= @request.auth.id)'

const REQUEST_PARTY =
  '((@collection.friend_requests.sender ?= id && @collection.friend_requests.receiver ?= @request.auth.id)' +
  ' || (@collection.friend_requests.sender ?= @request.auth.id && @collection.friend_requests.receiver ?= id))'

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    users.listRule = SELF
    users.viewRule = `@request.auth.id != "" && (${SELF} || ${FRIEND} || ${REQUEST_PARTY})`

    // Re-asserted rather than assumed: sign-up goes only through
    // POST /api/dgh/signup, accounts are removed by the administrator, and
    // OAuth2 would auto-create users behind createRule's back.
    users.createRule = null
    users.deleteRule = null
    users.oauth2.enabled = false

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule = '@request.auth.id != ""'
    users.viewRule = '@request.auth.id != ""'
    app.save(users)
  },
)
