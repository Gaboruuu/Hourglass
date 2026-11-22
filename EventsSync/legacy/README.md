# legacy/

The old event sources, kept for reference. **Unmaintained.**

| File | What |
|---|---|
| `sync.js` | Old orchestrator (ennead for GI/HSR/ZZZ, Fandom for WuWa) |
| `api/hoyoverse.js` | ennead.cc mihoyo API (calendar + notices) |
| `api/game8.js` | First single-game scraper prototype, replaced by `src/scraper/` |
| `services/eventService.js` | `fixEventDates`, `getEventType`, `batchCheckEvents`, `createEvent` |
| `services/codesService.js` | Unused redemption-code helper |
| `config/versionDates.js` | Hand-maintained version → date table |
| (deleted) `api/wuwa.js` | The Wuthering Waves Fandom wiki scraper, removed 2026-11-22 when WuWa went live on the new scraper (the wiki wasn't updated anymore) |
| `scheduler.js` | Local cron runner (needs `node-cron`, not installed) |
| `scripts/` | Manual probe scripts (`test-*.js`, `debug-api.js`), not a test suite |

**Still in use during Phase 1 (shadow mode):** the new `sync.js` loads `api/hoyoverse.js` as the old source for games that aren't `live` yet (GI, HSR, ZZZ). `legacy/sync.js` itself no longer runs. Once every game is live, nothing outside this folder may `require` anything inside it.
