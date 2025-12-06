/**
 * Nerox Dashboard
 * Web interface for managing the bot database
 * Supports hosting on a separate host from the bot
 * Uses Database API when DB_API_URL is configured
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

// Database API configuration for separate hosting
const DB_API_URL = process.env.DB_API_URL || null;
const DB_API_KEY = process.env.DB_API_KEY || 'nerox-secret-key';

// CORS configuration for separate hosting
const ALLOWED_ORIGINS = process.env.DASHBOARD_ALLOWED_ORIGINS?.split(',') || ['*'];

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

// CORS middleware for separate hosting
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Database access - supports both local josh and remote API
const databases = {};

// Remote database client for separate hosting
const remoteDbRequest = async (method, database, key = null, value = null) => {
    if (!DB_API_URL) return null;
    
    const url = key 
        ? `${DB_API_URL}/db/${database}/${key}`
        : `${DB_API_URL}/db/${database}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': DB_API_KEY
        }
    };
    
    if (value !== null && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify({ value });
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error(`[Dashboard] DB API request failed: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error(`[Dashboard] DB API request error:`, error.message);
        return null;
    }
};

// Database wrapper that works with both local and remote
const getDatabase = (name) => {
    if (!databases[name]) {
        if (DB_API_URL) {
            // Remote database via API
            databases[name] = {
                get size() {
                    return remoteDbRequest('GET', name).then(data => 
                        data ? Object.keys(data).length : 0
                    );
                },
                get entries() {
                    return remoteDbRequest('GET', name).then(data => 
                        data ? Object.entries(data) : []
                    );
                },
                get keys() {
                    return remoteDbRequest('GET', name).then(data => 
                        data ? Object.keys(data) : []
                    );
                },
                get: (key) => remoteDbRequest('GET', name, key),
                set: (key, value) => remoteDbRequest('POST', name, key, value),
                delete: (key) => remoteDbRequest('DELETE', name, key)
            };
        } else {
            // Local database
            databases[name] = josh(name);
        }
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
    console.log(`[Dashboard] Mode: ${DB_API_URL ? 'Remote DB API' : 'Local Database'}`);
    if (DB_API_URL) {
        console.log(`[Dashboard] DB API URL: ${DB_API_URL}`);
    }
});

export default app;
