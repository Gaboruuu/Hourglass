# Events Sync Service

Automated service to sync game events from external APIs to the Hourglass database.

## Features

- 🔄 Automatically fetches events from Hoyoverse API (Genshin Impact, Honkai Star Rail)
- 💾 Syncs events to MySQL database
- 🖼️ Manages event background images
- 🗑️ Cleans up expired events
- ⏰ Configurable scheduling
- 🔧 Multiple deployment options

## Setup

### 1. Install Dependencies

```bash
cd EventsSync
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your database:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=hourglass
DB_SSL=false

# Sync every 6 hours (default)
SYNC_SCHEDULE=0 */6 * * *
```

### 3. Test Connection

Run a one-time sync to test:

```bash
npm run sync
```

## Usage

### Option 1: Manual Sync (One-Time)

Run the sync process once:

```bash
npm run sync
```

### Option 2: Node.js Scheduler (Recommended for Development)

Run continuously with automatic scheduling:

```bash
npm run schedule
```

This will:

- Run an initial sync immediately
- Schedule automatic syncs based on `SYNC_SCHEDULE` in `.env`
- Keep running until you stop it (Ctrl+C)

### Option 3: Windows Task Scheduler (Recommended for Production)

For production use on your PC, set up Windows Task Scheduler:

1. Open **Task Scheduler**
2. Click **Create Basic Task**
3. Name it: "Hourglass Events Sync"
4. Trigger: **Daily** (or your preference)
5. Action: **Start a program**
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `"C:\Users\Gaboruu\Informatica\Projects\Hourglass\EventsSync\src\sync.js"`
   - Start in: `C:\Users\Gaboruu\Informatica\Projects\Hourglass\EventsSync`

#### Advanced Trigger Options:

- Repeat task every: **6 hours**
- For a duration of: **Indefinitely**

### Option 4: PM2 (Advanced)

For persistent background service:

```bash
# Install PM2 globally
npm install -g pm2

# Start the scheduler
pm2 start src/scheduler.js --name hourglass-sync

# View logs
pm2 logs hourglass-sync

# Stop
pm2 stop hourglass-sync

# Auto-start on PC boot
pm2 startup
pm2 save
```

## Cron Schedule Examples

Edit `SYNC_SCHEDULE` in `.env`:

```bash
# Every 6 hours (default)
SYNC_SCHEDULE=0 */6 * * *

# Every 12 hours
SYNC_SCHEDULE=0 */12 * * *

# Every day at 8 AM
SYNC_SCHEDULE=0 8 * * *

# Every day at midnight
SYNC_SCHEDULE=0 0 * * *

# Every 3 hours
SYNC_SCHEDULE=0 */3 * * *
```

Format: `minute hour day month weekday`

## Project Structure

```
EventsSync/
├── src/
│   ├── api/
│   │   └── hoyoverse.js       # API fetching logic
│   ├── config/
│   │   └── db.config.js       # Database configuration
│   ├── services/
│   │   └── eventService.js    # Database operations
│   ├── sync.js                # Main sync script (one-time)
│   └── scheduler.js           # Scheduled runner
├── .env                       # Configuration (create from .env.example)
├── .env.example              # Example configuration
├── package.json
└── README.md
```

## What It Does

1. **Fetches Events**: Retrieves current and upcoming events from Hoyoverse API
2. **Filters**: Removes sign-in/daily login events
3. **Syncs to Database**:
   - Inserts new events
   - Updates existing events
   - Adds event background images
4. **Cleanup**: Deletes expired events
5. **Reports**: Shows summary of changes

## Troubleshooting

### Database Connection Issues

Ensure your database credentials in `.env` are correct and the MySQL server is running.

### API Issues

If API fetching fails:

- Check your internet connection
- Verify the API endpoint is accessible: `https://api.ennead.cc/mihoyo/genshin/calendar`

### Scheduling Issues

If using Windows Task Scheduler and it's not running:

1. Check task history in Task Scheduler
2. Ensure the node.exe path is correct
3. Verify the script path uses absolute paths
4. Check that the user account has proper permissions

## Logs

When using node-cron or PM2, check console output for:

- ✓ Success indicators (green checkmarks)
- ✗ Error indicators
- Sync statistics (inserted, updated, deleted)

## Future Enhancements

- [ ] Add support for more games
- [ ] Email notifications on sync completion/errors
- [ ] Web dashboard to view sync history
- [ ] Retry logic for failed API requests
- [ ] Discord webhook notifications
