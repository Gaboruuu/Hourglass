# legacy/

The old event sources, kept for reference. **Unmaintained.**

| File | What |
|---|---|
| `sync.js` | Old orchestrator (ennead for GI/HSR/ZZZ, Fandom for WuWa) |
| `api/hoyoverse.js` | ennead.cc mihoyo API (calendar + notices) |
| `api/wuwa.js` | Wuthering Waves Fandom wiki scraper (to be deleted, the wiki isn't updated) |
| `api/game8.js` | First single-game scraper prototype, replaced by `src/scraper/` |
| `services/eventService.js` | `fixEventDates`, `getEventType`, `batchCheckEvents`, `createEvent` |
| `services/codesService.js` | Unused redemption-code helper |
| `config/versionDates.js` | Hand-maintained version → date table |
| `scheduler.js` | Local cron runner (needs `node-cron`, not installed) |
| `scripts/` | Manual probe scripts (`test-*.js`, `debug-api.js`), not a test suite |

**Still in use during Phase 1:** `npm run sync` runs `legacy/sync.js` until the new sync (step 1e) replaces it, so the daily GitHub Actions run keeps working. After that, nothing outside this folder may `require` anything inside it.
