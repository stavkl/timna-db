/**
 * Backend Proxy Server for Wikibase API
 * Handles authentication and bypasses CORS restrictions
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your frontend)
const path = require('path');
app.use(express.static(path.join(__dirname)));

// Configuration
const WIKIBASE_URL = process.env.WIKIBASE_URL || 'https://timna-database.wikibase.cloud';
const API_ENDPOINT = `${WIKIBASE_URL}/w/api.php`;

// Store session data (in production, use Redis or database)
const sessions = new Map();

/**
 * Login endpoint - authenticates with Wikibase and stores session
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        // Step 1: Get login token
        const tokenResponse = await fetch(`${API_ENDPOINT}?action=query&meta=tokens&type=login&format=json`);
        const tokenData = await tokenResponse.json();
        const loginToken = tokenData.query.tokens.logintoken;

        // Extract cookies from token response
        const cookies = tokenResponse.headers.raw()['set-cookie'] || [];
        const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');

        // Step 2: Login with cookies
        const loginParams = new URLSearchParams({
            action: 'login',
            lgname: username,
            lgpassword: password,
            lgtoken: loginToken,
            format: 'json'
        });

        const loginResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: loginParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieHeader
            }
        });

        const loginData = await loginResponse.json();

        console.log('Login response:', JSON.stringify(loginData, null, 2));

        if (loginData.login.result !== 'Success') {
            const errorMsg = loginData.login.reason || loginData.login.result;
            return res.status(401).json({ error: `Login failed: ${errorMsg}` });
        }

        // Merge cookies from login response
        const loginCookies = loginResponse.headers.raw()['set-cookie'] || [];
        const allCookies = [...cookies, ...loginCookies];
        const finalCookieHeader = allCookies.map(cookie => cookie.split(';')[0]).join('; ');

        // Step 3: Get CSRF token for editing with cookies
        const csrfResponse = await fetch(`${API_ENDPOINT}?action=query&meta=tokens&format=json`, {
            headers: {
                'Cookie': finalCookieHeader
            }
        });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.query.tokens.csrftoken;

        // Create session data
        const sessionData = {
            username,
            password,
            csrfToken,
            loginToken,
            cookies: finalCookieHeader,
            createdAt: Date.now()
        };

        // For Vercel serverless, encode session data as the sessionId
        // In production, use a proper session store like Redis
        const sessionId = Buffer.from(JSON.stringify(sessionData)).toString('base64');

        // Also store in memory for local development
        sessions.set(sessionId, sessionData);

        // Clean up old sessions (older than 1 hour)
        cleanupSessions();

        res.json({
            success: true,
            sessionId,
            message: 'Logged in successfully'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create new item endpoint
 */
app.post('/api/create-item', async (req, res) => {
    const { sessionId, data } = req.body;

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    try {
        const params = new URLSearchParams({
            action: 'wbeditentity',
            new: 'item',
            data: JSON.stringify(data),
            summary: 'Created via Archaeological Site Form',
            token: session.csrfToken,
            format: 'json'
        });

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': session.cookies
            }
        });

        const result = await response.json();

        if (result.error) {
            return res.status(400).json({ error: result.error.info });
        }

        res.json({ success: true, entity: result.entity });

    } catch (error) {
        console.error('Create item error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add statement/claim to existing item
 */
app.post('/api/add-claim', async (req, res) => {
    const { sessionId, entityId, property, value, datatype } = req.body;

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    try {
        // Build the claim based on datatype
        const datavalue = buildDataValue(value, datatype);

        const claim = {
            mainsnak: {
                snaktype: 'value',
                property: property,
                datavalue: datavalue
            },
            type: 'statement'
        };

        const params = new URLSearchParams({
            action: 'wbsetclaim',
            claim: JSON.stringify(claim),
            summary: 'Added via Archaeological Site Form',
            token: session.csrfToken,
            format: 'json'
        });

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': session.cookies
            }
        });

        const result = await response.json();

        if (result.error) {
            return res.status(400).json({ error: result.error.info });
        }

        res.json({ success: true, claim: result.claim });

    } catch (error) {
        console.error('Add claim error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Set label, description, or alias
 */
app.post('/api/set-label', async (req, res) => {
    const { sessionId, entityId, labels, descriptions, aliases } = req.body;

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    try {
        const data = {};
        if (labels) data.labels = labels;
        if (descriptions) data.descriptions = descriptions;
        if (aliases) data.aliases = aliases;

        const params = new URLSearchParams({
            action: 'wbeditentity',
            id: entityId,
            data: JSON.stringify(data),
            summary: 'Updated via Archaeological Site Form',
            token: session.csrfToken,
            format: 'json'
        });

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': session.cookies
            }
        });

        const result = await response.json();

        if (result.error) {
            return res.status(400).json({ error: result.error.info });
        }

        res.json({ success: true, entity: result.entity });

    } catch (error) {
        console.error('Set label error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        wikibaseUrl: WIKIBASE_URL,
        dirname: __dirname,
        env: process.env.VERCEL ? 'vercel' : 'local'
    });
});

/**
 * Root redirect to main menu
 */
app.get('/', (req, res) => {
    res.redirect('/src/index.html');
});

/**
 * Debug route to check what's happening
 */
app.get('/debug', (req, res) => {
    const fs = require('fs');
    const files = fs.readdirSync(__dirname);
    res.json({
        dirname: __dirname,
        files: files,
        srcExists: fs.existsSync(path.join(__dirname, 'src')),
        indexExists: fs.existsSync(path.join(__dirname, 'src', 'index.html'))
    });
});

