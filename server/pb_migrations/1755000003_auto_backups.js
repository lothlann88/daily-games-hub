/// <reference path="../pb_data/types.d.ts" />

// Scheduled database backups: daily at 03:00, keeping a week. Snapshots land
// in pb_data/backups and are restorable from the admin dashboard
// (Settings → Backups). On by default so a fresh Unraid install is protected
// from day one. Note backups live inside pb_data, so that folder still needs
// an external copy for off-machine safety.
migrate(
  (app) => {
    const settings = app.settings()
    settings.backups.cron = '0 3 * * *'
    settings.backups.cronMaxKeep = 7
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.backups.cron = ''
    settings.backups.cronMaxKeep = 0
    app.save(settings)
  },
)
