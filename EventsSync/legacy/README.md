# legacy/

The old event sources, kept **for reference only**. Unmaintained, and **not runnable anymore**: their
dependencies (`undici`, `axios`) were removed from `package.json`, and nothing outside this folder
requires anything inside it.

Every game moved to the scraper in `src/scraper/` on 2026-11-22 (Phase 1, `docs/plans/phase-1-event-scraper.md`).

| File | What it was |
|---|---|
| `sync.js` | Old orchestrator (ennead for GI/HSR/ZZZ) |
| `api/hoyoverse.js` | ennead.cc mihoyo API (calendar + notices). Its calendar dates are cut to the UTC date, so they were often a day off |
| `services/eventService.js` | `fixEventDates`, `getEventType`, `batchCheckEvents`, `createEvent` |
| `services/codesService.js` | Unused redemption-code helper |
| `config/versionDates.js` | Hand-maintained version → date table |
| `scheduler.js` | Local cron runner (needed `node-cron`, never installed) |

Deleted on the way: `api/wuwa.js` (Fandom wiki scraper), `api/game8.js` (first scraper prototype), `scripts/` (manual probe scripts).