/**
 * Helper: Build datavalue based on type
 */
function buildDataValue(value, datatype) {
    switch (datatype) {
        case 'wikibase-item':
            return {
                value: {
                    'entity-type': 'item',
                    'numeric-id': parseInt(value.replace('Q', '')),
                    id: value
                },
                type: 'wikibase-entityid'
            };

        case 'string':
        case 'url':
        case 'external-id':
            return {
                value: value,
                type: 'string'
            };

        case 'quantity':
            return {
                value: {
                    amount: value.toString(),
                    unit: '1'
                },
                type: 'quantity'
            };

        case 'time':
            return {
                value: {
                    time: value,
                    timezone: 0,
                    before: 0,
                    after: 0,
                    precision: 11,
                    calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
                },
                type: 'time'
            };

        case 'globe-coordinate':
            return {
                value: {
                    latitude: parseFloat(value.lat),
                    longitude: parseFloat(value.lon),
                    altitude: null,
                    precision: 0.0001,
                    globe: 'http://www.wikidata.org/entity/Q2'
                },
                type: 'globecoordinate'
            };

        default:
            return {
                value: value,
                type: 'string'
            };
    }
}

/**
 * Helper: Generate session ID
 */
function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Helper: Get session from sessionId (works with in-memory and encoded sessions)
 */
function getSession(sessionId) {
    if (!sessionId) {
        return null;
    }

    // Try in-memory first (for local development)
    if (sessions.has(sessionId)) {
        return sessions.get(sessionId);
    }

    // Try decoding base64 sessionId (for Vercel serverless)
    try {
        const sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString('utf-8'));
        // Verify session hasn't expired (1 hour)
        if (Date.now() - sessionData.createdAt < 60 * 60 * 1000) {
            return sessionData;
        }
    } catch (error) {
        console.error('Failed to decode session:', error);
    }

    return null;
}

/**
 * Create new entity endpoint
 */
app.post('/api/create-entity', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const { entity } = req.body;

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!entity) {
        return res.status(400).json({ error: 'Entity data required' });
    }

    try {
        // Create the entity via Wikibase API
        const params = new URLSearchParams({
            action: 'wbeditentity',
            new: 'item',
            data: JSON.stringify(entity),
            token: session.csrfToken,
            format: 'json'
        });

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': session.cookies
            },
            body: params
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.info || 'Failed to create entity' });
        }

        res.json(data);

    } catch (error) {
        console.error('Create entity error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update existing entity endpoint
 */
app.post('/api/update-entity/:id', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const { entity } = req.body;
    const itemId = req.params.id;

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!entity) {
        return res.status(400).json({ error: 'Entity data required' });
    }

    try {
        // Update the entity via Wikibase API
        // NOTE: Without clear=true, this will MERGE (add) new claims to existing ones
        // This means we'll get duplicates if the same value is submitted again
        // TODO: Implement proper claim removal/update logic to prevent duplicates
        const params = new URLSearchParams({
            action: 'wbeditentity',
            id: itemId,
            data: JSON.stringify(entity),
            token: session.csrfToken,
            format: 'json'
        });

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': session.cookies
            },
            body: params
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.info || 'Failed to update entity' });
        }

        res.json(data);

    } catch (error) {
        console.error('Update entity error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete statements from an entity
 */
app.post('/api/delete-statements/:id', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const { guids } = req.body;
    const itemId = req.params.id;

    const session = getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!guids || !Array.isArray(guids) || guids.length === 0) {
        return res.status(400).json({ error: 'Statement GUIDs required' });
    }

    try {
        console.log(`Deleting ${guids.length} statement(s) from ${itemId}:`, guids);

        // Delete statements using wbremoveclaims API
        const params = new URLSearchParams({
            action: 'wbremoveclaims',
            claim: guids.join('|'),  // Multiple GUIDs separated by pipe
            token: session.csrfToken,
            format: 'json'
        });

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': session.cookies
            },
            body: params
        });

        const data = await response.json();

        if (data.error) {
            console.error('Wikibase API error:', data.error);
            return res.status(400).json({ error: data.error.info || 'Failed to delete statements' });
        }

        console.log(`Successfully deleted ${guids.length} statement(s)`);
        res.json({ success: true, claims: data.claims });

    } catch (error) {
        console.error('Delete statements error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Helper: Clean up old sessions
 */
function cleanupSessions() {
    // Sessions expire after 8 hours (full workday)
    const eightHoursAgo = Date.now() - (8 * 60 * 60 * 1000);
    for (const [sessionId, session] of sessions.entries()) {
        if (session.createdAt < eightHoursAgo) {
            sessions.delete(sessionId);
            console.log(`Cleaned up expired session: ${sessionId}`);
        }
    }
}

// Clean up sessions every hour (only in local development)
if (process.env.VERCEL !== '1') {
    setInterval(cleanupSessions, 60 * 60 * 1000);
}

// Start server (only for local development)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Wikibase Proxy Server running on http://localhost:${PORT}`);
        console.log(`📊 Connected to: ${WIKIBASE_URL}`);
        console.log(`\n📝 Form Generator:`);
        console.log(`   • Main Menu: http://localhost:${PORT}/src/index.html\n`);
    });
}

// Export for Vercel serverless
module.exports = app;
