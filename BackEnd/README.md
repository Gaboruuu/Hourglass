# 🔧 Hourglass Backend API

> **Portfolio Project**: This backend server is part of the Hourglass event tracking application. Shared for interview evaluation purposes only.

## 📋 Overview

The Hourglass backend is a RESTful API server built with Node.js and Express.js. It provides comprehensive endpoints for user authentication, event management, game tracking, and admin operations. The server handles data aggregation from multiple gaming sources and manages user-specific event preferences.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- npm or yarn
- SQLite (development) or MySQL (production)

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment Configuration**

   Create a `.env` file in the BackEnd directory:

   ```env
   # Server Configuration
   PORT=8080
   NODE_ENV=development

   # Database Configuration (SQLite for development)
   DB_TYPE=sqlite
   DB_PATH=./database.sqlite

   # Database Configuration (MySQL for production)
   # DB_TYPE=mysql
   # DB_HOST=localhost
   # DB_USER=your_username
   # DB_PASSWORD=your_password
   # DB_NAME=hourglass_db

   # JWT Secret
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRATION=24h

   # CORS Settings
   CORS_ORIGIN=*
   ```

3. **Initialize Database**

   ```bash
   npm run init-db
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Start Production Server**
   ```bash
   npm start
   ```

## 📡 API Endpoints

### Authentication (`/api/auth`)

#### Register User

#### Login

#### Get User Profile

### Events (`/api/events`)

#### Get All Events

#### Get Event by ID

#### Create Event (Admin Only)

#### Update Event (Admin Only)

#### Delete Event (Admin Only)

### Games (`/api/games`)

#### Get All Games

#### Create Game (Admin Only)

### Event Backgrounds (`/api/event-backgrounds`)

#### Get All Backgrounds

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

This project is private and shared for interview purposes only. Not licensed for public use or distribution.

---

**Developer**: Gaboruu  
**Project**: Hourglass Backend API  
**Purpose**: Portfolio/Interview Demonstration
