# ⏳ Hourglass - Event Tracking Platform

> **Portfolio Project**: A full-stack mobile application demonstrating modern cross-platform development, real-time synchronization, and scalable API design.

## 📋 Overview

Hourglass is a comprehensive event tracking platform for gaming communities that aggregates and manages events from multiple gaming sources. The project showcases full-stack development capabilities with a React Native frontend and Node.js backend, handling real-time data synchronization, user authentication, and complex event filtering.

## 🎯 Key Features

- **Multi-Source Event Aggregation**: Unified event tracking from multiple gaming platforms (HoYoverse, WUWA, and custom events)
- **Smart Notifications**: Customizable push notifications with 3-tier alert scheduling (3 days, 1 day, 2 hours before event)
- **Notification History**: Persistent tracking of all scheduled and triggered notifications with event details
- **Permanent Event Management**: Complex recurring event system supporting weekly, monthly, and custom schedules
- **Region-Specific Timezone Management**: Automatic UTC offset handling for Europe (UTC+1), North America (UTC-5), and Asia (UTC+8)
- **JWT Authentication**: Secure token-based authentication with role-based access control (Admin/User)
- **Admin Dashboard**: Comprehensive management interface for events, games, and user administration with debug tools
- **Game Preferences**: Select and customize tracking for specific games
- **Advanced Filtering**: Multi-criteria filtering by game, date range, time remaining, category, and search query
- **Theme Customization**: Three theme modes (Dark, Light, Black) with persistent user preferences
- **Health Monitoring**: Backend health check endpoint for service reliability verification

## 🏗️ Architecture

### Project Structure

```
Hourglass/
├── BackEnd/                   # Node.js/Express REST API
│   ├── src/
│   │   ├── server.js          # Express application entry
│   │   ├── config/            # Database connection management
│   │   ├── middleware/        # JWT authentication middleware
│   │   ├── models/            # Data models (User, Event, Game)
│   │   └── routes/            # RESTful API endpoints
│   └── package.json
│
├── Hourglass/                 # React Native (Expo) Mobile App
│   ├── app/                   # Screen components (Expo Router file-based routing)
│   │   ├── (auth)/            # Authentication flow
│   │   ├── (events)/          # Event browsing and management
│   │   └── (admin)/           # Admin control panel
│   ├── components/            # Reusable UI components
│   ├── context/               # Global state management (React Context)
│   ├── data/                  # Business logic and data managers
│   ├── hooks/                 # Custom React hooks
│   └── assets/                # Images, fonts, and theme files
│
├── EventsSync/                # Event synchronization service
│   ├── src/api/               # API integrations (HoYoverse, WUWA)
│   └── scheduler.js           # Automated sync scheduling
│
└── package.json               # Workspace root configuration
```

## 🛠️ Technology Stack

### Frontend (Mobile App)

- **Framework**: React Native 0.76+ (Expo SDK 52)
- **Navigation**: Expo Router (file-based routing) + React Navigation
- **State Management**: React Context API with custom hooks
- **Language**: TypeScript
- **Notifications**: Expo Notifications with persistent history
- **Local Storage**: AsyncStorage for persistent preferences
- **HTTP Client**: Axios with interceptors

### Backend (API Server)

- **Runtime**: Node.js
- **Framework**: Express.js with middleware chain
- **Database**: SQLite (dev) / MySQL (production)
- **Authentication**: JWT with refresh token support
- **Security**: bcryptjs password hashing, CORS configuration
- **Task Scheduling**: Cron jobs for automated event synchronization

### Event Synchronization Service

- **Web Scraping**: Direct API integration with gaming platforms
- **Timezone Handling**: Complex timezone parsing and conversion
- **Data Validation**: Schema validation for ingested events
- **Error Recovery**: Robust error handling and retry logic

## 💡 Key Technical Achievements

### Frontend

