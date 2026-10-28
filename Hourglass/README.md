# 📱 Hourglass Mobile App

> **Portfolio Project**: This is the frontend mobile application for the Hourglass event tracking system. Shared for interview evaluation purposes only.

## 📋 Overview

Hourglass is a cross-platform mobile application built with React Native and Expo that provides comprehensive gaming event tracking. The app features a modern, intuitive interface with real-time event updates, personalized notifications, and multi-game support.

## ✨ Key Features

### 🎮 Event Management

- **Current Events**: Real-time display of ongoing gaming events
- **Upcoming Events**: Preview future events grouped by time remaining
- **My Events**: Personalized feed of events from followed games
- **All Events**: Comprehensive list of all tracked events
- **Permanent Events**: Recurring weekly, monthly, and custom-schedule events

### 👤 User Experience

- **Authentication**: Secure login
- **Theme Switching**: Light, dark, pure-black, and system themes
- **Regional Settings**: Event times and resets based on your server region
- **Notification Preferences**: Granular control over event alerts per game and event type
- **Notification History**: Timeline of scheduled and delivered reminders
- **Game Icons**: Official game icons across settings and notifications
- **What's New**: In-app changelog and update popup after each release

### 🛠️ Admin Features

- **Event Creation**: Create custom events with full details
- **Notification Debugging**: Inspect scheduled notifications and send test notifications

### 🤖 Automation

- **Synced Events**: Events are collected automatically by the EventsSync service
- **Smart Scheduling**: Automatic event status updates
- **Background Refresh**: Data refreshed when the app returns to the foreground
- **Push Notifications**: Timely reminders before events end, grouped per game

## 📁 Project Structure

```
Hourglass/
├── app/                          # Screen components (React Navigation)
│   ├── _layout.tsx               # Root layout with navigation and providers
│   ├── home.tsx                  # Home screen
│   ├── settings.tsx              # Settings screen
│   ├── notification.tsx          # Notification preferences
│   ├── notification-debug.tsx    # Notification history
│   ├── (auth)/                   # Authentication flow
│   │   └── login.tsx             # Login screen
│   ├── (events)/                 # Event management screens
│   │   ├── events.tsx            # Events list
│   │   ├── current.tsx           # Current events list
│   │   └── permanent.tsx         # Recurring events
│   └── (admin)/                  # Admin panel
│       ├── admin.tsx             # Admin dashboard
│       ├── add-event.tsx         # Create custom event
│       └── debug-notifications.tsx # Notification debugging
│
├── components/                   # Reusable UI components
│   ├── events/
│   │   ├── ApiEventCard.tsx      # Event card component
│   │   └── PermanentEventCard.js # Permanent event card
│   ├── layout/
│   │   ├── CustomDrawerContent.tsx # Navigation drawer
│   │   └── Footer.tsx            # App footer
│   ├── ui/
│   │   ├── AnimatedButton.tsx    # Custom button with animations
│   │   ├── ChangelogModal.tsx    # Version history
│   │   ├── UpdatePopup.tsx       # "What's new" popup
│   │   └── Separator.tsx         # Visual separator
│   └── NotificationDebugTab.tsx  # Notification history list
│
├── context/                      # React Context providers
│   ├── ThemeContext.tsx          # Theme management
│   ├── UserContext.tsx           # User state and auth
│   ├── EventsContext.tsx         # Event data subscription
│   ├── FilterContext.tsx         # Event filtering logic
│   ├── NotificationHistoryContext.tsx # Notification history
│   └── RegionContext.tsx         # Regional settings
│
├── data/                         # Business logic and data management
│   ├── EventsDataManager.ts      # Central event store and refresh logic
│   ├── EventInteface.ts          # Type definitions
│   ├── FilterManager.ts          # Filter operations and preferences
│   ├── NotificationManager.ts    # Push notification scheduling and grouping
│   ├── NotificationManager.test.ts # Notification unit tests
│   ├── changelog.ts              # Release history
│   └── permanentEvents/          # Permanent event definitions
│       ├── PermanentEventsManager.ts
│       ├── weeklyEvents.ts       # Weekly recurring events
│       ├── monthlyEvents.ts      # Monthly recurring events
│       ├── fixedDurationEvents.ts # Fixed-schedule events
│       └── complexEvents.ts      # Complex scheduling logic
│
├── assets/                       # Static resources
│   ├── ImageManager.ts           # Image asset management
│   ├── fonts/                    # Custom fonts
│   ├── images/                   # App images and icons
│   ├── events/                   # Event-specific images
│   └── permanent/                # Permanent event images
│
├── theme/                        # Styling and theming
│   └── Colors.tsx                # Color palette definitions
│
├── utils/                        # Shared helpers
│   ├── gameIcons.ts              # Game ID/name/icon resolution
│   ├── gameIcons.test.ts         # Game metadata unit tests
│   └── logger.ts                 # Structured logging
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## 🛠️ Technology Stack

### Core Framework

- **React Native** (0.76.9) - Mobile framework
- **Expo SDK** (52.0.47) - Development platform
- **TypeScript** - Type safety and better DX
### Navigation

- **React Navigation** - Navigation library
  - Drawer Navigator - Side menu
  - Stack Navigator - Screen stacks

### State Management

- **React Context API** - Global state
- **AsyncStorage** - Local data persistence

### UI/UX

- **Expo Linear Gradient** - Gradient backgrounds
- **Expo Blur** - Blur effects
- **React Native Gesture Handler** - Touch gestures
- **React Native Reanimated** - Smooth animations

### Notifications

- **Expo Notifications** - Push notifications
- **Expo Device** - Device information
- **Expo Constants** - App constants

### Data Fetching

- **Fetch API** - HTTP requests

### Development Tools

- **Jest** - Testing framework
- **ESLint** - Code linting
- **TypeScript** - Static typing

## 🎨 Theming System

The app includes a comprehensive theming system with light, dark, pure-black (AMOLED), and system-following modes. The choice is saved on the device.

### Theme Context

```typescript
const { colors, isDark, isBlack, theme, setTheme } = useTheme();
```

### Color Palette

- Background colors (primary, secondary, surface)
- Text colors (primary, secondary, tertiary)
- Accent colors (primary, secondary)
- Status colors (success, warning, error, info)
- Game-specific colors

## 🔔 Notification System

### Features

- Reminders 3 days, 1 day, and 2 hours before an event ends
- Customizable notification preferences
- Per-game and per-event-type notification settings
- Grouped notifications when several events from the same game expire together
- Notification history with scheduled and triggered entries
- Regional notification timing
- Background notification scheduling

### Usage

```typescript
import { NotificationService } from "@/data/NotificationManager";

