# 🔄 EventsSync - Multi-Source Event Synchronization Service

> **Portfolio Project**: Automated event aggregation and synchronization service demonstrating web scraping, data validation, timezone handling, and scheduled task management.

## 📋 Overview

EventsSync is a specialized Node.js service that automatically synchronizes gaming events from multiple external sources into the Hourglass platform. It handles the complex task of extracting event data from different gaming APIs and websites, transforming the data into a unified format, and maintaining timezone consistency across a global audience.

## 🎯 Key Challenges Addressed

### Multi-Source Data Integration

- **HoYoverse Games**: Genshin Impact, Honkai: Star Rail (event calendar), Zenless Zone Zero (event notices)
- **Wuthering Waves**: Event data scraped from the community wiki with cheerio
- **Data Normalization**: Transform heterogeneous data into unified schema

### Date & Timezone Complexity

- **Global Audience**: Events occur across different timezones
- **Format Variety**: Dates embedded in free-text descriptions in many formats
- **Version-Relative Dates**: Phrases like *"After the Version 2.3 update"* or *"End of Version 2.3"* resolved to real dates
- **User Preferences**: Region-specific event timing display

### Data Quality & Validation

- **Date Validation**: Events with unparseable dates are excluded and reported
- **Duplicate Detection**: Prevent duplicate event entries
- **Missing Data Handling**: Graceful handling of incomplete data
- **Error Isolation**: A failed import doesn't stop the rest of the sync

## 🏗️ Architecture

### Service Structure

```
EventsSync/
├── src/
│   ├── api/
│   │   ├── hoyoverse.js        # HoYoverse events aggregator
│   │   └── wuwa.js             # Wuthering Waves wiki scraper
│   ├── config/
│   │   └── versionDates.js     # Game version release calendars
│   └── services/
│       └── eventService.js     # Date resolution, classification, backend import
├── ignored-events.json         # Events excluded from sync
├── daily-events.json           # Events tagged as daily login
├── scheduler.js                # Local cron scheduler (alternative to CI)
├── sync.js                     # Main synchronization runner
├── debug-api.js                # Development debugging tools
└── test-*.js                   # Integration tests

.github/workflows/sync-events.yml  # Daily scheduled run on GitHub Actions
```

## 🛠️ Technical Implementation

### Event Aggregation Service

**eventService.js**

- Central aggregation point for all event sources
- Resolves version-relative dates to real dates
- Classifies events as main or side
- Batch-checks events against the backend to find new ones
- Merges data from HoYoverse feeds and the Wuthering Waves wiki
- Imports new events through the backend API

### Date Resolution

**Challenge**: Sources describe dates in free text, in different formats and timezones, and often relative to game versions.

**Solution**:

- Custom date-range parsing for event descriptions
- Timezone handling verified with dedicated test scripts (`test-correct-timezone.js`, `test-timezone-fix.js`)
- Version-relative dates resolved through the version release calendar
- Displays times in user's selected region on frontend

### Version Dates Configuration

**versionDates.js**

- Game version release calendars for:
  - Genshin Impact
  - Honkai: Star Rail
  - Zenless Zone Zero
  - Honkai Impact 3rd
- Maps version numbers to release dates
- Turns *"After Version x.x"* into that version's release date and *"End of Version x.x"* into the next version's release date

### Data Enrichment

- Adds game-specific metadata to events
- Calculates event duration
- Tags daily-login events
- Includes event categories (main events for long or version-bound events, side events otherwise)

## 🔄 Scheduled Synchronization

### GitHub Actions Workflow

**.github/workflows/sync-events.yml**

- Runs the sync every day at 03:00 UTC
- Can also be triggered manually from the Actions tab
- Uploads a report of invalid events as a workflow artifact

```yaml
on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:
```

**scheduler.js** provides the same daily schedule as a long-running local process, with an initial sync on startup.

### Sync Process Flow

1. **Initiation**: Scheduled workflow triggers daily
2. **Fetching**: Query HoYoverse feeds and the Wuthering Waves wiki
3. **Data Extraction**: Parse event details from responses
4. **Filtering**: Skip ignored events and tag daily-login events
5. **Date Resolution**: Parse dates and resolve version-relative dates
6. **Deduplication**: Batch-check against the backend
7. **Backend Sync**: Push new events to the API
8. **Logging**: Record sync status and any errors
9. **Reporting**: Invalid events saved to a report for review

### Data Validation Pipeline

```
Raw Source Data
    ↓
Ignore List Filtering
    ↓
Date Parsing & Version Resolution
    ↓
Event Classification
    ↓
Duplicate Detection (batch check)
    ↓
Persistence via Backend API
```

## 💡 Development Features

### Debug Tools

- **debug-api.js**: Direct API testing and data inspection utilities
- **test-hoyoverse.js**: HoYoverse integration testing and validation
- **test-wuwa.js**: WUWA integration testing and validation
- **test-date-parsing.js**: Timezone parsing verification with edge cases
- **test-timezone-fix.js**: Validates timezone offset calculations and conversions
- **test-correct-timezone.js**: Tests timezone accuracy against known regions

### Sync Configuration

- **ignored-events.json**: Known events to exclude from sync (e.g. livestream announcements, events without valid dates), each with a reason
- **daily-events.json**: Events to tag as daily login events

### Testing Approach

- Integration tests against real APIs
- Date parsing validation for edge cases
- Timezone offset verification against multiple regions
- Data structure consistency checks

## 📊 Data Transformation Pipeline

### Input: Multiple Sources

```json
{
  "game": "genshin",
  "name": "Summertime Odyssey",
  "description": "Event Duration: After the Version 4.8 update – 2024/08/10 03:59"
}
```

### Processing

1. **Filtering**: Skip ignored events
2. **Date Parsing**: Extract the date range from the description
3. **Version Resolution**: Replace version-relative dates with real dates
4. **Enrichment**: Add derived fields (event type, daily login)
5. **Deduplication**: Check for existing events

### Output: Unified Format

```json
{
  "game_id": "4",
  "event_name": "Summertime Odyssey",
  "start_date": "2024-07-17",
  "expiry_date": "2024-08-10",
  "event_type": "main",
  "daily_login": false
}
```

## 🔐 Reliability Patterns

- **Error Logging**: Comprehensive logging for debugging
- **Invalid Event Reports**: Unparseable events collected for review instead of being imported
- **Graceful Degradation**: Partial failures don't block sync
- **Manual Re-runs**: The workflow can be triggered on demand

## 📈 Performance Considerations

- **Batch Processing**: One batch request checks all events against the backend
- **Change Detection**: Only new events are imported

## 🔗 Integration Points

- **Backend API**: Batch-check and POST events to Hourglass backend
- **Database**: Synchronized events stored through the backend
- **External Sources**: HoYoverse event feeds, Wuthering Waves wiki
- **Scheduler**: GitHub Actions scheduled workflow
