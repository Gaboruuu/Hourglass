# 🔧 Hourglass Backend API

> **Portfolio Project**: RESTful API service demonstrating Express.js patterns, middleware architecture, database abstraction, and authentication design.

## 📋 Overview

The Hourglass backend is a Node.js/Express RESTful API that serves as the core business logic layer for the Hourglass event tracking platform. It serves event and game data publicly, and accepts changes only from two callers: the EventsSync service (with an API key) and logged-in admins (with a JWT). It demonstrates middleware chains, role-based authorization, schema validation, rate limiting and centralized error handling.

## 🏗️ Architecture

### Layered Design

```
Routes → Middleware (authorize, validate) → Logic → Models → Database
```

### Directory Structure

```
BackEnd/
├── src/
│   ├── server.js               # Startup checks + listen
│   ├── app.js                  # createApp(): middleware, routes, error handling
│   ├── config/
│   │   ├── db.config.js        # MySQL pool, verified SSL (Aiven CA)
│   │   ├── auth.config.js      # JWT secret/expiration, enforcement switch
│   │   └── apiKeys.js          # Sync API key check
│   ├── middleware/
│   │   ├── authorize.js        # Role-based route guard (sync / admin / user / public)
│   │   ├── validate.js         # zod request validation
│   │   ├── rateLimits.js       # Global + login rate limits
│   │   └── errorHandler.js     # HttpError, async wrapper, 404 + 500 handlers
│   ├── schemas/                # zod schemas (events, games, login)
│   ├── models/                 # SQL per table (users, events, games)
│   └── routes/                 # auth, events, games
├── scripts/create-user.js      # Create or reset accounts (no public sign-up)
└── tests/                      # jest + supertest (DB mocked)
```

## 📡 API Design

Reads are public. Writes need a credential:

| Route | Who |
|---|---|
| `GET /api/events*`, `GET /api/games*`, `GET /healthz` | Everyone |
| `POST /api/events/batch-check`, `POST /api/events`, `PUT /api/events/:id` | Sync (API key) or admin |
| `DELETE /api/events/:id`, `POST /api/games`, `GET /api/auth/me` | Admin only |
| `POST /api/auth/login` | Everyone (rate-limited) |

Missing or invalid credentials return **401**; valid credentials without the right role return **403**.

### Authentication Endpoints

**POST `/api/auth/login`**

- Request body: `{ username, password }`
- Response: `{ id, username, role, accessToken, expiresAt }` (`expiresAt` in epoch ms, tokens last 12h by default)
- Every failure returns the same `401 "Invalid username or password"`, so valid usernames can't be discovered

**GET `/api/auth/me`**

- Header: `Authorization: Bearer <token>`
- Response: `{ id, username, role }`. The app calls it on startup to confirm the session and role

There is no registration endpoint. Accounts are created with `npm run create-user`.

### Event Endpoints

**GET `/api/events`** · **GET `/api/events/:gameId`** · **GET `/api/events/id/:eventId`**

- Events joined with their game name, dates as `YYYY-MM-DD`

**POST `/api/events/batch-check`**

- Request body: array of `{ event_name, start_date, … }` (max 1000)
- Response: `{ existing: [...], new: [...] }` (matched on event name + start date). Used by EventsSync

**POST `/api/events`**

- Request body: `{ game_id, event_name, start_date, expiry_date, event_type, daily_login?, background_url? }`
- Validated: real `YYYY-MM-DD` dates, start ≤ expiry, `event_type` in `main | side`, `https://` image URL, no unknown fields, existing game

**PUT `/api/events/:eventId`**

- Any subset of the fields above; the date order is checked against the stored dates

**DELETE `/api/events/:eventId`**

- Admin only. The sync service can never delete

### Game Endpoints

**GET `/api/games`** · **GET `/api/games/:id`**

- Response: `{ game_id, game_name }`

**POST `/api/games`**

- Admin only. Request body: `{ game_name }`. Duplicate names return `409`

### Health & Monitoring

**GET `/healthz`**

- Response: `{ ok: true, time: "ISO-8601-timestamp" }`

## 🔐 Security

- **Two credentials, one guard**: `authorize(...roles)` accepts a sync API key (`x-api-key`) or an admin JWT (`Authorization: Bearer`). The admin role is read from the database on every request, so demoting an admin takes effect immediately
- **Sync API key**: compared as SHA-256 hashes with `crypto.timingSafeEqual`. `SYNC_API_KEYS` holds a comma-separated list so keys can be rotated without downtime; an empty list disables the sync role
- **JWT**: HS256 pinned on sign and verify (blocks `alg: none`), 12h default lifetime, server refuses to start with a missing or short secret
- **Passwords**: bcrypt cost 12; login compares against a dummy hash for unknown usernames so timing doesn't reveal them
- **Rate limiting**: 300 requests / 15 min per IP globally (the sync key is exempt), 5 failed logins / 15 min
- **Validation**: zod schemas on every write; invalid input is a `400` with field-level errors
- **Errors**: one central handler. Clients get `"Internal server error"`; details (SQL, stack traces) only go to the server log
- **HTTP hardening**: helmet security headers, 100kb body limit, CORS allowlist (`CORS_ORIGINS`), `trust proxy` for correct client IPs behind Render
- **Database**: TLS with the provider's CA certificate verified; parameterized queries; update helpers only accept whitelisted columns
- **Rollout switch**: `AUTH_ENFORCE=false` logs what would be rejected without blocking, for safe deployment

## 🛠️ Running It

```bash
npm install
cp .env.example .env    # fill in the values
npm run dev             # nodemon
npm test                # jest + supertest, no database needed
npm run create-user -- --username admin --email you@example.com --role admin
```

See `.env.example` for every environment variable.

## 🛠️ Technologies Used

- **Express.js** (v4) - Web framework
- **MySQL2** - Database driver with connection pooling
- **jsonwebtoken** - Token-based authentication
- **bcryptjs** - Password hashing
- **zod** - Request validation
- **helmet**, **express-rate-limit**, **cors** - HTTP hardening
- **jest** + **supertest** - Tests
- **dotenv** - Environment configuration

## 🚀 Deployment

Deployed as a Node.js web service on Render.com with an Aiven MySQL database. Secrets (database credentials, JWT secret, sync API keys) are environment variables; the Aiven CA certificate is a Render Secret File.

## 🤝 Contributing

This is a portfolio project for demonstration purposes. Not accepting external contributions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Developer**: Gaboruu  
**Project**: Hourglass Backend API  
**Purpose**: Portfolio/Interview Demonstration
