# Nerox Dashboard

Web interface for managing the bot database with a user-friendly UI.

## Configuration

All configuration is **hardcoded** in `index.js` for easy setup. No `.env` file needed!

### Default Settings

```javascript
DASHBOARD_PORT = 3001
DASHBOARD_HOST = '0.0.0.0'
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin123'
IS_PRODUCTION = false
```

### To Change Configuration

1. Open `src/dashboard/index.js`
2. Find the section marked `// ============== HARDCODED CONFIGURATION ==============`
3. Update the values:
   ```javascript
   const DASHBOARD_PORT = 3001;        // Change port number
   const DASHBOARD_HOST = '0.0.0.0';   // Change host (use 'localhost' for local only)
   const ADMIN_USERNAME = 'admin';      // Change admin username
   const ADMIN_PASSWORD = 'admin123';   // Change admin password
   const IS_PRODUCTION = false;         // Set to true for production (enables HTTPS cookies)
   ```

## Starting the Dashboard

### Option 1: Run separately
```bash
npm run dashboard
```

### Option 2: Run with the bot
Add to your bot's startup script or set `ENABLE_DASHBOARD=true` in `.env`

## Features

### Public Access (No Login Required)
- **User Dashboard** (`/` or `/user`) - View basic statistics
- **Database Search** (`/user/search`) - Search across all databases
- **Database Viewer** (`/user/view/:database`) - Read-only view of specific databases

### Admin Access (Login Required)
- **Admin Dashboard** (`/admin`) - Full control panel
- **Database Management** (`/admin/database/:database`) - Create, Update, Delete entries
- **Bulk Operations** (`/admin/bulk`) - Import, Export, Clear databases

### Special Endpoints
- **Health Check** (`/health`) - API endpoint for monitoring dashboard status

## Default Admin Credentials

⚠️ **IMPORTANT: Change these in production!**

- **Username:** `admin`
- **Password:** `admin123`

## Available Databases

The dashboard provides access to these databases:
- `noPrefix` - Users with no-prefix access
- `botmods` - Bot moderators
- `botstaff` - Bot premium users
- `serverstaff` - Server premium users
- `blacklist` - Blacklisted users
- `ignore` - Ignored channels/users
- `msgCount` - Message counts
- `twoFourSeven` - 24/7 enabled servers
- `stats/songsPlayed` - Song play statistics
- `stats/commandsUsed` - Command usage statistics
- `stats/friends` - Friends list
- `stats/linkfireStreaks` - Linkfire streaks
- `stats/lastLinkfire` - Last Linkfire timestamp

## Security Notes

1. **Change default credentials** - Use strong passwords in production
2. **Use HTTPS in production** - Set `IS_PRODUCTION = true`
3. **Restrict access** - Use firewall rules to limit who can access the dashboard
4. **Session security** - Sessions are stored in memory and cleared on restart

## Troubleshooting

### Dashboard won't start
1. Make sure dependencies are installed: `npm install`
2. Check if port 3001 is available: `netstat -ano | findstr :3001`
3. Check console output for specific error messages

### Can't login
1. Verify you're using the correct username and password from `index.js`
2. Clear browser cookies and try again
3. Check if `IS_PRODUCTION` matches your environment (disable for local dev)

### Database errors
1. Ensure the bot has created the databases (run the bot first)
2. Check file permissions on `./database-storage/` directory
3. Verify `josh` module is properly installed

## Support

For issues or questions, refer to the main bot documentation or contact the development team.
