# Hourglass — Agent Instructions

> This file is read by AI agents (Antigravity, Copilot, Cursor, etc.) working on this project.
> It defines the changelog workflow and coding conventions that must be followed.

---

## Project Overview

**Hourglass** is a React Native (Expo) mobile app that tracks in-game events across multiple gacha/live-service games. It shows upcoming events, banners, and maintenance windows with notification support.

**Tech stack**: Expo Router, TypeScript, React Navigation (Drawer + Stack), AsyncStorage, custom theme system (light/dark/black), REST backend.

---

## Changelog Workflow

### After completing any feature, fix, or improvement

Append an entry to the **Unreleased Changes** section below using the format:

```
- [category] Description of the change
```

Where `category` is one of:
- `feature` — New functionality
- `fix` — Bug fix
- `improvement` — Enhancement to existing functionality
- `breaking` — Breaking change that affects existing behavior

### When the developer says "time to release"

1. **Review** all unreleased items below
2. **Determine version bump** based on the changes:
   - `patch` (x.x.X) — Bug fixes only
   - `minor` (x.X.0) — New features, no breaking changes
   - `major` (X.0.0) — Breaking changes or major milestones
   - Let the developer override if they prefer a different bump
3. **Create a new entry** at the top of the `CHANGELOG` array in `Hourglass/data/changelog.ts`:
   - Set `version` to the new version string
   - Set `date` to today's date (YYYY-MM-DD)
   - Set `title` to a short descriptive release name
   - Set `summary` to a brief one-liner for the update popup (keep it friendly and concise)
   - Set `type` to the release type (`major`, `minor`, or `patch`)
   - Move all unreleased items into the `changes` array
4. **Update version** in both `Hourglass/app.json` (`expo.version`) and `Hourglass/package.json` (`version`)
5. **Clear** the Unreleased Changes section below (keep the heading, remove the entries)

---

## Unreleased Changes

<!-- Add entries here as you work. They will be compiled into the next release. -->
- [fix] Apply original game icons to notification history screen and notification settings

---

## Coding Conventions

- **Imports**: Use `@/` path aliases (e.g., `@/components/ui/...`, `@/data/...`, `@/context/...`)
- **Theming**: Always use `useTheme()` hook for colors — never hardcode color values
- **Styling**: Define `StyleSheet.create()` inside the component (after `useTheme()`) so styles react to theme changes
- **State management**: Use React Context for global state, AsyncStorage for persistence
- **File structure**:
  - `app/` — Screens (Expo Router file-based routing)
  - `components/` — Reusable UI components
  - `context/` — React Context providers
  - `data/` — Data managers, interfaces, and data files
  - `theme/` — Color definitions
  - `utils/` — Utility functions
  - `hooks/` — Custom React hooks
- **Types**: Use TypeScript interfaces/types — avoid `any` where possible
- **Navigation**: Expo Router with React Navigation Drawer + Stack
