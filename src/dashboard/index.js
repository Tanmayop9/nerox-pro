/**
 * Nerox Dashboard
 * Web interface for managing the bot database
 */

// Check for dependencies before starting
console.log('[Dashboard] Checking dependencies...');
try {
    await import('express');
    console.log('[Dashboard] ✓ express found');
} catch (error) {
    console.error('❌ Missing express. Please run: npm install');
    console.error('   Error:', error.message);
    process.exit(1);
}

let express, fileURLToPath, dirname, join, josh;

try {
    const expressModule = await import('express');
    express = expressModule.default;
    
    const urlModule = await import('node:url');
    fileURLToPath = urlModule.fileURLToPath;
    
    const pathModule = await import('node:path');
    dirname = pathModule.dirname;
    join = pathModule.join;
    
    const joshModule = await import('../functions/josh.js');
    josh = joshModule.josh;
    
    console.log('[Dashboard] ✓ All dependencies loaded');
} catch (error) {
    console.error('❌ Failed to load dependencies:', error.message);
    process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ============== HARDCODED CONFIGURATION ==============
// Change these values as needed
const DASHBOARD_PORT = 3001;
const DASHBOARD_HOST = '0.0.0.0';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const IS_PRODUCTION = false;

// Cookie options - secure in production
const getCookieOptions = (sessionId, isDelete = false) => {
    let cookie = `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict`;
    if (IS_PRODUCTION) {
        cookie += '; Secure';
    }
    if (isDelete) {
        cookie += '; Max-Age=0';
    }
    return cookie;
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Database access - local database only
const databases = {};

const getDatabase = (name) => {
    try {
        if (!databases[name]) {
            databases[name] = josh(name);
        }
        return databases[name];
    } catch (error) {
        console.error(`[Dashboard] Error accessing database '${name}':`, error.message);
        throw new Error(`Database '${name}' is not accessible: ${error.message}`);
    }
};

// Available databases
const availableDatabases = [
    'noPrefix',
    'botmods',
    'botstaff',
    'serverstaff',
    'blacklist',
    'ignore',
    'msgCount',
    'twoFourSeven',
    'stats/songsPlayed',
    'stats/commandsUsed',
    'stats/friends',
    'stats/linkfireStreaks',
    'stats/lastLinkfire'
];

// Session storage (simple in-memory for demo)
const sessions = new Map();

// Generate session ID
const generateSessionId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Auth middleware for admin only
const requireAdmin = (req, res, next) => {
    const sessionId = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    
    const session = sessions.get(sessionId);
    
    if (!session || session.role !== 'admin') {
        return res.redirect('/admin/login');
    }
    
    req.session = session;
    next();
};

// Middleware to check if user is admin (for navbar display)
const checkAdmin = (req, res, next) => {
    const sessionId = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    
    const session = sessions.get(sessionId);
    
    if (session && session.role === 'admin') {
        req.isAdmin = true;
        req.session = session;
    } else {
        req.isAdmin = false;
        req.session = { username: 'User', role: 'user' };
    }
    
    next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        uptime: process.uptime(),
        message: 'Dashboard is running'
    });
});

// Home page - redirects to user dashboard (no login required)
app.get('/', (req, res) => {
    res.redirect('/user');
});

// Admin login page
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { title: 'Admin Login', error: null });
});

// Admin login handler
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const sessionId = generateSessionId();
        sessions.set(sessionId, { username, role: 'admin' });
        res.setHeader('Set-Cookie', getCookieOptions(sessionId));
        return res.redirect('/admin');
    }
    
    res.render('admin/login', { title: 'Admin Login', error: 'Invalid credentials' });
});

// Logout
app.get('/logout', (req, res) => {
    const sessionId = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    sessions.delete(sessionId);
    res.setHeader('Set-Cookie', getCookieOptions('', true));
    res.redirect('/');
});

// ==================== USER ROUTES (No Auth Required) ====================

// User dashboard
app.get('/user', checkAdmin, async (req, res) => {
    try {
        // Get some stats for display
        let stats = {
            noPrefix: 0,
            blacklist: 0
        };
        
        try {
            const noPrefixDb = getDatabase('noPrefix');
            const blacklistDb = getDatabase('blacklist');
            
            stats.noPrefix = await noPrefixDb.size;
            stats.blacklist = await blacklistDb.size;
        } catch (dbError) {
            console.error('[Dashboard] Error fetching stats:', dbError.message);
        }
        
        res.render('user/dashboard', {
            title: 'User Dashboard',
            username: req.session.username,
            role: req.session.role,
            isAdmin: req.isAdmin,
            stats
        });
    } catch (error) {
        console.error('[Dashboard] Error in /user route:', error);
        res.status(500).render('error', { 
            title: 'Error',
            message: error.message,
            role: req.session?.role || 'user',
            isAdmin: req.isAdmin || false
        });
    }
});

// User - View specific database (read only)
app.get('/user/view/:database', checkAdmin, async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const entries = await db.entries;
        const data = Object.fromEntries(entries);
        
        res.render('user/view', {
            title: `View: ${database}`,
            database,
            data,
            username: req.session.username,
            role: req.session.role,
            isAdmin: req.isAdmin
        });
    } catch (error) {
        res.render('error', {
            title: 'Error',
            message: error.message,
            role: req.session.role,
            isAdmin: req.isAdmin
        });
    }
});

// User - Search in database
app.get('/user/search', checkAdmin, async (req, res) => {
    const { database, key } = req.query;
    let result = null;
    let searched = false;
    
    if (database && key) {
        searched = true;
        try {
            const db = getDatabase(database);
            result = await db.get(key);
        } catch (error) {
            result = { error: error.message };
        }
    }
    
    res.render('user/search', {
        title: 'Search Database',
        databases: availableDatabases,
        database,
        key,
        result,
        searched,
        username: req.session.username,
        role: req.session.role,
        isAdmin: req.isAdmin
    });
});

