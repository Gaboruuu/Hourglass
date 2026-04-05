# 📱 Hourglass Mobile App

> **Portfolio Project**: This is the frontend mobile application for the Hourglass event tracking system. Shared for interview evaluation purposes only.

## 📋 Overview

Hourglass is a cross-platform mobile application built with React Native and Expo that provides comprehensive gaming event tracking. The app features a modern, intuitive interface with real-time event updates, personalized notifications, and multi-game support.

## ✨ Key Features

### 🎮 Event Management

- **Current Events**: Real-time display of ongoing gaming events
- **Upcoming Events**: Preview future events with countdown timers
- **My Events**: Personalized feed of events from followed games
- **All Events**: Comprehensive list of all tracked events
- **Permanent Events**: Recurring weekly, monthly, and custom-schedule events

### 👤 User Experience

- **Authentication**: Secure login and registration
- **Profile Management**: User settings and preferences
- **Theme Switching**: Dark and light mode support
- **Regional Settings**: Customize content based on your region
- **Notification Preferences**: Granular control over event alerts

### 🛠️ Admin Features

- **Game Management**: Add and configure new games
- **Event Creation**: Create custom events with full details
- **Background Images**: Upload and manage event imagery
- **User Management**: Monitor and manage user accounts

### 🤖 Automation

- **Auto-Import Events**: Scrapes gaming wikis for event data
- **Smart Scheduling**: Automatic event status updates
- **Background Sync**: Periodic data refresh
- **Push Notifications**: Timely alerts for event changes

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator
- Expo Go app (for physical device testing)

### Installation

1. **Navigate to the app directory**

   ```bash
   cd Hourglass
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Backend URL**

   Update the API base URL in your configuration files to point to your backend server.

4. **Start Expo Development Server**

   ```bash
   npm start
   ```

5. **Run on Device/Emulator**
   - Press `i` to open iOS Simulator
   - Press `a` to open Android Emulator
   - Scan QR code with Expo Go app on physical device

## 📁 Project Structure

```
Hourglass/
├── app/                          # Screen components (Expo Router)
│   ├── _layout.tsx               # Root layout with navigation
│   ├── home.tsx                  # Home screen
│   ├── settings.tsx              # Settings screen
│   ├── notification.tsx          # Notification preferences
│   ├── (auth)/                   # Authentication flow
│   │   ├── login.tsx             # Login screen
│   │   └── register.tsx          # Registration screen
│   ├── (events)/                 # Event management screens
│   │   ├── events.tsx            # Events list
│   │   ├── current.tsx           # Current events list
│   │   └── permanent.tsx         # Recurring events
│   └── (admin)/                  # Admin panel
│       ├── admin.tsx             # Admin dashboard
│       ├── add-game.tsx          # Add new game
│       └── add-event.tsx         # Create custom event
│
├── components/                   # Reusable UI components
│   ├── events/
│   │   ├── ApiEventCard.tsx      # Event card component
│   │   └── PermanentEventCard.js # Permanent event card
│   ├── layout/
│   │   ├── CustomDrawerContent.tsx # Navigation drawer
│   │   └── Footer.tsx            # App footer
│   └── ui/
│       ├── AnimatedButton.tsx    # Custom button with animations
│       └── Separator.tsx         # Visual separator
│
├── context/                      # React Context providers
│   ├── ThemeContext.tsx          # Theme management
│   ├── UserContext.tsx           # User state and auth
│   ├── FilterContext.tsx         # Event filtering logic
│   └── RegionContext.tsx         # Regional settings
│
├── data/                         # Business logic and data management
│   ├── AutoEventsManager.ts      # Event scraping and import
│   ├── EventInterface.ts         # Type definitions
│   ├── FilterManager.ts          # Filter operations
│   ├── NotificationManager.ts    # Push notification handling
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
├── debug/                        # Development and debugging tools
│   └── autoimport/               # Auto-import testing scripts
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
- **Expo Router** (4.0.21) - File-based routing

### Navigation

- **React Navigation** - Navigation library
  - Drawer Navigator - Side menu
  - Stack Navigator - Screen stacks
  - Bottom Tabs - Tab navigation
  - Material Top Tabs - Swipeable tabs

