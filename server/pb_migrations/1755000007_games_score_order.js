/// <reference path="../pb_data/types.d.ts" />

// Per-game score direction: "higher" | "lower" | "none". Empty means the
// record predates the field and is treated as "higher" by the client.
migrate(
  (app) => {
    const games = app.findCollectionByNameOrId('games')
    games.fields.add(new TextField({ name: 'score_order', max: 16 }))
    app.save(games)
  },
  (app) => {
    const games = app.findCollectionByNameOrId('games')
    games.fields.removeByName('score_order')
    app.save(games)
  },
)
