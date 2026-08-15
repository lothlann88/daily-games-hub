/// <reference path="../pb_data/types.d.ts" />

// Multi-category membership (json array of category names, including the
// primary held in `category`). Empty/absent means the game is only in its
// primary category.
migrate(
  (app) => {
    const games = app.findCollectionByNameOrId('games')
    games.fields.add(new JSONField({ name: 'categories', maxSize: 2000 }))
    app.save(games)
  },
  (app) => {
    const games = app.findCollectionByNameOrId('games')
    games.fields.removeByName('categories')
    app.save(games)
  },
)
