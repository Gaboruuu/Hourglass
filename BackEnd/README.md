# Hourglass Backend

The REST API behind Hourglass. It stores game events, supported games, and user accounts, and serves them to the mobile app. It also receives newly discovered events from the automated EventsSync job.

**Stack:** Node.js, Express, MySQL, JSON Web Tokens, bcrypt. Hosted on Render.

## What it does

- **Events API.** Lists all events or the events for one game, returns a single event, and supports creating, updating, and deleting events.
- **Import support.** A batch endpoint takes a list of scraped events and reports which ones are already stored and which are new. This keeps the daily sync from creating duplicates.
- **Games catalogue.** Lists the games the app supports.
- **Accounts.** Registration and login. Passwords are hashed with bcrypt, and sessions use signed JWTs. A role system (`user` / `admin`) unlocks the admin tools in the app.
- **Health check.** `/healthz` for uptime monitoring.

## Design

```
src/
├── server.js       App setup and route mounting
├── config/         MySQL connection pool
├── middleware/     Token verification and admin role check
├── models/         Data access (SQL) for events, games, users
└── routes/         HTTP layer: /api/auth, /api/events, /api/games
```

Each layer has one job: routes handle HTTP and validation, models own the SQL, and middleware handles authentication. The database has three tables (`events`, `games`, and `users`), and each event belongs to a game.
