# Nerox Discord Bot

A Discord music bot with advanced features.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `example.env`:
```bash
cp example.env .env
```

3. Update the `.env` file with your Discord bot token and other credentials:
```
DISCORD_TOKEN=your_discord_bot_token_here
OWNER_IDS=your_discord_user_id
ADMIN_IDS=your_discord_user_id
PREFIX=&
SUPPORT_SERVER=https://discord.gg/your_server
BACKUP_CHANNEL=your_backup_channel_id
WEBHOOK_LOGS=your_logs_webhook_url
WEBHOOK_SERVERADD=your_serveradd_webhook_url
WEBHOOK_SERVERCHUDA=your_serverchuda_webhook_url
WEBHOOK_PLAYERLOGS=your_playerlogs_webhook_url
```

4. Start the bot:
```bash
npm start
```

## Configuration

The bot uses environment variables for configuration. All sensitive data like tokens and webhook URLs should be stored in the `.env` file and never committed to version control.

### Rate Limit Fix

The bot now uses a fixed shard count (1) instead of auto-detecting to avoid Discord API rate limiting (429 errors). This also reduces the number of clusters to 1 to minimize resource usage.

## Database API

The bot includes a Database API server that allows you to access the local JSON database from anywhere. This is useful when you want to run the bot on one server (e.g., danbot.host) and access/manage the database from another location.

### Starting the Database API

**Option 1: Run separately**
```bash
npm run db-api
```

**Option 2: Run with the bot**
Add these to your `.env` file:
```
ENABLE_DB_API=true
DB_API_PORT=3000
DB_API_KEY=your-secret-api-key
```

### Environment Variables for Database API

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_DB_API` | Enable DB API when starting with `npm start` | `false` |
| `DB_API_PORT` | Port for the API server | `3000` |
| `DB_API_KEY` | Secret API key for authentication | `nerox-secret-key` |

### API Endpoints

All endpoints require `x-api-key` header or `?apiKey=` query parameter.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/db/:database/:key` | Get a value |
| GET | `/db/:database` | Get all data from database |
| POST | `/db/:database/:key` | Set a value |
| PUT | `/db/:database/:key` | Update a value |
| DELETE | `/db/:database/:key` | Delete a key |
| GET | `/db/:database/:key/has` | Check if key exists |
| PATCH | `/db/:database/:key/push` | Push to array |
| PUT | `/db/:database/:key/ensure` | Ensure value exists |
| GET | `/db/:database/keys/all` | Get all keys |
| GET | `/db/:database/size/count` | Get database size |

### Using the Client Library

You can use the provided client library to access the database from another location:

```javascript
import { DatabaseClient, createRemoteJosh } from './src/database-api/client.js';

// Option 1: Using DatabaseClient directly
const client = new DatabaseClient('http://your-server:3000', 'your-api-key');
const value = await client.get('noPrefix', 'someKey');
await client.set('noPrefix', 'someKey', { enabled: true });

// Option 2: Using Josh-like wrapper (easier migration)
const noPrefix = createRemoteJosh('http://your-server:3000', 'your-api-key', 'noPrefix');
const data = await noPrefix.get('someKey');
await noPrefix.set('someKey', { enabled: true });
```

### Example: Accessing database from external script

```javascript
// external-script.js
import { createRemoteJosh } from './src/database-api/client.js';

const DB_URL = 'http://your-danbot-host-server:3000';
const API_KEY = 'your-secret-api-key';

// Create remote database connections
const noPrefix = createRemoteJosh(DB_URL, API_KEY, 'noPrefix');
const blacklist = createRemoteJosh(DB_URL, API_KEY, 'blacklist');

// Use them like local databases
async function main() {
    // Check if user has noPrefix enabled
    const hasNoPrefix = await noPrefix.has('123456789');
    console.log('User has noPrefix:', hasNoPrefix);
    
    // Get all blacklisted users
    const entries = await blacklist.entries;
    console.log('Blacklisted users:', entries);
}

main();
```

## Web Dashboard

The bot includes a web dashboard for managing the database through a user-friendly interface.

### Features

- **User Area**: View database contents, search for specific keys
- **Admin Area**: Full CRUD operations, bulk import/export, clear databases
- **Separate Hosting**: Dashboard can be hosted on a different server from the bot

### Starting the Dashboard

**Option 1: Run separately (same server)**
```bash
npm run dashboard
```

**Option 2: Run with the bot**
Add to your `.env` file:
```
ENABLE_DASHBOARD=true
```

**Option 3: Host on a different server**
1. Start the Database API on the bot server:
   ```
   ENABLE_DB_API=true
   DB_API_PORT=3000
   DB_API_KEY=your-secret-api-key
   ```
2. On the dashboard server, configure:
   ```
   DB_API_URL=http://your-bot-server:3000
   DB_API_KEY=your-secret-api-key
   DASHBOARD_PORT=3001
   DASHBOARD_HOST=0.0.0.0
   ```
3. Run `npm run dashboard` on the dashboard server

### Environment Variables for Dashboard

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_DASHBOARD` | Enable dashboard when starting with `npm start` | `false` |
| `DASHBOARD_PORT` | Port for the dashboard | `3001` |
| `DASHBOARD_HOST` | Host to bind to | `0.0.0.0` |
| `DASHBOARD_ADMIN_USER` | Admin username | `admin` |
| `DASHBOARD_ADMIN_PASS` | Admin password | `admin123` |
| `DASHBOARD_USER_PASS` | User area password | `user123` |
| `DB_API_URL` | Remote Database API URL (for separate hosting) | `null` |
| `DB_API_KEY` | API key for Database API | `nerox-secret-key` |
| `DASHBOARD_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `*` |

### Dashboard Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Login page | Public |
| `/user` | User dashboard | User/Admin |
| `/user/view/:database` | View database (read-only) | User/Admin |
| `/user/search` | Search in databases | User/Admin |
| `/admin` | Admin dashboard | Admin only |
| `/admin/database/:database` | Manage database (CRUD) | Admin only |
| `/admin/bulk` | Bulk operations (import/export/clear) | Admin only |

### Default Credentials

⚠️ **Change these in production!**

- **Admin**: `admin` / `admin123`
- **User**: any username / `user123`

## Scripts

- `npm start` - Start the bot
- `npm run db-api` - Start the Database API server only
- `npm run dashboard` - Start the Web Dashboard only
- `npm run build` - Build TypeScript files
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

No license specified.
