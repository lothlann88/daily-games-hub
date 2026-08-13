/// <reference path="../pb_data/types.d.ts" />

// Client-set last-write timestamp (epoch ms) for per-record LWW merge in
// lib/sync.ts / lib/merge.ts. 0/absent means the record predates the field;
// the client falls back to the server `updated` autodate. Only `games` needs
// it — scores are append-only and merge by union.
migrate(
  (app) => {
    const games = app.findCollectionByNameOrId('games')
    games.fields.add(new NumberField({ name: 'updated_at', onlyInt: true, min: 0 }))
    app.save(games)
  },
  (app) => {
    const games = app.findCollectionByNameOrId('games')
    games.fields.removeByName('updated_at')
    app.save(games)
  },
)
