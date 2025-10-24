# ⏳ Hourglass

> **Note for Interviewers**: This is a private portfolio project showcasing full-stack mobile development skills. The repository is shared for evaluation purposes only and is not intended for public distribution.

## 📋 Overview

Hourglass is a comprehensive event tracking mobile application designed for gaming communities. It aggregates and manages gaming events from multiple sources, providing users with real-time notifications and personalized event tracking across various popular games.

The application features a modern React Native frontend built with Expo, paired with a robust Node.js/Express backend, demonstrating full-stack mobile development capabilities.

You can find the app in App Store and Google Play soon.

## 🎯 Key Features

- **Multi-Game Event Tracking**: Monitor events across multiple gaming platforms
- **Real-Time Updates**: Automatic event synchronization from various sources
- **Smart Notifications**: Customizable alerts for upcoming and ongoing events
- **User Authentication**: Secure JWT-based authentication system
- **Admin Panel**: Comprehensive event and game management interface
- **Permanent Events**: Track recurring weekly, monthly, and custom-schedule events
- **Dynamic Filtering**: Filter events by game, region, and time period
- **Theme Support**: Dark and light mode with custom color schemes
- **Regional Customization**: Region-specific event timing and content

## 🏗️ Project Structure

```
Hourglass/
├── BackEnd/              # Node.js/Express REST API
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── middleware/   # Authentication middleware
│   │   ├── models/       # Data models (User, Event, Game, Background)
│   │   └── routes/       # API endpoints
│   └── package.json
│
├── Hourglass/            # React Native (Expo) Mobile App
│   ├── app/              # Screen components (Expo Router)
│   │   ├── (auth)/       # Authentication screens
│   │   ├── (events)/     # Event management screens
│   │   └── (admin)/      # Admin panel
│   ├── components/       # Reusable UI components
│   ├── context/          # React Context providers
│   ├── data/             # Data management and business logic
│   └── theme/            # Theming and styling
│
└── package.json          # Root workspace configuration
```

## 🛠️ Technology Stack

### Frontend (Mobile App)

- **Framework**: React Native (Expo SDK 52)
- **Navigation**: Expo Router + React Navigation
- **State Management**: React Context API
- **Language**: TypeScript
- **UI Components**: Custom components with gesture handling
- **Notifications**: Expo Notifications
- **Storage**: AsyncStorage
- **HTTP Client**: Axios

### Backend (API Server)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (Development) / MySQL (Production)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs for password hashing
- **CORS**: Enabled for cross-origin requests
- **Scheduled Tasks**: Cron jobs for event updates

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Gaboruuu/Hourglass.git
   cd Hourglass
   ```

2. **Install root dependencies**

   ```bash
   npm install
   ```

3. **Setup Backend**

   ```bash
   cd BackEnd
   npm install

   # Create .env file with required variables
   # See BackEnd/README.md for configuration details

   # Initialize database
   npm run init-db

   # Start backend server
   npm run dev
   ```

4. **Setup Frontend**

   ```bash
   cd Hourglass
   npm install

   # Start Expo development server
   npm start
   ```

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
