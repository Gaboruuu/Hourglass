# ⏳ Hourglass - Event Tracking Platform

> **Portfolio Project**: A full-stack mobile application demonstrating modern cross-platform development, real-time synchronization, and scalable API design.

## 📋 Overview

Hourglass is a comprehensive event tracking platform for gaming communities that aggregates and manages events from multiple gaming sources. The project showcases full-stack development capabilities with a React Native frontend and Node.js backend, handling real-time data synchronization, user authentication, and complex event filtering.

## 🎯 Key Features

- **Multi-Source Event Aggregation**: Unified event tracking from multiple gaming platforms (HoYoverse, WUWA, and custom events)
- **Automated Event Sync**: Daily scheduled pipeline (GitHub Actions) that collects, cleans, and imports new events without manual input
- **Smart Notifications**: Customizable push notifications with 3-tier alert scheduling (3 days, 1 day, 2 hours before an event ends)
- **Grouped Notifications**: Multiple events from the same game expiring together are bundled into a single notification
- **Notification History**: Persistent tracking of all scheduled and triggered notifications with event details and game icons
- **Permanent Event Management**: Complex recurring event system supporting weekly, monthly, and custom schedules
- **Region-Specific Timezone Management**: Automatic UTC offset handling for Europe (UTC+1), North America (UTC-5), and Asia (UTC+8)
- **JWT Authentication**: Secure token-based authentication with role-based access control (Admin/User)
- **Admin Dashboard**: Management interface for creating events, with notification debug tools
- **Game Preferences**: Select and customize tracking for specific games, shown with official game icons
- **Advanced Filtering**: Multi-criteria filtering by game, date range, time remaining, category, and search query
- **Theme Customization**: Theme modes (Light, Dark, Black, or follow system) with persistent user preferences
- **In-App Changelog**: "What's new" popup after each update and a full version history in settings
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
│   ├── app/                   # Screens (React Navigation drawer + stack)
│   │   ├── (auth)/            # Authentication flow
│   │   ├── (events)/          # Event browsing and management
│   │   └── (admin)/           # Admin control panel
│   ├── components/            # Reusable UI components
│   ├── context/               # Global state management (React Context)
│   ├── data/                  # Business logic, data managers, changelog
│   ├── utils/                 # Shared helpers (game icons, logging)
│   ├── theme/                 # Color palettes
│   └── assets/                # Images, icons, and fonts
│
├── EventsSync/                # Event synchronization service
│   ├── src/api/               # Source integrations (HoYoverse, Wuthering Waves)
│   ├── src/services/          # Date resolution, classification, backend import
│   ├── src/config/            # Game version release calendars
│   └── sync.js                # Sync runner
│
└── .github/workflows/         # Scheduled daily sync (GitHub Actions)
```

## 🛠️ Technology Stack

### Frontend (Mobile App)

- **Framework**: React Native 0.76+ (Expo SDK 52)
- **Navigation**: React Navigation (Drawer + Stack)
- **State Management**: React Context API with custom hooks
- **Language**: TypeScript (strict mode)
- **Notifications**: Expo Notifications with persistent history
- **Local Storage**: AsyncStorage for persistent preferences
- **HTTP Client**: Fetch API
- **Testing**: Jest (jest-expo)

### Backend (API Server)

- **Runtime**: Node.js
- **Framework**: Express.js with middleware chain
- **Database**: MySQL with connection pooling
- **Authentication**: JWT with configurable expiration
- **Security**: bcryptjs password hashing, CORS configuration

### Event Synchronization Service

- **Data Sources**: Official HoYoverse event feeds + Wuthering Waves wiki scraping (cheerio)
- **Date Handling**: Free-text date parsing and version-relative date resolution
- **Data Validation**: Invalid events are filtered out and reported for review
- **Scheduling**: Daily automated runs via GitHub Actions

## 💡 Key Technical Achievements

### Frontend

- **Type Safety**: Full TypeScript implementation ensuring compile-time type checking
- **Context API Patterns**: Efficient state management without Redux overhead
- **Custom Hooks**: Reusable logic for notifications, events, and filtering
- **Responsive Design**: Mobile-first UI adapting to various screen sizes
- **Performance**: Optimized list rendering with memoization strategies
- **Gesture Handling**: Smooth gesture-based interactions with `react-native-gesture-handler`
- **Persistent Storage**: AsyncStorage integration for user preferences, filters, and notification history
- **Advanced Notifications**: Multi-tier scheduling with grouping, history tracking, and permission management
- **Centralized Game Metadata**: Single utility resolving game IDs, names, aliases, and icons across the app
- **Release Management**: Versioned in-app changelog with an update popup for new releases
- **Unit Testing**: Jest tests for notification scheduling and game metadata logic

### Backend

- **RESTful Design**: Clean API following HTTP conventions
- **Middleware Architecture**: Extensible middleware chain for cross-cutting concerns
- **Role-Based Access Control**: Admin and User permission levels with middleware verification
- **Error Handling**: Comprehensive error management with meaningful responses
- **Data Access Layer**: Model layer with MySQL connection pooling
- **Authentication Flow**: Secure token-based access control with JWT verification
- **Batch Duplicate Checking**: Single endpoint to check many events at once, used by the sync service
- **Health Monitoring**: Readiness check endpoint for load balancers and monitoring systems

### Data Synchronization

- **Multi-Source Integration**: Aggregates data from HoYoverse event feeds and the Wuthering Waves wiki
- **Date Complexity**: Parses free-text dates and resolves version-relative dates ("End of Version 2.3") from release calendars
- **Scheduled Tasks**: Automated daily synchronization via GitHub Actions
- **Data Validation**: Ignore lists, daily-login tagging, and invalid-event reports
- **Event Classification**: Automatic main/side categorization based on duration and version binding

### State Management & Filtering

- **Region Context**: Dynamic timezone calculation and reset time management per region
- **Notification History Context**: Persistent tracking of scheduled and triggered notifications
- **Filter Context**: Multi-criteria filtering state with search, game selection, date ranges, and time-based filtering
- **Events Data Manager**: Centralized event aggregation from API and permanent event sources

## 🔐 Security Considerations

- **Authentication**: JWT-based stateless authentication
- **Password Security**: bcryptjs with salt rounds for hashing
- **Input Validation**: Required-field and reference checks on event creation
- **CORS**: Cross-origin requests handled via middleware
- **Environment Secrets**: Sensitive configuration via environment variables

## 📲 Frontend Features in Detail

### Notification System

**Smart Scheduling**

- 3-tier notification alerts: 3 days, 1 day, 2 hours before an event ends
- Events from the same game expiring at the same time are grouped into one notification
- Persistent notification history with event metadata
- Toggle notifications globally, per game, or per event type
- Separate tracking of scheduled vs. triggered notifications

**Notification History**

- Stored locally with AsyncStorage for offline access
- Tracks notification type and timing
- Associates events with their notifications
- Grouped by day (today, yesterday, older) with game icons
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
- Daily reset at 04:00 server time for the selected region
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
- System mode: Follows the device's light/dark setting

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
- **Settings**: Notification preferences, region, theme, game selection, app version and changelog
- **Notification Preferences**: Configure alert times and game selection
- **Notification History**: Timeline of scheduled and delivered reminders
- **Admin Panel** (Admin Users): Event creation and notification debugging

### Authentication Screens

- **Login**: Credential-based authentication

## 🗂️ Data Management Architecture

### EventsDataManager

Central orchestration point for all event data:

- Manages both API events and permanent events
- Refreshes event data when the app returns to the foreground (if older than 30 minutes)
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
  - Group events sharing the same game and alert time
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
EventsSync Service (GitHub Actions, daily)
  ↓
Fetch from HoYoverse feeds + Wuthering Waves wiki
  ↓
Parse dates & resolve version-relative dates
  ↓
Filter ignored events & classify (main / side)
  ↓
Batch-check against backend to skip existing events
  ↓
POST new events to Hourglass Backend API
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

## 📱 Features Showcase

### Event Management

- **Current Events**: View all ongoing gaming events
- **Upcoming Events**: Track future events grouped by time remaining
- **My Events**: Personalized event list for followed games
- **Permanent Events**: Weekly and monthly recurring events

### User Features

- Secure login
- Game preferences
- Notification settings and history
- Regional preferences
- In-app changelog

### Admin Features

- Create custom events
- Notification debugging tools

### Data Automation

- Automatic event collection from official feeds and community wikis
- Event status updates (current/upcoming)
- Daily scheduled sync via GitHub Actions
- Multi-source data aggregation

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Role-based admin access
- CORS configuration
- Secure token storage

## 📊 Database Schema

The application uses a relational database with the following main entities:

- **Users**: User accounts and authentication
- **Games**: Supported games and metadata
- **Events**: Synced and admin-created gaming events (permanent events are defined in the app)

## 🎨 Design Patterns

- **Context Pattern**: Global state management
- **Singleton Pattern**: Central events data manager and notification service
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
- ✅ CI-scheduled data pipelines (GitHub Actions)
- ✅ Push notification implementation
- ✅ Unit testing with Jest
- ✅ Code organization and modularity

## 📝 Documentation

- [Backend Documentation](./BackEnd/README.md) - API endpoints and architecture
- [Frontend Documentation](./Hourglass/README.md) - App architecture and features
- [EventsSync Documentation](./EventsSync/README.md) - Event synchronization pipeline

## 🤝 Contact

**Developer**: Gaboruu
**Repository**: [github.com/Gaboruuu/Hourglass](https://github.com/Gaboruuu/Hourglass)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: While this project is open source under the MIT License, it is primarily a portfolio demonstration shared for interview and evaluation purposes.
