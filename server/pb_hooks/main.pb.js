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
