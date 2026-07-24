'use strict';

const catalyst = require('zcatalyst-sdk-node');
const bcrypt = require('bcryptjs');
const {
    hashToken,
    generateToken,
    formatDateTime,
    fetchRoleName,
    toPublicUser,
    SESSION_TTL_MS,
} = require('./session');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

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

function escapeSql(value) {
    return String(value).replace(/'/g, "''");
}

function safeParseJson(str) {
    if (!str) return {};
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

function readRequestBody(req) {
    return new Promise((resolve) => {
        if (req.body && Object.keys(req.body).length > 0) {
            resolve(typeof req.body === 'string' ? safeParseJson(req.body) : req.body);
            return;
        }
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => resolve(safeParseJson(raw)));
        req.on('error', () => resolve({}));
    });
}

async function findUserByEmail(catalystApp, email) {
    const rows = await catalystApp.zcql().executeZCQLQuery(
        `SELECT ROWID, full_name, email, phone_number, role_rowid, is_active, password_hash, failed_login_attempts, locked_until FROM users WHERE email = '${escapeSql(email)}'`
    );
    return rows?.[0]?.users || null;
}

async function handleLogin(catalystApp, req, res, body) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
        return sendJson(req, res, 400, { success: false, code: 'MISSING_FIELDS', message: 'Email and password are required.' });
    }

    const genericFailure = () =>
        sendJson(req, res, 401, { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });

    const user = await findUserByEmail(catalystApp, email);
    if (!user || user.is_active === false) {
        return genericFailure();
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
        return sendJson(req, res, 401, {
            success: false,
            code: 'ACCOUNT_LOCKED',
            message: 'Too many failed attempts. Please try again later or contact your administrator.',
        });
    }

    const passwordValid = user.password_hash
        ? await bcrypt.compare(password, user.password_hash)
        : false;

    const table = catalystApp.datastore().table('users');

    if (!passwordValid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const update = { ROWID: user.ROWID, failed_login_attempts: attempts };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            update.locked_until = formatDateTime(new Date(Date.now() + LOCKOUT_MS));
        }
        try {
            await table.updateRow(update);
        } catch (err) {
            console.warn('[authentication] Failed to record failed attempt:', err.message);
        }
        return genericFailure();
    }

    try {
        await table.updateRow({
            ROWID: user.ROWID,
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: formatDateTime(new Date()),
        });
    } catch (err) {
        console.warn('[authentication] Failed to update login metadata:', err.message);
    }

    const rawToken = generateToken();
    try {
        await catalystApp.datastore().table('user_sessions').insertRow({
            user_rowid: user.ROWID,
            session_token_hash: hashToken(rawToken),
            expires_at: formatDateTime(new Date(Date.now() + SESSION_TTL_MS)),
            ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
            user_agent: req.headers['user-agent'] || null,
        });
    } catch (err) {
        console.error('[authentication] Failed to create session:', err.message);
        return sendJson(req, res, 500, { success: false, code: 'SESSION_ERROR', message: 'Could not start a session. Please try again.' });
    }

    const roleName = await fetchRoleName(catalystApp, user.role_rowid);
    return sendJson(req, res, 200, {
        success: true,
        session_token: rawToken,
        user: toPublicUser(user, roleName),
    });
}

async function handleLogout(catalystApp, req, res) {
    const rawToken = req.headers.authorization;
    if (rawToken) {
        try {
            const rows = await catalystApp.zcql().executeZCQLQuery(
                `SELECT ROWID FROM user_sessions WHERE session_token_hash = '${hashToken(rawToken)}'`
            );
            const sessionRowId = rows?.[0]?.user_sessions?.ROWID;
            if (sessionRowId) {
                await catalystApp.datastore().table('user_sessions').updateRow({
                    ROWID: sessionRowId,
                    revoked_at: formatDateTime(new Date()),
                });
            }
        } catch (err) {
            console.warn('[authentication] Logout revoke failed:', err.message);
        }
    }
    return sendJson(req, res, 200, { success: true });
}

async function handleSetInitialPassword(catalystApp, req, res, body) {
    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '');

    if (!email || !newPassword) {
        return sendJson(req, res, 400, { success: false, code: 'MISSING_FIELDS', message: 'Email and new password are required.' });
    }
    if (newPassword.length < 8) {
        return sendJson(req, res, 400, { success: false, code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' });
    }

    const user = await findUserByEmail(catalystApp, email);
    if (!user || user.is_active === false) {
        return sendJson(req, res, 404, { success: false, code: 'USER_NOT_FOUND', message: 'No account found with that email.' });
    }
    // Guard: this endpoint only claims a fresh account.
    if (user.password_hash) {
        return sendJson(req, res, 403, {
            success: false,
            code: 'PASSWORD_ALREADY_SET',
            message: 'This account already has a password set. Contact your administrator if you need it reset.',
        });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await catalystApp.datastore().table('users').updateRow({
        ROWID: user.ROWID,
        password_hash: passwordHash,
        password_changed_at: formatDateTime(new Date()),
        failed_login_attempts: 0,
        locked_until: null,
    });

    return sendJson(req, res, 200, { success: true, message: 'Password set. You can now sign in.' });
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

        const body = await readRequestBody(req);
        const action = body.action;

        switch (action) {
            case 'login':
                return await handleLogin(catalystApp, req, res, body);
            case 'logout':
                return await handleLogout(catalystApp, req, res);
            case 'set-initial-password':
                return await handleSetInitialPassword(catalystApp, req, res, body);
            default:
                return sendJson(req, res, 400, { success: false, code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` });
        }
    } catch (err) {
        console.error('[authentication]', err);
        return sendJson(req, res, 500, {
            success: false,
            code: 'AUTH_ERROR',
            message: err.message,
        });
    }
};
