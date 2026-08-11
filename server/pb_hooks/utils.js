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

module.exports = { ensureFriendship }
