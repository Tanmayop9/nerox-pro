/**
 * Nerox Dashboard
 * Web interface for managing the bot database
 */

import express from 'express';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { josh } from '../functions/josh.js';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Configuration
const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3001;
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || '0.0.0.0';
const ADMIN_USERNAME = process.env.DASHBOARD_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.DASHBOARD_ADMIN_PASS || 'admin123';
const USER_PASSWORD = process.env.DASHBOARD_USER_PASS || 'user123';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
    if (!databases[name]) {
        databases[name] = josh(name);
    }
    return databases[name];
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

// Auth middleware
const requireAuth = (role) => (req, res, next) => {
    const sessionId = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.redirect('/login');
    }
    
    if (role === 'admin' && session.role !== 'admin') {
        return res.status(403).render('error', { 
            title: 'Access Denied',
            message: 'You need admin privileges to access this page',
            role: session.role
        });
    }
    
    req.session = session;
    next();
};

// Routes

// Home page
app.get('/', (req, res) => {
    const sessionId = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    const session = sessions.get(sessionId);
    
    if (session) {
        return res.redirect(session.role === 'admin' ? '/admin' : '/user');
    }
    res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', error: null });
});

// Login handler
app.post('/login', (req, res) => {
    const { username, password, role } = req.body;
    
    if (role === 'admin') {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const sessionId = generateSessionId();
            sessions.set(sessionId, { username, role: 'admin' });
            res.setHeader('Set-Cookie', getCookieOptions(sessionId));
            return res.redirect('/admin');
        }
    } else if (role === 'user') {
        if (password === USER_PASSWORD) {
            const sessionId = generateSessionId();
            sessions.set(sessionId, { username: username || 'User', role: 'user' });
            res.setHeader('Set-Cookie', getCookieOptions(sessionId));
            return res.redirect('/user');
        }
    }
    
    res.render('login', { title: 'Login', error: 'Invalid credentials' });
});

// Logout
app.get('/logout', (req, res) => {
    const sessionId = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    sessions.delete(sessionId);
    res.setHeader('Set-Cookie', getCookieOptions('', true));
    res.redirect('/login');
});

// ==================== USER ROUTES ====================

// User dashboard
app.get('/user', requireAuth('user'), async (req, res) => {
    try {
        // Get some stats for display
        const noPrefixDb = getDatabase('noPrefix');
        const blacklistDb = getDatabase('blacklist');
        
        const noPrefixCount = await noPrefixDb.size;
        const blacklistCount = await blacklistDb.size;
        
        res.render('user/dashboard', {
            title: 'User Dashboard',
            username: req.session.username,
            role: req.session.role,
            stats: {
                noPrefix: noPrefixCount,
                blacklist: blacklistCount
            }
        });
    } catch (error) {
        res.render('error', { 
            title: 'Error',
            message: error.message,
            role: req.session.role
        });
    }
});

// User - View specific database (read only)
app.get('/user/view/:database', requireAuth('user'), async (req, res) => {
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
            role: req.session.role
        });
    } catch (error) {
        res.render('error', {
            title: 'Error',
            message: error.message,
            role: req.session.role
        });
    }
});

// User - Search in database
app.get('/user/search', requireAuth('user'), async (req, res) => {
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
        role: req.session.role
    });
});

// ==================== ADMIN ROUTES ====================

// Admin dashboard
app.get('/admin', requireAuth('admin'), async (req, res) => {
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
app.get('/admin/database/:database', requireAuth('admin'), async (req, res) => {
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
app.post('/admin/database/:database/set', requireAuth('admin'), async (req, res) => {
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
app.post('/admin/database/:database/delete', requireAuth('admin'), async (req, res) => {
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
app.get('/admin/bulk', requireAuth('admin'), (req, res) => {
    res.render('admin/bulk', {
        title: 'Bulk Operations',
        databases: availableDatabases,
        username: req.session.username,
        role: req.session.role,
        result: null
    });
});

// Admin - Execute bulk operation
app.post('/admin/bulk', requireAuth('admin'), async (req, res) => {
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

app.get('/api/database/:database', requireAuth('user'), async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const entries = await db.entries;
        res.json({ success: true, data: Object.fromEntries(entries) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/database/:database/:key', requireAuth('user'), async (req, res) => {
    try {
        const { database, key } = req.params;
        const db = getDatabase(database);
        const value = await db.get(key);
        res.json({ success: true, data: value });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(DASHBOARD_PORT, DASHBOARD_HOST, () => {
    console.log(`[Dashboard] Running on http://${DASHBOARD_HOST}:${DASHBOARD_PORT}`);
    console.log(`[Dashboard] Admin login: ${ADMIN_USERNAME}`);
    console.log(`[Dashboard] Using local database`);
});

export default app;
