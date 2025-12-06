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

## Web Dashboard

The bot includes a web dashboard for managing the database through a user-friendly interface. The dashboard runs alongside the bot on the same server.

### Features

- **User Area**: View database contents, search for specific keys
- **Admin Area**: Full CRUD operations, bulk import/export, clear databases

### Starting the Dashboard

**Option 1: Run separately**
```bash
npm run dashboard
```

**Option 2: Run with the bot**
Add to your `.env` file:
```
ENABLE_DASHBOARD=true
```

### Environment Variables for Dashboard

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_DASHBOARD` | Enable dashboard when starting with `npm start` | `false` |
| `DASHBOARD_PORT` | Port for the dashboard | `3001` |
| `DASHBOARD_HOST` | Host to bind to | `0.0.0.0` |
| `DASHBOARD_ADMIN_USER` | Admin username | `admin` |
| `DASHBOARD_ADMIN_PASS` | Admin password | `admin123` |
| `DASHBOARD_USER_PASS` | User area password | `user123` |

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

- `npm start` - Start the bot (and dashboard if enabled)
- `npm run dashboard` - Start the Web Dashboard only
- `npm run build` - Build TypeScript files
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

No license specified.