// ==================== ADMIN ROUTES ====================

// Admin dashboard
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const stats = {};
        for (const dbName of availableDatabases) {
            try {
                const db = getDatabase(dbName);
                stats[dbName] = await db.size;
            } catch {
                stats[dbName] = 0;
            }
        }
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            username: req.session.username,
            role: req.session.role,
            databases: availableDatabases,
            stats
        });
    } catch (error) {
        res.render('error', {
            title: 'Error',
            message: error.message,
            role: req.session.role
        });
    }
});

// Admin - View/Edit database
app.get('/admin/database/:database', requireAdmin, async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const entries = await db.entries;
        const data = Object.fromEntries(entries);
        
        res.render('admin/database', {
            title: `Database: ${database}`,
            database,
            data,
            username: req.session.username,
            role: req.session.role,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        res.render('error', {
            title: 'Error',
            message: error.message,
            role: req.session.role
        });
    }
});

// Admin - Add/Edit entry
app.post('/admin/database/:database/set', requireAdmin, async (req, res) => {
    try {
        const { database } = req.params;
        const { key, value } = req.body;
        const db = getDatabase(database);
        
        let parsedValue;
        try {
            parsedValue = JSON.parse(value);
        } catch {
            parsedValue = value;
        }
        
        await db.set(key, parsedValue);
        res.redirect(`/admin/database/${database}?success=Value set successfully`);
    } catch (error) {
        res.redirect(`/admin/database/${database}?error=${encodeURIComponent(error.message)}`);
    }
});

// Admin - Delete entry
app.post('/admin/database/:database/delete', requireAdmin, async (req, res) => {
    try {
        const { database } = req.params;
        const { key } = req.body;
        const db = getDatabase(database);
        
        await db.delete(key);
        res.redirect(`/admin/database/${database}?success=Entry deleted successfully`);
    } catch (error) {
        res.redirect(`/admin/database/${database}?error=${encodeURIComponent(error.message)}`);
    }
});

// Admin - Bulk operations page
app.get('/admin/bulk', requireAdmin, (req, res) => {
    res.render('admin/bulk', {
        title: 'Bulk Operations',
        databases: availableDatabases,
        username: req.session.username,
        role: req.session.role,
        result: null
    });
});

// Admin - Execute bulk operation
app.post('/admin/bulk', requireAdmin, async (req, res) => {
    const { database, operation, data } = req.body;
    let result = { success: false, message: '' };
    
    try {
        const db = getDatabase(database);
        
        if (operation === 'import') {
            const entries = JSON.parse(data);
            const importPromises = Object.entries(entries).map(([key, value]) => db.set(key, value));
            await Promise.all(importPromises);
            result = { success: true, message: `Imported ${Object.keys(entries).length} entries` };
        } else if (operation === 'export') {
            const entries = await db.entries;
            result = { 
                success: true, 
                message: 'Export successful',
                data: JSON.stringify(Object.fromEntries(entries), null, 2)
            };
        } else if (operation === 'clear') {
            const keys = await db.keys;
            const keysArray = [...keys];
            const deletePromises = keysArray.map(key => db.delete(key));
            await Promise.all(deletePromises);
            result = { success: true, message: `Cleared ${keysArray.length} entries` };
        }
    } catch (error) {
        result = { success: false, message: error.message };
    }
    
    res.render('admin/bulk', {
        title: 'Bulk Operations',
        databases: availableDatabases,
        username: req.session.username,
        role: req.session.role,
        result
    });
});

// ==================== API ROUTES (for AJAX) ====================

app.get('/api/database/:database', checkAdmin, async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const entries = await db.entries;
        res.json({ success: true, data: Object.fromEntries(entries) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/database/:database/:key', checkAdmin, async (req, res) => {
    try {
        const { database, key } = req.params;
        const db = getDatabase(database);
        const value = await db.get(key);
        res.json({ success: true, data: value });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Dashboard] Error:', err);
    res.status(500).send('Internal Server Error: ' + err.message);
});

// Start server
try {
    app.listen(DASHBOARD_PORT, DASHBOARD_HOST, () => {
        console.log('\n╔═══════════════════════════════════════════════════════╗');
        console.log('║          🎛️  NEROX DASHBOARD ONLINE 🎛️               ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        const urlStr = `http://${DASHBOARD_HOST}:${DASHBOARD_PORT}`;
        const urlPadding = Math.max(0, 48 - urlStr.length);
        console.log(`║  URL: ${urlStr}${' '.repeat(urlPadding)}║`);
        console.log(`║  Admin Username: ${ADMIN_USERNAME.padEnd(36)}║`);
        console.log(`║  Admin Password: ${ADMIN_PASSWORD.padEnd(36)}║`);
        console.log('║  Status: Ready & Listening ✅                        ║');
        console.log('╚═══════════════════════════════════════════════════════╝\n');
        console.log('[Dashboard] Public routes:');
        console.log('  • http://localhost:' + DASHBOARD_PORT + '/ (User Dashboard)');
        console.log('  • http://localhost:' + DASHBOARD_PORT + '/user/search (Database Search)');
        console.log('\n[Dashboard] Admin routes:');
        console.log('  • http://localhost:' + DASHBOARD_PORT + '/admin/login (Admin Login)');
        console.log('  • http://localhost:' + DASHBOARD_PORT + '/admin (Admin Dashboard)');
        console.log('\n[Dashboard] Using local database\n');
    });
} catch (error) {
    console.error('❌ Failed to start dashboard server:', error.message);
    process.exit(1);
}

export default app;