- **Type Safety**: Full TypeScript implementation ensuring compile-time type checking
- **Context API Patterns**: Efficient state management without Redux overhead
- **Custom Hooks**: Reusable logic for notifications, events, and filtering
- **Responsive Design**: Mobile-first UI adapting to various screen sizes
- **Performance**: Optimized list rendering with memoization strategies
- **Gesture Handling**: Smooth gesture-based interactions with `react-native-gesture-handler`
- **Persistent Storage**: AsyncStorage integration for user preferences, filters, and notification history
- **Advanced Notifications**: Multi-tier scheduling with history tracking and permission management

### Backend

- **RESTful Design**: Clean API following HTTP conventions
- **Middleware Architecture**: Extensible middleware chain for cross-cutting concerns
- **Role-Based Access Control**: Admin and User permission levels with middleware verification
- **Error Handling**: Comprehensive error management with meaningful responses
- **Database Abstraction**: Flexible DB layer supporting multiple backends (SQLite, MySQL)
- **Authentication Flow**: Secure token-based access control with JWT verification
- **Health Monitoring**: Readiness check endpoint for load balancers and monitoring systems

### Data Synchronization

- **Multi-Source Integration**: Aggregates data from multiple external APIs
- **Timezone Complexity**: Handles various timezone formats and conversions
- **Scheduled Tasks**: Automated background synchronization
- **Data Validation**: Ensures data integrity across sources
- **Redemption Code Tracking**: Automatic tracking of game redemption codes

### State Management & Filtering

- **Region Context**: Dynamic timezone calculation and reset time management per region
- **Notification History Context**: Persistent tracking of scheduled and triggered notifications
- **Filter Context**: Multi-criteria filtering state with search, game selection, date ranges, and time-based filtering
- **Events Data Manager**: Centralized event aggregation from API and permanent event sources

## 🔐 Security Considerations

- **Authentication**: JWT-based stateless authentication
- **Password Security**: bcryptjs with salt rounds for hashing
- **Input Validation**: Schema validation on all API endpoints
- **CORS**: Configured to prevent cross-origin attacks
- **Environment Secrets**: Sensitive configuration via environment variables

## 📲 Frontend Features in Detail

### Notification System

**Smart Scheduling**

- 3-tier notification alerts: 3 days, 1 day, 2 hours before event start
- Persistent notification history with event metadata
- Toggle notifications per game or globally
- Separate tracking of scheduled vs. triggered notifications

**Notification History**

- Stored locally with AsyncStorage for offline access
- Tracks notification type and timing
- Associates events with their notifications
- Enables notification management and review

### Region & Timezone Management

**Region Context**

- Three supported regions: Europe (UTC+1), North America (UTC-5), Asia (UTC+8)
- Automatic reset time calculation based on region
- Dynamic UTC offset handling
- Game-specific timezone adjustments
- User-selectable region preference

**Event Time Display**

- Displays all event times in user's selected timezone
- Accounts for daylight saving time variations
- Consistent time calculations across the app

### Advanced Filtering System

**Multi-Criteria Filtering**

- Search events by name or keyword
- Filter by game selection
- Date range filtering (start and end dates)
- Event category filtering
- Time remaining filter (upcoming, ongoing, completed)
- Login status filter for personal events
- Filter reset functionality

### Theme Customization

**Three Theme Modes**

- Dark mode: AMOLED-friendly dark colors
- Light mode: Standard light theme
- Black mode: True black AMOLED optimization

**Persistent Preferences**

- Theme preference saved to AsyncStorage
- Automatic application on app launch
- System-wide color consistency

### Game Preferences

**Selective Game Tracking**

- Choose which games to track events for
- Game icon and metadata display
- Add/remove games dynamically
- Prevents notification clutter
- Personalized event feeds

## 🎮 Screen Structure

### Authenticated User Screens

- **Home**: Dashboard with version notifications and quick actions
- **Events**: Browse all events with filtering
- **Current Events**: Real-time ongoing events view
- **Permanent Events**: Recurring weekly/monthly events
- **Settings**: Notification preferences, region, theme, game selection
- **Notification Preferences**: Configure alert times and game selection
- **Admin Panel** (Admin Users): Event and game management

