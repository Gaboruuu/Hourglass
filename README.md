# ⏳ Hourglass

A personal full-stack project: a mobile app that keeps track of in-game events across several gacha games and reminds you before they expire.

Keeping up with limited-time events across multiple games means checking each game, working out time zones and server resets, and remembering deadlines. Hourglass collects everything in one place, converts it to your region's reset time, and sends you a reminder before anything runs out.

**Games covered:** Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves, Honkai Impact 3rd, Punishing Gray Raven.

## Architecture

The project is made of three independent parts:

| Part | Role | Stack |
|---|---|---|
| [**Hourglass**](./Hourglass/README.md) | Mobile app (Android / iOS) | React Native, Expo, TypeScript |
| [**BackEnd**](./BackEnd/README.md) | REST API and database | Node.js, Express, MySQL, JWT |
| [**EventsSync**](./EventsSync/README.md) | Automated event collection | Node.js, cheerio, GitHub Actions |

```
 HoYoverse event data ─┐
 (GI, HSR, ZZZ)        │
                       ├─► EventsSync ─────► BackEnd ─────► MySQL
 Wuthering Waves wiki ─┘   daily at 03:00     REST API          │
                           (GitHub Actions)      ▲              │
                                                 │              │
                                          Hourglass app ◄───────┘
                               + built-in recurring events
                               + local reminders before expiry
```

1. **EventsSync** runs every day in the cloud. It collects the current events for each game, cleans up and normalizes their dates, and sends only the new ones to the backend.
2. **BackEnd** stores events, games, and user accounts, and serves them through a REST API hosted on Render.
3. **The app** combines API events with recurring end-game content defined in the app. It converts everything to the user's region and schedules reminders on the device.

## Highlights

- **Fully automated data pipeline.** Nobody enters events by hand. A scheduled job scrapes, validates, de-duplicates, and imports them.
- **Messy date handling.** Source data mixes formats, time zones, and version-relative dates such as *"available after Version 2.3"*. The sync resolves these against a table of version release dates.
- **Region-aware resets.** Every event and recurring mode is calculated against the selected server (Europe, North America, or Asia) and its 04:00 daily reset.
- **Recurring events engine.** It supports weekly, monthly, fixed-length, and multi-window schedules, and always shows the next upcoming reset.
- **Smart notifications.** Reminders fire at 3 days, 1 day, and 2 hours before expiry, configurable per game and per event type. Events expiring at the same moment are grouped into one notification, and there's a full notification history.
- **Polished app experience.** It has light, dark, and pure-black themes, filtering and search, an in-app changelog with a "what's new" popup, and an admin area for managing content.

## Tech stack

**Mobile:** React Native 0.76, Expo SDK 52, TypeScript, React Navigation, React Context, AsyncStorage, Expo Notifications, Jest
**Backend:** Node.js, Express, MySQL, JSON Web Tokens, bcrypt
**Automation:** Node.js, cheerio, GitHub Actions (scheduled workflow)
**Deployment:** Render (API), EAS Build (mobile)

## License

MIT
