'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { validateSessionToken, fetchRoleName, toPublicUser } = require('./session');

function sendJson(req, res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        const catalystApp = catalyst.initialize(req);
        const session = await validateSessionToken(catalystApp, req.headers['x-session-token']);

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