### Authentication Screens

- **Login**: Credential-based authentication
- **Register**: New user account creation with email verification

## 🗂️ Data Management Architecture

### EventsDataManager

Central orchestration point for all event data:

- Manages both API events and permanent events
- Handles hourly refresh of event data
- Coordinates notification scheduling
- Monitors notification preferences
- Extracts unique games from all sources
- Provides listeners for data changes

### PermanentEventsManager

Handles recurring event schedules:

- Weekly recurring events
- Monthly recurring events
- Complex custom schedules
- Fixed duration events
- Sorts events by expiration

### Notification Lifecycle

```
User enables notifications
  ↓
System loads notification preferences
  ↓
EventsDataManager initializes
  ↓
NotificationService requests permissions
  ↓
For each event:
  - Calculate alert times (3d, 1d, 2h)
  - Schedule OS-level notifications
  - Track in NotificationHistory
  ↓
On notification trigger:
  - Push notification to device
  - Record in history
  - Update history UI
```

## 🔄 Data Synchronization Flow

```
EventsSync Service (Backend)
  ↓
Fetch from HoYoverse + WUWA APIs
  ↓
Parse & normalize times to UTC
  ↓
Validate & deduplicate events
  ↓
POST to Hourglass Backend API
  ↓
Backend stores in database
  ↓
Mobile app periodically fetches
  ↓
EventsDataManager processes & caches
  ↓
Notifications schedule automatically
  ↓
UI displays with region timezone conversion
```

npm install

# Create .env file with required variables

# See BackEnd/README.md for configuration details

# Initialize database

npm run init-db

# Start backend server

npm run dev

````

4. **Setup Frontend**

```bash
cd Hourglass
npm install

# Start Expo development server
npm start
````

5. **Run the app**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## 📱 Features Showcase

### Event Management

- **Current Events**: View all ongoing gaming events
- **Upcoming Events**: Track future events with countdown timers
- **My Events**: Personalized event list for followed games
- **Permanent Events**: Weekly and monthly recurring events

### User Features

- Secure registration and login
- Profile management
- Game preferences
- Notification settings
- Regional preferences

### Admin Features

- Add and manage games
- Create custom events
- Upload event background images
- Manage event schedules

### Data Automation

- Automatic event scraping from gaming wikis
- Event status updates (current/upcoming)
- Scheduled background tasks
- Multi-source data aggregation

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Protected API routes
- CORS configuration
- Input validation
- Secure token storage

## 📊 Database Schema

The application uses a relational database with the following main entities:

- **Users**: User accounts and authentication
- **Games**: Supported games and metadata
- **Events**: Gaming events (both API and permanent)
- **EventBackgrounds**: Event imagery and assets

## 🎨 Design Patterns

- **Context Pattern**: Global state management
- **Repository Pattern**: Data access abstraction
- **Middleware Pattern**: Request processing pipeline
- **Factory Pattern**: Event creation and management
- **Observer Pattern**: Notification system

## 📈 Development Highlights

This project demonstrates:

- ✅ Full-stack mobile application development
- ✅ RESTful API design and implementation
- ✅ User authentication and authorization
- ✅ Database design and management
- ✅ Responsive UI/UX design
- ✅ State management patterns
- ✅ TypeScript for type safety
- ✅ Data scraping and automation
- ✅ Push notification implementation
- ✅ Code organization and modularity

## 📝 Documentation

- [Backend Documentation](./BackEnd/README.md) - API endpoints and server setup
- [Frontend Documentation](./Hourglass/README.md) - App architecture and features

## 🤝 Contact

**Developer**: Gaboruu
**Repository**: [github.com/Gaboruuu/Hourglass](https://github.com/Gaboruuu/Hourglass)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: While this project is open source under the MIT License, it is primarily a portfolio demonstration shared for interview and evaluation purposes.
