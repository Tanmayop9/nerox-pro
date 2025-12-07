# Installation & Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Dashboard (Optional)
The dashboard configuration is hardcoded in `src/dashboard/index.js`:

```javascript
// Line 42-48 in src/dashboard/index.js
const DASHBOARD_PORT = 3001;         // Change port if needed
const DASHBOARD_HOST = '0.0.0.0';    // Change to 'localhost' for local only
const ADMIN_USERNAME = 'admin';       // Change admin username
const ADMIN_PASSWORD = 'admin123';    // ⚠️ CHANGE THIS IN PRODUCTION!
const IS_PRODUCTION = false;          // Set to true in production
```

### 3. Start the Application

#### Option A: Start Everything
```bash
npm start
```

#### Option B: Start Components Separately
```bash
# Start main bot
npm start

# Start dashboard (in another terminal)
npm run dashboard

# Start support manager (in another terminal)
npm run support
```

## Dashboard Setup

### Access Dashboard
Once started, access the dashboard at:
- **URL**: `http://localhost:3001`
- **Admin Panel**: `http://localhost:3001/admin/login`

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change these credentials before deploying to production!

### Dashboard Routes
```
Public Routes (No login required):
├── / or /user              → User dashboard
├── /user/search            → Search databases
└── /user/view/:database    → View specific database (read-only)

Admin Routes (Login required):
├── /admin/login            → Admin login page
├── /admin                  → Admin dashboard
├── /admin/database/:db     → Manage database (CRUD)
└── /admin/bulk             → Bulk operations (import/export/clear)

API Routes:
├── /health                 → Health check endpoint
├── /api/database/:db       → Get database content (JSON)
└── /api/database/:db/:key  → Get specific key (JSON)
```

## New Features

### 🎵 Like Button
When a song is playing:
1. Look for the heart emoji (💖) button below the player controls
2. Click to like the song
3. View your liked songs with: `&showliked` or `&ll`

### 🎛️ Dashboard
- Hardcoded configuration (no .env needed for dashboard)
- Better error messages
- Health check endpoint
- Beautiful console output
- Enhanced error handling

### 🤖 Support Manager
- Improved error messages
- Better user feedback
- Enhanced console output

## Configuration Files

### Main Bot (.env required)
```env
DISCORD_TOKEN=your_bot_token
OWNER_IDS=your_user_id
ADMIN_IDS=admin_user_ids
PREFIX=&
SUPPORT_SERVER=https://discord.gg/your_server
```

### Support Manager (.env required)
```env
SUPPORT_BOT_TOKEN=support_bot_token
SUPPORT_PREFIX=!
SUPPORT_GUILD_ID=your_support_server_id
OWNER_IDS=owner_user_ids
```

### Dashboard (hardcoded in index.js)
No .env needed! Edit directly in:
```
src/dashboard/index.js
Lines 42-48
```

## Database Storage

Databases are stored in: `./database-storage/`

Available databases:
- `noPrefix` - No-prefix access users
- `botstaff` - Bot premium users
- `serverstaff` - Server premium
- `blacklist` - Blacklisted users
- `likedSongs` - User liked songs (NEW!)
- `stats/songsPlayed` - Song statistics
- And more...

## Commands

### Music Commands
```bash
&play <song>        # Play a song
&pause              # Pause playback
&resume             # Resume playback
&skip               # Skip current song
&stop               # Stop playback
&nowplaying         # Show current song
&queue              # Show queue
&like               # Like current song (NEW!)
&showliked          # Show your liked songs (NEW!)
&playliked          # Play your liked songs
&unlike             # Unlike a song
```

### Support Manager Commands
```bash
!shelp              # Show support commands
!ticket new         # Create support ticket
!giveaway create    # Create giveaway
!noprefix add       # Add no-prefix user
!premium add        # Add premium user
!blacklist add      # Blacklist user
!warn               # Warn user
```

## Troubleshooting

### Dashboard won't start
**Error**: `Missing express. Please run: npm install`
- **Solution**: Run `npm install` from project root

**Error**: `EADDRINUSE: Port 3001 already in use`
- **Solution**: Change `DASHBOARD_PORT` in `src/dashboard/index.js`
- Or stop the process using port 3001

**Error**: `Cannot find module 'express'`
- **Solution**: Delete `node_modules` and run `npm install` again

### Like button not working
**Issue**: Button doesn't respond
- **Check**: Bot has "Use External Emojis" permission
- **Check**: User is in the same voice channel as bot
- **Check**: Song is currently playing

**Issue**: "Database error" message
- **Solution**: Ensure bot has write access to `./database-storage/`
- **Solution**: Check database permissions

### Support Manager issues
**Error**: Bot not responding
- **Check**: `SUPPORT_BOT_TOKEN` is correct
- **Check**: Bot has proper permissions in Discord
- **Check**: `SUPPORT_GUILD_ID` matches your server ID

**Error**: Commands not working
- **Check**: Using correct prefix (default: `!`)
- **Check**: Bot is online and connected

## Health Checks

### Dashboard Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 123.456,
  "message": "Dashboard is running"
}
```

### Check Dashboard Console
You should see:
```
╔═══════════════════════════════════════════════════════╗
║          🎛️  NEROX DASHBOARD ONLINE 🎛️               ║
╠═══════════════════════════════════════════════════════╣
║  URL: http://0.0.0.0:3001                            ║
║  Admin Username: admin                               ║
║  Admin Password: admin123                            ║
║  Status: Ready & Listening ✅                        ║
╚═══════════════════════════════════════════════════════╝
```

### Check Support Manager Console
You should see:
```
╔═══════════════════════════════════════════════════════╗
║          🤖 SUPPORT MANAGER BOT ONLINE 🤖            ║
╠═══════════════════════════════════════════════════════╣
║  Bot Tag: YourBot#1234                               ║
║  Status: Ready & Listening ✅                        ║
╚═══════════════════════════════════════════════════════╝
```

## Security Recommendations

### Production Deployment
1. ✅ Change dashboard admin credentials
2. ✅ Set `IS_PRODUCTION = true` in dashboard config
3. ✅ Use HTTPS/SSL certificates
4. ✅ Set up firewall rules
5. ✅ Use strong passwords
6. ✅ Keep dependencies updated
7. ✅ Monitor logs regularly
8. ✅ Back up databases regularly

### Environment Variables
- Never commit `.env` files to git
- Use strong, unique passwords
- Rotate tokens regularly
- Limit access to sensitive files

## Support

For issues or questions:
1. Check this guide first
2. Review `CHANGES_SUMMARY.md` for detailed changes
3. Check `src/dashboard/README.md` for dashboard-specific help
4. Contact the development team

## Version Information

- **Node.js**: >=20.x.x
- **Dashboard**: v2.0 (Hardcoded config)
- **Like Feature**: v1.0
- **Support Manager**: v1.1 (Enhanced)

---

**Last Updated**: December 2024
**Author**: Nerox Development Team
