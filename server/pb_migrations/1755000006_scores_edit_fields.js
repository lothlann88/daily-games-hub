/// <reference path="../pb_data/types.d.ts" />

// Score corrections: `updated_at` (epoch ms) is the LWW clock for edited
// scores, mirroring games.updated_at; `deleted` is a soft-delete tombstone —
// scores must never be hard-deleted while two devices merge by union, or the
// other device's copy would resurrect them. Tombstoned plays are subtracted
// from play history during merge (lib/merge.ts).
migrate(
  (app) => {
    const scores = app.findCollectionByNameOrId('scores')
    scores.fields.add(new NumberField({ name: 'updated_at', onlyInt: true, min: 0 }))
    scores.fields.add(new BoolField({ name: 'deleted' }))
    app.save(scores)
  },
  (app) => {
    const scores = app.findCollectionByNameOrId('scores')
    scores.fields.removeByName('updated_at')
    scores.fields.removeByName('deleted')
    app.save(scores)
  },
)
