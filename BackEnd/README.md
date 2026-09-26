# 🔧 Hourglass Backend API

> **Portfolio Project**: RESTful API service demonstrating Express.js patterns, middleware architecture, database abstraction, and authentication design.

## 📋 Overview

The Hourglass backend is a Node.js/Express RESTful API that serves as the core business logic layer for the Hourglass event tracking platform. It manages user authentication, event data aggregation, game information, and admin operations. The server demonstrates modern backend patterns including middleware chains, JWT authentication, database abstraction, and error handling strategies.

## 🏗️ Architecture

### Layered Design

```
Routes → Middleware → Controllers/Logic → Models → Database
```

### Directory Structure

```
BackEnd/src/
├── server.js               # Express app initialization
├── config/
│   └── db.config.js        # Database connection & abstraction
├── middleware/
│   └── auth.middleware.js  # JWT verification & role checks
├── models/
│   ├── user.model.js       # User data access
│   ├── event.model.js      # Event data access
│   └── games.model.js      # Game data access
├── routes/
│   ├── auth.routes.js      # Authentication endpoints
│   ├── event.routes.js     # Event management endpoints
│   └── games.routes.js     # Game catalogue endpoints
```

## 📡 API Design

### Authentication Endpoints

**POST `/api/auth/register`**

- User registration with unique username and email checks
- Password hashing with bcryptjs
- Request body: `{ username, email, password }`
- Response: `{ message, userId }`

**POST `/api/auth/login`**

- Username and password verification
- JWT token generation with configurable expiration
- Request body: `{ username, password }`
- Response: `{ id, username, email, role, accessToken }`

**GET `/api/auth/me`**

- Requires authentication middleware
- Returns authenticated user details
- Headers: `x-access-token` or `Authorization: Bearer <token>`
- Response: `{ id, username, email, role, created_at, updated_at }`

### Event Management Endpoints

**GET `/api/events`**

- Retrieve all events, joined with their game name
- Response: Array of events with full details

**GET `/api/events/:gameId`**

- Get events for a specific game
- Filters by game ID

**GET `/api/events/id/:eventId`**

- Get a single event by ID
- Returns full event context and metadata

**POST `/api/events/exists`**

- Check if specific event already exists
- Prevents duplicate entries

**POST `/api/events/batch-check`**

- Batch check multiple events for existence (matched on event name + start date)
- Request body: array of events
- Response: `{ existing: [...], new: [...] }`
- Optimized for sync operations

**POST `/api/events`**

- Create events (used by the admin panel and the sync service)
- Validates required fields and that the referenced game exists
- Request body: `{ game_id, event_name, start_date, expiry_date, event_type, daily_login, background_url }`

**PUT `/api/events/:eventId`**

- Update event details

**DELETE `/api/events/:eventId`**

- Remove events

### Game Endpoints

**GET `/api/games`**

- List all available games
- Response: `[{ game_id, game_name, ... }]`

**GET `/api/games/:id`**

- Get specific game details

### Health & Monitoring

**GET `/healthz`**

- Service readiness check endpoint
- No authentication required
- Response: `{ ok: true, time: "ISO-8601-timestamp" }`
- Used by load balancers and monitoring systems

## 🛠️ Technical Features

### Authentication & Security

- **JWT Strategy**: Stateless token-based authentication
- **Token Formats**: Support for both header (`x-access-token`) and Authorization bearer tokens
- **Middleware Chain**: Centralized auth validation with `verifyToken` middleware
- **Password Security**: bcryptjs hashing with salt rounds
- **Role-Based Access**: Admin and User permission levels with `isAdmin` middleware
- **Token Expiration**: Configurable expiration time

### Role-Based Access Control (RBAC)

- **Admin Role**: Access to content management tools in the app
- **User Role**: Access to events, games, and personal profile
- **Middleware Protection**: `isAdmin` middleware for role checks
- **User Model Integration**: Role stored in database and verified on each request

