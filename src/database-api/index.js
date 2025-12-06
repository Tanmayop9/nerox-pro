/**
 * Database API Server
 * This server exposes the local JSON database via REST API
 * so it can be accessed from anywhere
 */

import express from 'express';
import { config as loadEnv } from 'dotenv';
import { josh } from '../functions/josh.js';

loadEnv();

const app = express();
app.use(express.json());

const API_PORT = process.env.DB_API_PORT || 3000;
const API_KEY = process.env.DB_API_KEY;

// Warn if no API key is set
if (!API_KEY) {
    console.warn('[Database API] WARNING: DB_API_KEY is not set! Using insecure default key.');
    console.warn('[Database API] Please set DB_API_KEY environment variable for production use.');
}

const effectiveApiKey = API_KEY || 'nerox-default-key-change-me';

// Database instances cache
const databases = {};

// Get or create database instance
const getDatabase = (name) => {
    if (!databases[name]) {
        databases[name] = josh(name);
    }
    return databases[name];
};

// API Key authentication middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (apiKey !== effectiveApiKey) {
        return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    }
    next();
};

// Apply authentication to all routes
app.use(authenticate);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET - Retrieve a value from database
app.get('/db/:database/:key', async (req, res) => {
    try {
        const { database, key } = req.params;
        const db = getDatabase(database);
        const value = await db.get(key);
        res.json({ success: true, data: value });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Get all data from a database
app.get('/db/:database', async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const entries = await db.entries;
        res.json({ success: true, data: Object.fromEntries(entries) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function for setting values
const handleSetValue = async (req, res, message) => {
    try {
        const { database, key } = req.params;
        const { value } = req.body;
        const db = getDatabase(database);
        await db.set(key, value);
        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST - Set a value in database
app.post('/db/:database/:key', (req, res) => handleSetValue(req, res, 'Value set successfully'));

// PUT - Update a value in database
app.put('/db/:database/:key', (req, res) => handleSetValue(req, res, 'Value updated successfully'));

// DELETE - Remove a key from database
app.delete('/db/:database/:key', async (req, res) => {
    try {
        const { database, key } = req.params;
        const db = getDatabase(database);
        await db.delete(key);
        res.json({ success: true, message: 'Key deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Check if key exists
app.get('/db/:database/:key/has', async (req, res) => {
    try {
        const { database, key } = req.params;
        const db = getDatabase(database);
        const exists = await db.has(key);
        res.json({ success: true, exists });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH - Push value to array
app.patch('/db/:database/:key/push', async (req, res) => {
    try {
        const { database, key } = req.params;
        const { value } = req.body;
        const db = getDatabase(database);
        await db.push(key, value);
        res.json({ success: true, message: 'Value pushed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Ensure value exists (set default if not exists)
app.put('/db/:database/:key/ensure', async (req, res) => {
    try {
        const { database, key } = req.params;
        const { value } = req.body;
        const db = getDatabase(database);
        await db.ensure(key, value);
        const data = await db.get(key);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Get all keys from database
app.get('/db/:database/keys/all', async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const keys = await db.keys;
        res.json({ success: true, keys: [...keys] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Get size of database
app.get('/db/:database/size/count', async (req, res) => {
    try {
        const { database } = req.params;
        const db = getDatabase(database);
        const size = await db.size;
        res.json({ success: true, size });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(API_PORT, () => {
    console.log(`[Database API] Server running on port ${API_PORT}`);
    console.log(`[Database API] Access your database from: http://localhost:${API_PORT}`);
    console.log(`[Database API] Remember to set DB_API_KEY environment variable for security!`);
});

export default app;
