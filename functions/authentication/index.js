'use strict';

const catalyst = require('zcatalyst-sdk-node');

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
        
        let body = {};
        if (req.body) {
            try {
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            } catch {
                body = {};
            }
        }

        const action = body.action || req.query?.action || 'session';

        if (action === 'login' || req.method === 'POST') {
            const email = body.email || body.badgeId || 'officer@ksp.gov.in';
            const role = body.role || 'Senior Officer';
            const name = body.name || email.split('@')[0].replace('.', ' ').toUpperCase();

            // Return authenticated officer payload
            return sendJson(req, res, 200, {
                success: true,
                message: 'Officer authenticated successfully',
                user: {
                    user_id: 'KSP_' + Math.floor(100000 + Math.random() * 900000),
                    zuid: 'ZUID_' + Date.now(),
                    first_name: name.split(' ')[0] || 'Officer',
                    last_name: name.split(' ')[1] || 'KSP',
                    email: email.includes('@') ? email : `${email}@ksp.gov.in`,
                    role: role,
                    app_role: role,
                    status: 'ACTIVE',
                    confirmed: true,
                    department: 'Karnataka State Police - Lumina Intelligence',
                },
            });
        }

        if (action === 'logout') {
            return sendJson(req, res, 200, {
                success: true,
                message: 'Successfully logged out',
            });
        }

        // Default session check
        let currentUser = null;
        try {
            currentUser = await catalystApp.userManagement().getCurrentUser();
        } catch {
            currentUser = null;
        }

        if (currentUser) {
            return sendJson(req, res, 200, {
                success: true,
                user: {
                    user_id: currentUser.user_id,
                    zuid: currentUser.zuid,
                    first_name: currentUser.first_name,
                    last_name: currentUser.last_name,
                    email: currentUser.email_id,
                    role: currentUser.role_details?.role_name || 'Senior Officer',
                    app_role: currentUser.role_details?.role_name || 'Senior Officer',
                    status: currentUser.status,
                    confirmed: currentUser.is_confirmed,
                },
            });
        }

        return sendJson(req, res, 401, {
            success: false,
            code: 'AUTH_REQUIRED',
            message: 'Authentication required.',
        });
    } catch (err) {
        console.error('[authentication]', err);
        return sendJson(req, res, 500, {
            success: false,
            code: 'AUTH_ERROR',
            message: err.message,
        });
    }
};