// Schedule notifications for an event
await NotificationService.scheduleNotificationsForEvent(event);

// Cancel notification
await NotificationService.cancelNotification(notificationId);
```

## 🌍 Regional Support

The app supports multiple regions with customized content:

- **EU** (Europe, UTC+1)
- **NA** (North America, UTC-5)
- **ASIA** (Asia, UTC+8)

Regional settings affect:

- Event timing display
- Daily reset time (04:00 server time)
- Permanent event reset calculations
- Notification scheduling

## 🔍 Event Filtering

### Filter Types

- **By Game**: Filter events by specific games
- **By Status**: Current, upcoming, or all events
- **By Time Remaining**: Expiring today, within 3 days, this week, and more
- **By Category & Date Range**: Event type and start/end dates
- **Search**: Find events by name

### Filter Context

```typescript
const { filter, setFilter, resetFilter } = useFilterContext();
```

## 📱 Screen Descriptions

### Home Screen

Dashboard with quick access to current events and statistics.

### Events Screens

- **Current**: Shows all ongoing events
- **All**: Complete event list with filters
- **Mine**: Events from games the user follows
- **Permanent**: Recurring events (weekly/monthly)

### Settings Screen

- Theme selection
- Region preferences
- Game selection with game icons
- Notification settings
- App version and changelog

### Notification History

- Scheduled and delivered reminders grouped by day
- Expandable grouped notifications showing every included event

### Admin Panel

- Create custom events with full details
- Notification debugging tools

## 🔐 Authentication Flow

### Login

Credentials are sent to the backend. The returned user and token are stored with AsyncStorage, and admin users get access to the admin panel.

### Logout

```typescript
const { logout } = useUser();
await logout();
```

## 📰 Changelog System

- Release history kept in `data/changelog.ts`
- "What's new" popup shown once after each update
- Full version history available from settings

## 🔧 Build and Deployment

Built with EAS Build (Expo Application Services), with development, preview, and production profiles.

## 📈 Performance Optimizations

- **Memoization**: useMemo for derived event lists
- **Virtualized Lists**: FlatList for long event lists
- **Smart Refresh**: Data refetched only when stale (30 minutes) on app foreground
- **Centralized Data Store**: One events manager shared through context subscriptions

## 🎯 User Experience Features

- **Smooth Animations**: Reanimated for 60fps animations
- **Swipe Gestures**: Intuitive drawer navigation
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages

## 🔒 Security

- JWT token storage in AsyncStorage
- HTTPS API communication
- Role-based admin screens

## 🧪 Testing

- Jest unit tests (jest-expo) for notification scheduling and grouping
- Unit tests for game ID, name, and icon resolution

## 📝 Code Style

- TypeScript (strict mode) for type safety
- Functional components with hooks
- Custom hooks for reusable logic
- Context for global state
- Theme-aware styling via `useTheme()`
- Modular component structure
- Consistent naming conventions

## 🤝 Contributing

This is a portfolio project for demonstration purposes. Not accepting external contributions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Developer**: Gaboruu  
**Project**: Hourglass Mobile App  
**Framework**: React Native (Expo)  
**Purpose**: Portfolio/Interview Demonstration
