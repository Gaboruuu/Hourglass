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
│   └── games.routes.js     # Game management endpoints
└── migrations/             # Database schema versioning
```

## 📡 API Design

### Authentication Endpoints

**POST `/api/auth/register`**

- User registration with email validation
- Password hashing with bcryptjs
- Returns JWT token for immediate authentication
- Request body: `{ username, email, password }`
- Response: `{ token, user }`

**POST `/api/auth/login`**

- Email and password verification
- JWT token generation with expiration
- Refresh token support for session management
- Request body: `{ email, password }`
- Response: `{ token, user }`

**GET `/api/auth/profile`**

- Requires authentication middleware
- Returns authenticated user details
- Headers: `x-access-token` or `Authorization: Bearer <token>`
- Response: `{ id, username, email, role, created_at, updated_at }`

### Event Management Endpoints

**GET `/api/events`**

- Retrieve all events with optional filters
- Query parameters: `game`, `eventType` (main/side/permanent), `region`
- Response: Array of events with full details

**GET `/api/events/:gameId`**

- Get events for a specific game
- Filters by game ID

**GET `/api/events/id/:eventId`**

- Get a single event by ID
- Returns full event context and metadata

**GET `/api/events/:eventType`**

- Filter events by type (main, side, permanent)
- Returns categorized events

**GET `/api/events/:gameId/:eventType`**

- Combined filtering by game and event type
- Returns specific event subset

**GET `/api/events/:gameName/:startDate`**

- Query events by game name and start date
- Supports date range queries
- Useful for event availability checks

**POST `/api/events/exists`**

- Check if specific event already exists
- Request body: `{ eventName, gameName }`
- Prevents duplicate entries

**POST `/api/events/batch-check`**

- Batch check multiple events for existence
- Request body: `{ events: [{ eventName, gameName }, ...] }`
- Optimized for sync operations

**POST `/api/events`** (Admin Only)

- Create custom events
- Role-based access control via middleware
- Input validation and schema enforcement
- Request body: `{ title, gameName, startTime, endTime, eventType }`
- Requires `isAdmin` middleware

**PUT `/api/events/:eventId`** (Admin Only)

- Update event details
- Maintain event history and metadata
- Requires `isAdmin` middleware

**DELETE `/api/events/:eventId`** (Admin Only)

- Remove events
- Cascade delete related data
- Requires `isAdmin` middleware

### Game Management Endpoints

**GET `/api/games`**

- List all available games
- Returns game metadata and icons
- Response: `[{ id, name, icon, region }, ...]`

**GET `/api/games/:id`**

- Get specific game details
- Includes related events count

**POST `/api/games`** (Admin Only)

- Add new game entries
- Admin-only operation with validation
- Requires `isAdmin` middleware
- Request body: `{ name, icon, description, region }`

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
- **Token Expiration**: Configurable expiration times and refresh strategies

### Role-Based Access Control (RBAC)

- **Admin Role**: Full access to create, update, delete operations
- **User Role**: Read-only access to events, games, and personal profile
- **Middleware Protection**: `isAdmin` middleware for protected endpoints
- **User Model Integration**: Role stored in database and verified on each request

### Database Abstraction

- **DB Agnostic**: Support for SQLite (dev) and MySQL (production)
- **Connection Pooling**: Efficient database connections with connection reuse
- **Query Abstraction**: Consistent interface across DB types
- **Migration Support**: Schema versioning and updates in migrations/ directory
- **Flexible Schema**: Support for multiple data models (User, Event, Game)

### Event Data Models

**Event Model**

- `id`: Unique identifier
- `title`: Event name
- `gameName`: Associated game
- `gameId`: Foreign key reference
- `eventType`: Type classification (main, side, permanent)
- `startTime`: Event start datetime (UTC)
- `endTime`: Event end datetime (UTC)
- `region`: Region-specific configuration
- `description`: Event details
- `source`: Data source (api, manual, hoyoverse, wuwa)

**Game Model**

- `id`: Unique identifier
- `name`: Game title
- `icon`: Game icon/image reference
- `region`: Region availability
- `description`: Game description

**User Model**

- `id`: Unique identifier
- `username`: User login name
- `email`: User email address
- `password`: Hashed password (never stored plain-text)
- `role`: User role (user/admin)
- `created_at`: Account creation timestamp
- `updated_at`: Last modification timestamp

### Error Handling

- **Consistent Response Format**: Standardized error responses with status codes
- **HTTP Status Codes**: Appropriate codes for different errors (400, 401, 403, 404, 500)
- **Error Logging**: Server-side error tracking with context
- **User-Friendly Messages**: Safe error messages to clients without exposing internals
- **Graceful Fallbacks**: Partial failures don't break entire API

### Data Management

- **Input Validation**: Schema validation on all endpoints
- **Data Normalization**: Consistent data format across API
- **Timezone Handling**: Proper datetime handling for global audience (all stored in UTC)
- **Duplicate Prevention**: Event existence checks before creation
- **Batch Operations**: Efficient batch checking for sync operations

## 🔐 Security Patterns

- **CORS Configuration**: Cross-origin request handling
- **Environment Variables**: Sensitive config via env files
- **Password Hashing**: Never store plain-text passwords
- **JWT Secrets**: Secure token signing keys
- **Request Validation**: Prevent injection attacks
- **Role-Based Checks**: Endpoint-level authorization

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

- **TypeScript Ready**: Can be extended with full TypeScript support
- **Modular Routes**: Separated route handlers for maintainability
- **Middleware Composition**: Reusable middleware patterns
- **Error Recovery**: Graceful error handling throughout
- **Scalable Design**: Ready for horizontal scaling with stateless design

#### Upload Background (Admin Only)

## 🗄️ Database Models

### User Model

- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `password`: Hashed password (bcryptjs)
- `isAdmin`: Boolean flag for admin privileges
- `createdAt`: Timestamp

### Event Model

- `id`: Primary key
- `name`: Event name
- `gameId`: Foreign key to Games
- `startDate`: Event start timestamp
- `endDate`: Event end timestamp
- `description`: Event details
- `imageUrl`: Event image URL
- `sourceUrl`: Source reference
- `status`: current/upcoming

### Game Model

- `id`: Primary key
- `name`: Game name
- `iconUrl`: Game icon URL
- `description`: Game description
- `createdAt`: Timestamp

### Background Model

- `id`: Primary key
- `gameId`: Foreign key to Games
- `imageUrl`: Background image URL
- `description`: Image description

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

- Configurable allowed origins
- Credentials support
- Method and header restrictions

## 📦 Project Structure

```
BackEnd/
├── src/
│   ├── server.js              # Express app initialization
│   ├── config/
│   │   └── db.config.js       # Database connection
│   ├── middleware/
│   │   └── auth.middleware.js # JWT authentication
│   ├── models/
│   │   ├── user.model.js      # User data operations
│   │   ├── event.model.js     # Event data operations
│   │   ├── games.model.js     # Game data operations
│   │   └── background.model.js # Background image operations
│   └── routes/
│       ├── auth.routes.js     # Authentication endpoints
│       ├── event.routes.js    # Event endpoints
│       ├── games.routes.js    # Game endpoints
│       └── background.routes.js # Background endpoints
├── package.json
├── render.json                # Render.com deployment config
└── README.md
```

## 🛠️ Technologies Used

- **Express.js** (v4.21.2) - Web framework
- **SQLite3** (v5.1.7) - Development database
- **MySQL2** (v3.14.5) - Production database
- **JWT** (v9.0.2) - Token-based authentication
- **bcryptjs** (v3.0.2) - Password hashing
- **CORS** (v2.8.5) - Cross-origin resource sharing
- **dotenv** (v16.4.7) - Environment configuration
- **axios** (v1.11.0) - HTTP client
- **cron** (v4.3.3) - Scheduled tasks
- **nodemon** (v3.1.0) - Development auto-reload

## 🚀 Deployment

### Render.com Deployment

The project includes a `render.json` configuration for easy deployment to Render.com.

1. Push to GitHub
2. Connect Render.com to your repository
3. Configure environment variables
4. Deploy automatically

### Environment Variables for Production

```env
PORT=8080
DB_TYPE=mysql
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=hourglass_db
JWT_SECRET=production_secret_key
JWT_EXPIRATION=24h
NODE_ENV=production
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 🔄 Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database schema
- `npm test` - Run test suite

## 📊 Performance Considerations

- Database connection pooling
- JWT token caching
- Efficient query optimization
- Response compression (can be added)
- Rate limiting (can be implemented)

## 🤝 Contributing

This is a portfolio project for demonstration purposes. Not accepting external contributions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Developer**: Gaboruu  
**Project**: Hourglass Backend API  
**Purpose**: Portfolio/Interview Demonstration