### Database Layer

- **MySQL**: Relational storage for users, games, and events
- **Connection Pooling**: Efficient database connections with connection reuse
- **Model Layer**: Each table has a model module that owns its SQL queries
- **Parameterized Queries**: All queries use placeholders to prevent SQL injection

### Event Data Models

**Event Model**

- `event_id`: Unique identifier
- `game_id`: Foreign key to Games
- `event_name`: Event name
- `start_date`: Event start date
- `expiry_date`: Event end date
- `event_type`: Type classification (main, side)
- `daily_login`: Whether the event is a daily login event
- `background_url`: Optional event image

**Game Model**

- `game_id`: Unique identifier
- `game_name`: Game title

**User Model**

- `id`: Unique identifier
- `username`: User login name
- `email`: User email address
- `password`: Hashed password (never stored plain-text)
- `role`: User role (user/admin)
- `updated_at`: Last modification timestamp

### Error Handling

- **Consistent Response Format**: Standardized error responses with status codes
- **HTTP Status Codes**: Appropriate codes for different errors (400, 401, 403, 404, 500)
- **Error Logging**: Server-side error tracking with context
- **User-Friendly Messages**: Safe error messages to clients without exposing internals
- **Graceful Fallbacks**: Partial failures don't break entire API

### Data Management

- **Input Validation**: Required-field and game reference checks on event creation
- **Data Normalization**: Consistent data format across API (dates returned as `YYYY-MM-DD`)
- **Timezone Handling**: Dates stored as calendar days; region reset times are applied by the app
- **Duplicate Prevention**: Event existence checks before creation
- **Batch Operations**: Efficient batch checking for sync operations

## 🔐 Security Patterns

- **CORS Configuration**: Cross-origin request handling
- **Environment Variables**: Sensitive config via env files
- **Password Hashing**: Never store plain-text passwords
- **JWT Secrets**: Secure token signing keys
- **Parameterized Queries**: Prevent SQL injection
- **Role-Based Checks**: Admin role verification middleware

## 🔄 Data Flow

```
Client Request
    ↓
Express Middleware Chain
    ↓
Authentication Check (if required)
    ↓
Input Validation
    ↓
Business Logic / Data Access
    ↓
Database Query
    ↓
Response Formatting
    ↓
HTTP Response to Client
```

## 💻 Code Quality

- **Modular Routes**: Separated route handlers for maintainability
- **Middleware Composition**: Reusable middleware patterns
- **Error Recovery**: Graceful error handling throughout
- **Scalable Design**: Ready for horizontal scaling with stateless design

## 🔒 Security Features

### Authentication Middleware

- JWT token validation
- Protected route enforcement
- Admin role verification

### Password Security

- bcryptjs hashing (10 salt rounds)
- Never stores plain text passwords
- Secure comparison for login

### CORS Configuration

- Enabled through the `cors` middleware

## 🛠️ Technologies Used

- **Express.js** (v4.21.2) - Web framework
- **MySQL2** (v3.14.5) - Database driver with connection pooling
- **JWT** (v9.0.2) - Token-based authentication
- **bcryptjs** (v3.0.2) - Password hashing
- **CORS** (v2.8.5) - Cross-origin resource sharing
- **dotenv** (v16.4.7) - Environment configuration
- **nodemon** (v3.1.0) - Development auto-reload

## 🚀 Deployment

Deployed as a Node.js web service on Render.com with a managed MySQL database. All secrets (database credentials, JWT secret and expiration) are provided through environment variables.

## 📊 Performance Considerations

- Database connection pooling
- Batch duplicate checking for bulk imports
- Efficient query optimization

## 🤝 Contributing

This is a portfolio project for demonstration purposes. Not accepting external contributions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Developer**: Gaboruu  
**Project**: Hourglass Backend API  
**Purpose**: Portfolio/Interview Demonstration
