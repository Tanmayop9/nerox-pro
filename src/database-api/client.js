/**
 * Database API Client
 * Use this client to access the Nerox database from anywhere
 * 
 * Usage:
 * import { DatabaseClient } from './client.js';
 * const db = new DatabaseClient('http://your-server:3000', 'your-api-key');
 * 
 * // Get value
 * const value = await db.get('noPrefix', 'someKey');
 * 
 * // Set value
 * await db.set('noPrefix', 'someKey', { data: 'value' });
 */

export class DatabaseClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = apiKey;
    }

    async request(method, endpoint, body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    // Get a value from the database
    async get(database, key) {
        const result = await this.request('GET', `/db/${database}/${key}`);
        return result.data;
    }

    // Get all data from a database
    async getAll(database) {
        const result = await this.request('GET', `/db/${database}`);
        return result.data;
    }

    // Set a value in the database
    async set(database, key, value) {
        return await this.request('POST', `/db/${database}/${key}`, { value });
    }

    // Delete a key from the database
    async delete(database, key) {
        return await this.request('DELETE', `/db/${database}/${key}`);
    }

    // Check if a key exists
    async has(database, key) {
        const result = await this.request('GET', `/db/${database}/${key}/has`);
        return result.exists;
    }

    // Push a value to an array
    async push(database, key, value) {
        return await this.request('PATCH', `/db/${database}/${key}/push`, { value });
    }

    // Ensure a value exists (set default if not exists)
    async ensure(database, key, defaultValue) {
        const result = await this.request('PUT', `/db/${database}/${key}/ensure`, { value: defaultValue });
        return result.data;
    }

    // Get all keys from a database
    async keys(database) {
        const result = await this.request('GET', `/db/${database}/keys/all`);
        return result.keys;
    }

    // Get size of database
    async size(database) {
        const result = await this.request('GET', `/db/${database}/size/count`);
        return result.size;
    }

    // Health check
    async health() {
        return await this.request('GET', '/health');
    }
}

// Create a Josh-like wrapper for easier migration
export const createRemoteJosh = (baseUrl, apiKey, databaseName) => {
    const client = new DatabaseClient(baseUrl, apiKey);
    
    return {
        get: (key) => client.get(databaseName, key),
        set: (key, value) => client.set(databaseName, key, value),
        delete: (key) => client.delete(databaseName, key),
        has: (key) => client.has(databaseName, key),
        push: (key, value) => client.push(databaseName, key, value),
        ensure: (key, defaultValue) => client.ensure(databaseName, key, defaultValue),
        get keys() { return client.keys(databaseName); },
        get size() { return client.size(databaseName); },
        get entries() { return client.getAll(databaseName).then(data => Object.entries(data)); },
    };
};

export default DatabaseClient;
