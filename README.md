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

## Project Structure

```
src/
├── config/
│   └── resources/         # Bot resources (emojis, filters)
├── core/
│   ├── helpers/           # Utility helpers
│   ├── loaders/           # Module loaders
│   ├── structures/        # Core classes and structures
│   ├── types/             # Type definitions
│   └── utilities/         # Core utilities and functions
├── handlers/
│   ├── command-handlers/  # Command implementations
│   └── event-handlers/    # Event handlers
└── modules/
    └── support-system/    # Support manager module
```

## Scripts

- `npm start` - Start the bot
- `npm run support` - Start the Support Manager Bot only
- `npm run build` - Build TypeScript files
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

No license specified.