### State Management

- **React Context API** - Global state
- **AsyncStorage** - Local data persistence

### UI/UX

- **Expo Linear Gradient** - Gradient backgrounds
- **Expo Blur** - Blur effects
- **React Native Gesture Handler** - Touch gestures
- **React Native Reanimated** - Smooth animations
- **Expo Haptics** - Tactile feedback

### Notifications

- **Expo Notifications** - Push notifications
- **Expo Device** - Device information
- **Expo Constants** - App constants

### Data Fetching

- **Axios** - HTTP requests
- **Cheerio** - HTML parsing for web scraping
- **undici** - Fast HTTP/1.1 client

### Development Tools

- **Jest** - Testing framework
- **ESLint** - Code linting
- **TypeScript** - Static typing

## 🎨 Theming System

The app includes a comprehensive theming system with support for light and dark modes.

### Theme Context

```typescript
const { colors, isDark, toggleTheme } = useTheme();
```

### Color Palette

- Background colors (primary, secondary, surface)
- Text colors (primary, secondary, tertiary)
- Accent colors (primary, secondary)
- Status colors (success, warning, error, info)
- Game-specific colors

## 🔔 Notification System

### Features

- Event start/end notifications
- Customizable notification preferences
- Per-game notification settings
- Regional notification timing
- Background notification scheduling

### Usage

```typescript
import { NotificationManager } from "@/data/NotificationManager";

// Schedule notification
await NotificationManager.scheduleEventNotification(event);

// Cancel notification
await NotificationManager.cancelNotification(notificationId);
```

## 🌍 Regional Support

The app supports multiple regions with customized content:

- **NA** (North America)
- **EU** (Europe)
- **ASIA** (Asia)
- **Global** (Worldwide)

Regional settings affect:

- Event timing display
- Server-specific events
- Notification scheduling

## 🔍 Event Filtering

### Filter Types

- **By Game**: Filter events by specific games
- **By Status**: Current, upcoming, or all events
- **By Time**: Today, this week, this month
- **By Region**: Region-specific events

### Filter Context

```typescript
const { filters, updateFilters, clearFilters } = useFilterContext();
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

- Account management
- Theme selection
- Language/region preferences
- Notification settings
- About information

### Admin Panel

- Add new games with icons and descriptions
- Create custom events with full details
- Upload event background images
- Manage existing content

## 🔐 Authentication Flow

### Login

```typescript
const { login } = useUser();
await login(email, password);
```

### Register

```typescript
const { register } = useUser();
await register(username, email, password);
```

### Logout

```typescript
const { logout } = useUser();
await logout();
```

## 🤖 Auto-Import System

### Features

- Scrapes gaming wikis (Fandom, Fextralife, etc.)
- Extracts event names, dates, and images
- Determines event status (current/upcoming)
- Supports multiple games simultaneously
- Handles various date formats

### Supported Games

- Genshin Impact
- Honkai: Star Rail
- Zenless Zone Zero
- Wuthering Waves
- And more...

## 🚀 Development Scripts

```bash
# Start Expo development server
npm start

# Start with clear cache
npm start -- --clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Run tests
npm test

# Lint code
npm run lint
```

## 🔧 Build and Deployment

### EAS Build (Expo Application Services)

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

### Configuration

See `eas.json` for build configurations and profiles.

## 📈 Performance Optimizations

- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Virtualized Lists**: FlatList for long event lists
- **Image Optimization**: Cached images with expo-image
- **Background Tasks**: Efficient data sync
- **Debounced Search**: Optimized filtering

## 🎯 User Experience Features

- **Smooth Animations**: Reanimated for 60fps animations
- **Haptic Feedback**: Tactile responses to interactions
- **Pull to Refresh**: Update events with pull gesture
- **Swipe Gestures**: Intuitive navigation
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages

## 🔒 Security

- JWT token storage in AsyncStorage
- Secure API communication
- Input validation
- XSS prevention
- CSRF protection via token-based auth

## 📝 Code Style

- TypeScript for type safety
- Functional components with hooks
- Custom hooks for reusable logic
- Context for global state
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
