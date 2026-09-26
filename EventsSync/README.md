# EventsSync

The automated data pipeline for Hourglass. Every day it collects the latest in-game events from several sources, cleans them up, and imports the new ones into the backend. Nobody needs to enter events by hand.

**Stack:** Node.js, cheerio, GitHub Actions (scheduled daily at 03:00 UTC).

## Sources

| Game | Source |
|---|---|
| Genshin Impact, Honkai: Star Rail | HoYoverse event calendar (via a public API) |
| Zenless Zone Zero | HoYoverse event notices (via a public API) |
| Wuthering Waves | Community wiki, scraped with cheerio |

## Pipeline

1. **Fetch** the current events for each game from its source.
2. **Parse** dates from free-text descriptions, which come in many formats and time zones.
3. **Resolve version-relative dates.** Phrases like *"After the Version 2.3 update"* or *"until the end of Version 2.3"* are converted into real dates using a table of version release dates for each game.
4. **Filter and enrich.** A configurable ignore list removes announcements and other noise, and daily-login events are tagged.
5. **Classify** each event: long or version-bound events become *main* events, and everything else becomes a *side* event.
6. **De-duplicate** against the backend in one batch request.
7. **Import** only the new events.

Events that can't be parsed are collected in a report, and each workflow run saves it for review.
