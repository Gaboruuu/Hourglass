# 🔄 EventsSync - Multi-Source Event Synchronization Service

> **Portfolio Project**: Automated event aggregation and synchronization service demonstrating web scraping, data validation, timezone handling, and scheduled task management.

## 📋 Overview

EventsSync is a specialized Node.js service that automatically synchronizes gaming events from multiple external sources into the Hourglass platform. It handles the complex task of extracting event data from different gaming APIs and websites, transforming the data into a unified format, and maintaining timezone consistency across a global audience.

## 🎯 Key Challenges Addressed

### Multi-Source Data Integration

- **HoYoverse Games**: Genshin Impact, Honkai: Star Rail, Zenless Zone Zero
- **Project WUWA**: Wuthering Waves event tracking
- **Custom Events**: Manual event entry from various sources
- **Data Normalization**: Transform heterogeneous data into unified schema

### Timezone Complexity

- **Global Audience**: Events occur across different timezones
- **Format Variety**: Different API formats for datetime representation
- **Timezone Parsing**: Complex timezone detection and conversion logic
- **User Preferences**: Region-specific event timing display

### Data Quality & Validation

- **Schema Validation**: Ensure data matches expected structure
- **Duplicate Detection**: Prevent duplicate event entries
- **Missing Data Handling**: Graceful handling of incomplete data
- **Error Recovery**: Robust retry logic for failed synchronization

## 🏗️ Architecture

### Service Structure

```
EventsSync/
├── src/
│   ├── api/
│   │   ├── hoyoverse.js        # HoYoverse events aggregator
│   │   └── wuwa.js             # WUWA events aggregator
│   ├── config/
│   │   └── versionDates.js     # Game version/content calendars
│   └── services/
│       ├── codesService.js     # Redemption code tracking
│       └── eventService.js     # Event aggregation logic
├── scheduler.js                # Cron job orchestration
├── sync.js                      # Main synchronization runner
├── debug-api.js                # Development debugging tools
└── test-*.js                   # Integration tests
```

## 🛠️ Technical Implementation

### Redemption Code Service

**codesService.js**

- Tracks in-game redemption codes for all supported games
- Monitors code expiration and validity
- Aggregates codes from multiple sources
- Provides code metadata including:
  - Game association
  - Code value
  - Expiration date
  - Redemption requirements
  - Rewards (primogems, enhancement materials, etc.)

### Event Aggregation Service

**eventService.js**

- Central aggregation point for all event sources
- Validates incoming event data against schema
- Handles timezone normalization
- Manages event deduplication
- Merges data from HoYoverse and WUWA APIs
- Stores processed events for backend API consumption

### Timezone Resolution

**Challenge**: Different sources provide times in different formats and timezones.

**Solution**:

- Custom timezone parsing logic (`test-correct-timezone.js`, `test-timezone-fix.js`)
- Validates timezone offsets against known regions
- Converts all times to UTC for storage
- Displays times in user's selected region on frontend

### Version Dates Configuration

**versionDates.js**

- Game version release calendars for:
  - Genshin Impact
  - Honkai: Star Rail
  - Zenless Zone Zero
  - Honkai Impact 3rd
  - Other HoYoverse titles
- Tracks maintenance windows and content update schedules
- Maps version numbers to release dates
- Enables version-aware event scheduling

### Data Enrichment

- Adds game-specific metadata to events
- Calculates event duration
- Derives region-specific details
- Adds source attribution
- Includes event categories (main event, side quest, etc.)

## 🔄 Scheduled Synchronization

### Cron Job Orchestration

**scheduler.js**

- Coordinates periodic synchronization tasks
- Configurable intervals (hourly, 4-hourly, daily)
- Graceful error handling and retry logic
- Prevents service overload with rate limiting
- Monitors sync health and performance

Example synchronization patterns:

```javascript
// Sync events every 4 hours
scheduler.schedule("0 */4 * * *", async () => {
  await syncService.syncAllEvents();
});

// Daily deep sync with validation
scheduler.schedule("0 2 * * *", async () => {
  await syncService.fullRefresh();
});
```

### Sync Process Flow

1. **Initiation**: Cron job triggers at scheduled interval
2. **API Fetching**: Query HoYoverse and WUWA APIs
3. **Data Extraction**: Parse event details from responses
4. **Timezone Normalization**: Convert all times to UTC
5. **Validation**: Check data structure and completeness
6. **Deduplication**: Prevent duplicate event entries
7. **Backend Sync**: Push new/updated events to API
8. **Logging**: Record sync status and any errors
9. **History**: Maintain sync logs and statistics

### Data Validation Pipeline

```
Raw API Data
    ↓
Schema Validation
    ↓
Timezone Normalization
    ↓
Duplicate Detection
    ↓
Business Logic Validation
    ↓
Database Persistence
```

## 💡 Development Features

### Debug Tools

- **debug-api.js**: Direct API testing and data inspection utilities
- **test-hoyoverse.js**: HoYoverse integration testing and validation
- **test-wuwa.js**: WUWA integration testing and validation
- **test-date-parsing.js**: Timezone parsing verification with edge cases
- **test-timezone-fix.js**: Validates timezone offset calculations and conversions
- **test-correct-timezone.js**: Tests timezone accuracy against known regions
- **daily-events.json**: Sample test data for local development and validation

### Test Data Management

- **ignored-events.json**: Known events to exclude from sync (duplicates, test events)
- **daily-events.json**: Daily event snapshots for regression testing
- Enables offline testing and data validation

### Testing Approach

- Integration tests against real APIs
- Date parsing validation for edge cases
- Timezone offset verification against multiple regions
- Data structure consistency checks
- Batch processing performance validation
- Error recovery testing

## 📊 Data Transformation Pipeline

### Input: Multiple Sources

```json
{
  "source": "hoyoverse",
  "game": "genshin",
  "title": "Summertime Odyssey",
  "startTime": "2024-06-01T10:00+08:00",
  "endTime": "2024-06-22T03:59+08:00"
}
```

### Processing

1. **Timezone Extraction**: Parse timezone offset from timestamp
2. **UTC Conversion**: Convert all times to UTC
3. **Validation**: Ensure data matches event schema
4. **Enrichment**: Add derived fields (duration, region, etc.)
5. **Deduplication**: Check for existing events

### Output: Unified Format

```json
{
  "id": "uuid",
  "game": "genshin",
  "title": "Summertime Odyssey",
  "startTime": "2024-06-01T02:00:00Z",
  "endTime": "2024-06-21T19:59:00Z",
  "regions": ["global", "china"],
  "source": "hoyoverse",
  "synced_at": "2024-05-12T14:30:00Z"
}
```

## 🔐 Reliability Patterns

- **Error Logging**: Comprehensive logging for debugging
- **Retry Logic**: Automatic retry on transient failures
- **Fallback Data**: Use cached data if sync fails
- **Health Checks**: Verify data freshness
- **Rate Limiting**: Respect API rate limits
- **Graceful Degradation**: Partial failures don't block sync

## 📈 Performance Considerations

- **Batch Processing**: Process events in batches to reduce DB load
- **Change Detection**: Only sync modified data
- **Caching**: Cache static reference data
- **Connection Pooling**: Reuse database connections
- **Parallel Requests**: Concurrent API calls where possible

## 🔗 Integration Points

- **Backend API**: POST events to Hourglass backend
- **Database**: Store synchronized event data
- **External APIs**: HoYoverse, WUWA event feeds
- **Scheduler**: Orchestrated via Node.js cron service
