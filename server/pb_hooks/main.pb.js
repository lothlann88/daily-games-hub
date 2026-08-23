/// <reference path="../pb_data/types.d.ts" />

// Daily Games Hub server-side invariants. friendships is a bidirectional
// two-row model and its create/update rules are null, so the ONLY writers are
// these hooks — a half-failure on the client can never leave a one-directional
// friendship (which would silently break friend score visibility one way).

// --- 1. Accepting a friend request creates both friendship rows ------------
// Replaces the old Postgres accept_friend_request() RPC. The receiver flips
// status to "accepted"; sender/receiver are immutable and only a pending
// request may be resolved.
onRecordUpdateRequest((e) => {
  const original = e.record.original()

  if (
    e.record.getString('sender') !== original.getString('sender') ||
    e.record.getString('receiver') !== original.getString('receiver')
  ) {
    throw new BadRequestError('Friend request participants cannot be changed.')
  }

  const oldStatus = original.getString('status')
  const newStatus = e.record.getString('status')
  if (oldStatus !== 'pending' && newStatus !== oldStatus) {
    throw new BadRequestError('Only a pending friend request can be accepted or rejected.')
  }

  e.next()

  if (oldStatus === 'pending' && newStatus === 'accepted') {
    const { ensureFriendship } = require(`${__hooks}/utils.js`)
    const sender = e.record.getString('sender')
    const receiver = e.record.getString('receiver')
    ensureFriendship(e.app, sender, receiver)
    ensureFriendship(e.app, receiver, sender)
  }
}, 'friend_requests')

// --- 1b. Invite-gated sign-up ----------------------------------------------
// users.createRule stays null, so POST /api/collections/users/records is
// refused and so is a create smuggled through /api/batch (batch enforces
// collection rules but dispatches through its own handler map, which route
// rate limits do not cover). This endpoint is therefore the only way to make
// an account — and if this hook ever fails to load, sign-up simply stops
// working rather than falling open.
routerAdd('POST', '/api/dgh/signup', (e) => {
  const { normaliseInviteCode, createInvitedUser } = require(`${__hooks}/utils.js`)

  // Binding to a fixed shape is the field-injection defence: anything else in
  // the body (username, verified, emailVisibility, id) is simply never read.
  const body = new DynamicModel({
    email: '',
    password: '',
    passwordConfirm: '',
    code: '',
  })
  e.bindBody(body)

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const code = normaliseInviteCode(body.code)

  if (email.indexOf('@') < 1) {
    throw new BadRequestError('Please enter a valid email address.')
  }
  if (password.length < 8) {
    throw new BadRequestError('Please choose a password of at least 8 characters.')
  }
  if (password !== String(body.passwordConfirm || '')) {
    throw new BadRequestError('The two passwords do not match.')
  }
  if (!code) {
    throw new BadRequestError('Please enter your invite code.')
  }

  createInvitedUser(e.app, email, password, code)

  // No token in the response: the client signs in through the ordinary
  // authWithPassword path, so there is one sign-in route rather than two.
  return e.json(200, { ok: true })
})

// --- 1c. Look a person up by their exact username ---------------------------
// users.listRule is self-only, so nobody can browse the account list. This is
// the one way to find someone, and it needs their exact username.
//
// The response names its five fields explicitly rather than returning the
// record: a list response would leak any field added to users later, which is
// the whole reason this is an endpoint rather than a collection rule.
routerAdd(
  'GET',
  '/api/dgh/users/lookup',
  (e) => {
    const raw = String(e.requestInfo().query.username || '')
      .trim()
      .toLowerCase()
    // Same shape the username field itself enforces.
    if (!/^[a-z0-9_]{3,20}$/.test(raw)) {
      throw new BadRequestError('That is not a valid username.')
    }

    let user = null
    try {
      user = e.app.findFirstRecordByFilter('users', 'username = {:u}', { u: raw })
    } catch (_) {
      // no such username
    }
    if (!user) {
      throw new NotFoundError('No account with that username.')
    }

    return e.json(200, {
      id: user.id,
      name: user.getString('name'),
      username: user.getString('username'),
      avatar_url: user.getString('avatar_url'),
      is_private: user.getBool('is_private'),
    })
  },
  $apis.requireAuth('users'),
)

// --- 2. Removing a friendship removes its mirror row ------------------------
// Replaces the old remove_friendship() RPC: the client deletes one row and the
// (friend, user) mirror goes with it. app.delete() here does not re-trigger
// this request-level hook, so no recursion. Also clears the old accepted
// request row so the pair can friend each other again later.
onRecordDeleteRequest((e) => {
  const user = e.record.getString('user')
  const friend = e.record.getString('friend')

  e.next()

  try {
    const mirror = e.app.findFirstRecordByFilter('friendships', 'user = {:user} && friend = {:friend}', {
      user: friend,
      friend: user,
    })
    e.app.delete(mirror)
  } catch (_) {
    // mirror already gone
  }

  try {
    const request = e.app.findFirstRecordByFilter(
      'friend_requests',
      '((sender = {:a} && receiver = {:b}) || (sender = {:b} && receiver = {:a})) && status = "accepted"',
      { a: user, b: friend },
    )
    e.app.delete(request)
  } catch (_) {
    // no accepted request row
  }
}, 'friendships')
