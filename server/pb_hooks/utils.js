/// <reference path="../pb_data/types.d.ts" />

// Shared helpers for pb_hooks. PocketBase's JSVM runs each handler in an
// isolated context, so this module must be require()d INSIDE handler bodies
// (`require(`${__hooks}/utils.js`)`) — module-scope references in main.pb.js
// fail silently.

// Create one friendships row (a → b) unless it already exists. app.save()
// bypasses collection rules by design, mirroring the old SECURITY DEFINER RPC.
function ensureFriendship(app, userId, friendId) {
  try {
    app.findFirstRecordByFilter('friendships', 'user = {:user} && friend = {:friend}', {
      user: userId,
      friend: friendId,
    })
    return // already exists
  } catch (_) {
    // not found — create it
  }
  const collection = app.findCollectionByNameOrId('friendships')
  const record = new Record(collection)
  record.set('user', userId)
  record.set('friend', friendId)
  app.save(record)
}

// Canonical form of an invite code: upper-case, alphanumeric only, so a code
// can be written down with spaces or hyphens and still match.
//
// lib/invite.ts holds a copy of this for the client. The duplication is
// unavoidable — the JSVM cannot import TypeScript — so if you change one,
// change the other. lib/__tests__/invite.test.ts pins the contract.
function normaliseInviteCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

// Create an account against an invite code, consuming one use of it.
//
// The whole thing runs in one transaction: an account created without the
// matching increment would let a single-use code be reused, and an increment
// without an account would burn it for nothing.
function createInvitedUser(app, email, password, code) {
  app.runInTransaction((txApp) => {
    // One filter carries every validity condition, so a wrong code, an
    // inactive one, an expired one and an exhausted one are indistinguishable
    // from outside. Nothing about why it failed leaks back to the caller.
    let invite = null
    try {
      invite = txApp.findFirstRecordByFilter(
        'invites',
        'code = {:code} && active = true && used_count < max_uses && (expires_at = "" || expires_at > @now)',
        { code },
      )
    } catch (_) {
      // not found — fall through to the same error as every other failure
    }
    if (!invite) {
      throw new BadRequestError('That invite code is not valid.')
    }

    // Reachable only with a valid code, so this is not an open enumeration
    // oracle; being able to say "you already have an account" is worth more
    // than hiding it from someone who already holds an invite.
    let existing = null
    try {
      existing = txApp.findFirstRecordByFilter('users', 'email = {:email}', { email })
    } catch (_) {
      // no account with that address, which is what we want
    }
    if (existing) {
      throw new BadRequestError('There is already an account with that email address.')
    }

    const user = new Record(txApp.findCollectionByNameOrId('users'))
    user.setEmail(email)
    user.setPassword(password)
    // No SMTP on this instance, so nobody could ever verify. Never pair this
    // with an authRule requiring verified accounts — it would lock everyone out.
    user.setVerified(false)
    user.setEmailVisibility(false)
    // name stays empty deliberately: lib/sync.ts decides whether to skip
    // onboarding by testing the cloud profile's name, so an empty one is what
    // routes a new account into the onboarding screen.
    user.set('name', '')
    // Empty username is safe — idx_users_username is a partial unique index
    // over `username != ''`, so any number of accounts may have none yet.
    user.set('username', '')
    user.set('is_private', true)
    txApp.save(user)

    invite.set('used_count', invite.getInt('used_count') + 1)
    invite.set('last_used_at', new DateTime())
    invite.set('last_used_by', user.id)
    txApp.save(invite)
  })
}

module.exports = { ensureFriendship, normaliseInviteCode, createInvitedUser }
