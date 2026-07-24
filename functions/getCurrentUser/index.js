'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { validateSessionToken, fetchRoleName, toPublicUser } = require('./session');

function setCorsHeaders(req, res) {
    const origin = req?.headers?.origin || 'http://localhost:3001';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(req, res, statusCode, payload) {
    setCorsHeaders(req, res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        const catalystApp = catalyst.initialize(req);
        const session = await validateSessionToken(catalystApp, req.headers.authorization);

        if (!session) {
            return sendJson(req, res, 401, {
                success: false,
                code: 'AUTH_REQUIRED',
                message: 'Authentication required. Please sign in.',
            });
        }

        const roleName = await fetchRoleName(catalystApp, session.user.role_rowid);

        return sendJson(req, res, 200, {
            success: true,
            user: toPublicUser(session.user, roleName),
        });
    } catch (err) {
        console.error('[getCurrentUser]', err);
        return sendJson(req, res, 500, {
            success: false,
            code: 'AUTH_ERROR',
            message: err.message,
        });
    }
};
