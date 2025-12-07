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

### Lavalink Configuration

The bot uses multiple Lavalink nodes for music playback with automatic fallback. Configuration is stored in `lava.json`:

```json
{
  "nodes": [
    {
      "name": "primary-node",
      "host": "your-lavalink-host",
      "port": 2333,
      "password": "your-password",
      "secure": false,
      "priority": 1
    },
    {
      "name": "backup-node",
      "host": "backup-lavalink-host",
      "port": 443,
      "password": "backup-password",
      "secure": true,
      "priority": 2
    }
  ]
}
```

**Features:**
- Multiple Lavalink nodes with priority-based selection
- Automatic fallback to backup node if primary fails
- Real-time connection status monitoring
- Configurable Spotify and Apple Music integration

### Rate Limit Fix

The bot now uses a fixed shard count (1) instead of auto-detecting to avoid Discord API rate limiting (429 errors). This also reduces the number of clusters to 1 to minimize resource usage.

## Features

### Music Player
- **Like Button**: Like your favorite songs while they're playing! Liked songs are saved to your profile.
- **Interactive Controls**: Previous, Pause/Resume, Next, Stop, Autoplay, and Like buttons
- **Beautiful Now Playing Cards**: Spotify-style cards showing track information
- **Custom Search Engine (Premium)**: Premium users can set their preferred music search engine (YouTube, YouTube Music, Spotify, SoundCloud, Apple Music, Deezer)

### Premium Features
- **Custom Search Engine**: Choose your preferred music provider for all searches
- **Exclusive Access**: Priority support and features

### Support Manager Bot
- **Enhanced Error Messages**: Clear, helpful error messages with better formatting
- **Ticket System**: Complete support ticket management
- **Giveaway System**: Create and manage giveaways
- **User Management**: NoPrefix, Premium, and Blacklist management
- **Moderation Tools**: Warnings system

## Project Structure

```
src/
├── assets/                # Static resources (emojis, filters)
├── bot/                   # Main bot components
│   ├── commands/          # Command implementations (5 categories)
│   │   ├── music/         # Music playback, queue, likes (24 commands)
│   │   ├── info/          # Bot/server information (6 commands)
│   │   ├── user/          # User settings & profile (7 commands)
│   │   ├── admin/         # Admin management (5 commands)
│   │   └── owner/         # Owner-only tools (7 commands)
│   ├── events/            # Event handlers (client, player, context)
│   └── structures/        # Core bot structures (client, manager, etc.)
├── lib/                   # Reusable libraries
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── plugins/               # Modular plugins (support system, etc.)
├── system/                # System-level components
│   ├── loaders/           # Dynamic module loaders
│   └── types/             # Type definitions
└── [index.js, nerox.js, logger.js]  # Entry points
```

## Scripts

- `npm start` - Start the bot
- `npm run support` - Start the Support Manager Bot only
- `npm run build` - Build TypeScript files
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

No license specified.
