# Hourglass App

The mobile app for Hourglass, built with React Native and Expo in TypeScript. It shows current and upcoming events for your games, tracks recurring end-game content, and reminds you before anything expires.

## Features

- **Event browser.** Current, upcoming, and expired events for each game, with search, filters, and sorting.
- **Recurring content.** Weekly and monthly modes (and more complex schedules) are built into the app, with their next reset calculated automatically.
- **Region support.** Europe, North America, and Asia servers, each with its own daily reset time. Every date in the app follows the selected region.
- **Reminders.** Local notifications 3 days, 1 day, and 2 hours before an event ends, configurable per game and per event type. Events expiring at the same time are combined into one notification.
- **Notification history.** A timeline of scheduled and delivered reminders.
- **Personalization.** Pick which games you follow, and choose a light, dark, or pure-black theme.
- **What's new.** An in-app changelog and update popup after each release.
- **Admin tools.** Admin accounts can add events from inside the app.

## How it's built

- **Navigation:** React Navigation with a drawer for the main sections and a stack for detail screens.
- **State:** React Context providers for theme, user, region, events, filters, and notification history. Preferences are saved on the device with AsyncStorage.
- **Data layer:** a central events manager fetches events from the API, merges in the built-in recurring events, drops expired ones, and refreshes when the app returns to the foreground.
- **Notifications:** a notification service schedules, groups, and cancels reminders through Expo Notifications, and reports each change to the history view.
- **Quality:** TypeScript strict mode and Jest unit tests for the notification scheduling and game-lookup logic.

```
app/          Screens (home, events, settings, notifications, auth, admin)
components/   Reusable UI (event cards, drawer, footer, modals)
context/      Global state providers
data/         Events manager, notification service, filters, recurring events
theme/        Color palettes
utils/        Shared helpers
```
