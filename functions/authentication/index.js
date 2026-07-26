'use strict';

const catalyst = require('zcatalyst-sdk-node');
const bcrypt = require('bcryptjs');
const {
    hashToken,
    generateToken,
    formatDateTime,
    revokeUserSessions,
    fetchRoleName,
    toPublicUser,
    SESSION_TTL_MS,
} = require('./session');

const MAX_FAILED_ATTEMPTS = 5;
// Escalating lockout: 3 min the first time the threshold is crossed, 5 min
// the next, then 15 min for every time after that.
const LOCKOUT_TIERS_MS = [3 * 60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];

function getLockoutMs(attempts) {
    const tier = Math.min(attempts - MAX_FAILED_ATTEMPTS, LOCKOUT_TIERS_MS.length - 1);
    return LOCKOUT_TIERS_MS[tier];
}

function sendJson(req, res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function escapeSql(value) {
    return String(value).replace(/'/g, "''");
}

// Accepts either the bare session token or a conventional `Bearer <token>`
// Authorization header value.
function extractBearerToken(rawHeader) {
    if (!rawHeader) return null;
    const match = /^Bearer\s+(.+)$/i.exec(String(rawHeader).trim());
    return match ? match[1] : String(rawHeader).trim();
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
        const remainingMin = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
        return sendJson(req, res, 401, {
            success: false,
            code: 'ACCOUNT_LOCKED',
            message: `Too many failed attempts. Please try again in ${remainingMin} minute${remainingMin === 1 ? '' : 's'}.`,
        });
    }

    const passwordValid = user.password_hash
        ? await bcrypt.compare(password, user.password_hash)
        : false;

    const table = catalystApp.datastore().table('users');

    if (!passwordValid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const update = { ROWID: user.ROWID, failed_login_attempts: attempts };

        let response;
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            const lockoutMs = getLockoutMs(attempts);
            const lockoutMin = Math.round(lockoutMs / 60000);
            update.locked_until = formatDateTime(new Date(Date.now() + lockoutMs));
            response = {
                success: false,
                code: 'ACCOUNT_LOCKED',
                message: `Too many failed attempts. Your account is locked for ${lockoutMin} minute${lockoutMin === 1 ? '' : 's'}.`,
            };
        } else {
            const remaining = MAX_FAILED_ATTEMPTS - attempts;
            response = {
                success: false,
                code: 'INVALID_CREDENTIALS',
                message: `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is temporarily locked.`,
                attemptsRemaining: remaining,
            };
        }

        try {
            await table.updateRow(update);
        } catch (err) {
            console.warn('[authentication] Failed to record failed attempt:', err.message);
        }
        return sendJson(req, res, 401, response);
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
    const rawToken = extractBearerToken(req.headers['x-session-token']);
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

async function handleForgotPassword(catalystApp, req, res, body) {
    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '');

    if (!email || !newPassword) {
        return sendJson(req, res, 400, { success: false, code: 'MISSING_FIELDS', message: 'Email and new password are required.' });
    }
    if (newPassword.length < 8) {
        return sendJson(req, res, 400, { success: false, code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' });
    }

    // Generic response either way — don't reveal whether an email is registered.
    const genericSuccess = () =>
        sendJson(req, res, 200, { success: true, message: 'Password has been reset. Please sign in.' });

    const user = await findUserByEmail(catalystApp, email);
    if (!user || user.is_active === false) {
        return genericSuccess();
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await catalystApp.datastore().table('users').updateRow({
        ROWID: user.ROWID,
        password_hash: passwordHash,
        password_changed_at: formatDateTime(new Date()),
        failed_login_attempts: 0,
        locked_until: null,
    });

    try {
        await revokeUserSessions(catalystApp, user.ROWID);
    } catch (err) {
        console.warn('[authentication] Failed to revoke sessions after password reset:', err.message);
    }

    return genericSuccess();
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
            message: 'This account already has a password set. Use "Forgot password" instead.',
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
            case 'forgot-password':
                return await handleForgotPassword(catalystApp, req, res, body);
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
