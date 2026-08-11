/// <reference path="../pb_data/types.d.ts" />

// Daily Games Hub domain schema.
//
// games/scores: per-user copies keyed by a client-generated text id
// (client_id, e.g. "wordle"), unique per owner — the app's local-first store
// keeps using those ids and the sync layer maps them onto PocketBase records.
// scores.game_id deliberately references the game's client_id rather than a
// relation, because each player has their own copy of a game.
//
// Friend visibility (the head-to-head feature): list/view on games and scores
// allows the owner OR any friend of the owner. Repeated @collection.friendships
// references inside one rule share a single join, so both conditions apply to
// the same friendship row; friendships are stored bidirectionally (two rows),
// so direction never matters.
//
// friendships rows are only ever written by the pb_hooks accept/remove logic
// (create/update rules are null) so the two-row invariant cannot be broken by
// a client.

const FRIEND_READ_RULE =
  'owner = @request.auth.id || (@collection.friendships.user ?= owner && @collection.friendships.friend ?= @request.auth.id)'
const OWNER_CREATE_RULE = '@request.auth.id != "" && owner = @request.auth.id'
const OWNER_UPDATE_RULE =
  'owner = @request.auth.id && (@request.body.owner:isset = false || @request.body.owner = owner)'

const COMMON_FIELDS = [
  { name: 'created', type: 'autodate', onCreate: true },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId('users').id

    // friendships/friend_requests first: the games/scores rules reference
    // @collection.friendships, which must exist when those rules are compiled.
    app.save(
      new Collection({
        type: 'base',
        name: 'friendships',
        listRule: 'user = @request.auth.id || friend = @request.auth.id',
        viewRule: 'user = @request.auth.id || friend = @request.auth.id',
        createRule: null,
        updateRule: null,
        deleteRule: 'user = @request.auth.id || friend = @request.auth.id',
        fields: [
          { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
          { name: 'friend', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
          ...COMMON_FIELDS,
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_friendships_pair ON friendships (user, friend)',
        ],
      }),
    )

    app.save(
      new Collection({
        type: 'base',
        name: 'friend_requests',
        listRule: 'sender = @request.auth.id || receiver = @request.auth.id',
        viewRule: 'sender = @request.auth.id || receiver = @request.auth.id',
        createRule:
          '@request.auth.id != "" && sender = @request.auth.id && receiver != @request.auth.id && status = "pending"',
        updateRule: 'receiver = @request.auth.id',
        deleteRule: 'sender = @request.auth.id',
        fields: [
          { name: 'sender', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
          { name: 'receiver', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
          { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'accepted', 'rejected'] },
          ...COMMON_FIELDS,
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_friend_requests_pair ON friend_requests (sender, receiver)',
        ],
      }),
    )

    app.save(
      new Collection({
        type: 'base',
        name: 'games',
        listRule: FRIEND_READ_RULE,
        viewRule: FRIEND_READ_RULE,
        createRule: OWNER_CREATE_RULE,
        updateRule: OWNER_UPDATE_RULE,
        deleteRule: 'owner = @request.auth.id',
        fields: [
          { name: 'owner', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
          { name: 'client_id', type: 'text', required: true, max: 120 },
          { name: 'name', type: 'text', required: true, max: 200 },
          { name: 'url', type: 'text', max: 500 },
          { name: 'category', type: 'text', max: 80 },
          { name: 'logo_url', type: 'text', max: 500 },
          { name: 'icon', type: 'text', max: 20 },
          { name: 'is_favorite', type: 'bool' },
          { name: 'current_streak', type: 'number', onlyInt: true, min: 0 },
          { name: 'longest_streak', type: 'number', onlyInt: true, min: 0 },
          // Array of epoch-ms timestamps of days played.
          { name: 'play_history', type: 'json', maxSize: 200000 },
          { name: 'date_added', type: 'number', onlyInt: true, min: 0 },
          { name: 'notes', type: 'text', max: 5000 },
          { name: 'tags', type: 'json', maxSize: 5000 },
          ...COMMON_FIELDS,
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_games_owner_client ON games (owner, client_id)',
        ],
      }),
    )

    app.save(
      new Collection({
        type: 'base',
        name: 'scores',
        listRule: FRIEND_READ_RULE,
        viewRule: FRIEND_READ_RULE,
        createRule: OWNER_CREATE_RULE,
        updateRule: OWNER_UPDATE_RULE,
        deleteRule: 'owner = @request.auth.id',
        fields: [
          { name: 'owner', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
          { name: 'client_id', type: 'text', required: true, max: 120 },
          { name: 'game_id', type: 'text', required: true, max: 120 },
          // Optional: a play can be logged without a numeric score.
          { name: 'score', type: 'number' },
          { name: 'result', type: 'select', required: true, maxSelect: 1, values: ['win', 'loss', 'draw'] },
          { name: 'date_played', type: 'number', required: true, onlyInt: true, min: 0 },
          { name: 'notes', type: 'text', max: 2000 },
          ...COMMON_FIELDS,
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_scores_owner_client ON scores (owner, client_id)',
          'CREATE INDEX idx_scores_owner_game ON scores (owner, game_id)',
        ],
      }),
    )

  },
  (app) => {
    for (const name of ['friend_requests', 'friendships', 'scores', 'games']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
