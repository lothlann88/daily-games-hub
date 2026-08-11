/// <reference path="../pb_data/types.d.ts" />

// Private two-person instance: registration is closed. Accounts are created by
// the administrator in the dashboard (reached over Tailscale/LAN). Unlike a
// fully-private instance, any signed-in user may list/view other users — the
// friends system needs profile search — but PocketBase hides email by default
// (emailVisibility=false) so only name/username/avatar are exposed. OAuth2 is
// pinned off because PocketBase auto-creates users on OAuth2 sign-in, which
// would bypass the closed createRule.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new Field({
        name: 'username',
        type: 'text',
        max: 20,
        pattern: '^[a-z0-9_]{3,20}$',
      }),
    )
    users.fields.add(new Field({ name: 'avatar_url', type: 'text', max: 500 }))
    users.fields.add(new Field({ name: 'is_private', type: 'bool' }))
    users.addIndex('idx_users_username', true, 'username', "username != ''")
    users.listRule = '@request.auth.id != ""'
    users.viewRule = '@request.auth.id != ""'
    users.createRule = null
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = null
    users.oauth2.enabled = false
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('username')
    users.fields.removeByName('avatar_url')
    users.fields.removeByName('is_private')
    users.removeIndex('idx_users_username')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = ''
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)
