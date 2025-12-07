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
```

**Note**: Webhooks are automatically created in guild `1439610258283823217` under a hidden "bot logs" category when the bot starts for the first time.

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

### Dashboard Configuration

The dashboard now uses **hardcoded configuration** instead of environment variables for easier setup!

To change dashboard settings:
1. Open `src/dashboard/index.js`
2. Find the `HARDCODED CONFIGURATION` section
3. Update these values:
   - `DASHBOARD_PORT` (default: `3001`)
   - `DASHBOARD_HOST` (default: `0.0.0.0`)
   - `ADMIN_USERNAME` (default: `admin`)
   - `ADMIN_PASSWORD` (default: `admin123`)
   - `IS_PRODUCTION` (default: `false`)

See `src/dashboard/README.md` for detailed configuration instructions.

### Dashboard Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/` | User dashboard (auto-open) | Public |
| `/user` | User dashboard | Public |
| `/user/view/:database` | View database (read-only) | Public |
| `/user/search` | Search in databases | Public |
| `/admin/login` | Admin login page | Public |
| `/admin` | Admin dashboard | Admin only |
| `/admin/database/:database` | Manage database (CRUD) | Admin only |
| `/admin/bulk` | Bulk operations (import/export/clear) | Admin only |

### Admin Credentials

⚠️ **Change these in production!**

- **Admin**: `admin` / `admin123`

**Note**: User area is publicly accessible without login. Only admin functions require authentication.

## Features

### Music Player
- **Like Button**: Like your favorite songs while they're playing! Liked songs are saved to your profile.
- **Interactive Controls**: Previous, Pause/Resume, Next, Stop, Autoplay, and Like buttons
- **Beautiful Now Playing Cards**: Spotify-style cards showing track information

### Support Manager Bot
- **Enhanced Error Messages**: Clear, helpful error messages with better formatting
- **Ticket System**: Complete support ticket management
- **Giveaway System**: Create and manage giveaways
- **User Management**: NoPrefix, Premium, and Blacklist management
- **Moderation Tools**: Warnings system

## Scripts

- `npm start` - Start the bot (and dashboard if enabled)
- `npm run dashboard` - Start the Web Dashboard only
- `npm run support` - Start the Support Manager Bot only
- `npm run build` - Build TypeScript files
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

No license specified.
