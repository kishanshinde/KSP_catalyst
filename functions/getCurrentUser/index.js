'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { resolveUserRow } = require('./resolveUser');

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
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('\n========== GET CURRENT USER ==========');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Host:', req.headers.host);
        console.log('Origin:', req.headers.origin);
        console.log('Referer:', req.headers.referer);
        console.log('Cookie:', req.headers.cookie);
        console.log('======================================\n');

        const catalystApp = catalyst.initialize(req);
        const userManagement = catalystApp.userManagement();
        const currentUser = await userManagement.getCurrentUser();

        console.log('Current User:', currentUser);

        if (!currentUser) {
            sendJson(req, res, 401, {
                success: false,
                code: 'AUTH_REQUIRED',
                message: 'Authentication required. Please sign in.',
            });
            return;
        }

        const resolved = await resolveUserRow(catalystApp);
        
        let appRole = null;
        if (resolved?.roleRowId) {
            try {
                const roleRows = await catalystApp.zcql().executeZCQLQuery(
                    `SELECT role_name FROM roles WHERE ROWID = ${resolved.roleRowId}`
                );
                appRole = roleRows?.[0]?.roles?.role_name || null;
            } catch (roleErr) {
                console.warn('[getCurrentUser] Role lookup failed:', roleErr.message);
            }
        }

        sendJson(req, res, 200, {
            success: true,
            user: {
                user_id: currentUser.user_id,
                zuid: currentUser.zuid,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name,
                email: currentUser.email_id,
                role: currentUser.role_details?.role_name,
                role_id: currentUser.role_details?.role_id,
                status: currentUser.status,
                confirmed: currentUser.is_confirmed,
                user_rowid: resolved?.rowid || null,
                app_role_rowid: resolved?.roleRowId || null,
                app_role: appRole,
            },
        });
    } catch (err) {
        console.error('[getCurrentUser]', err);

        sendJson(req, res, 500, {
            success: false,
            code: 'AUTH_ERROR',
            message: err.message,
        });
    }
};
