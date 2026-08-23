/// <reference path="../pb_data/types.d.ts" />

// Invite codes for self-serve sign-up.
//
// Every rule is null on purpose: this collection is superuser-only. No client
// may read it (a readable invite list would hand out the codes) and no client
// may write it. The sign-up hook reaches it through app.runInTransaction,
// which bypasses collection rules the same way ensureFriendship does.
//
// `code` is stored canonicalised — upper-case, alphanumeric only — so
// "abcd-efgh" typed by a person and "ABCDEFGH" are the same code. The hook
// normalises input the same way before looking it up.
//
// `active` has no default, so a freshly created row is inactive until the
// administrator ticks it. Creating a code and enabling it are deliberately two
// separate actions.
//
// Codes live here rather than in an env var so they can be revoked
// individually, capped by use count, given an expiry, and attributed after the
// fact — and so no secret ever enters the repository.

const COMMON_FIELDS = [
  { name: 'created', type: 'autodate', onCreate: true },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('users').id

    app.save(
      new Collection({
        type: 'base',
        name: 'invites',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'code',
            type: 'text',
            required: true,
            min: 8,
            max: 64,
            pattern: '^[A-Z0-9]{8,64}$',
          },
          { name: 'label', type: 'text', max: 100 },
          { name: 'max_uses', type: 'number', required: true, onlyInt: true, min: 1 },
          { name: 'used_count', type: 'number', onlyInt: true, min: 0 },
          { name: 'expires_at', type: 'date' },
          { name: 'active', type: 'bool' },
          { name: 'last_used_at', type: 'date' },
          {
            name: 'last_used_by',
            type: 'relation',
            collectionId: usersId,
            maxSelect: 1,
            // Not cascadeDelete: removing a user must not delete the audit row.
            cascadeDelete: false,
          },
          ...COMMON_FIELDS,
        ],
        indexes: ['CREATE UNIQUE INDEX idx_invites_code ON invites (code)'],
      }),
    )
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('invites'))
  },
)
