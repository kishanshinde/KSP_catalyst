'use strict';

const crypto = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function formatDateTime(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Resolves a session credential (as sent by the client in the
 * `Authorization` header) to its `users` row, or null if the token is
 * missing, unknown, expired, or revoked. Accepts either the bare token or
 * a conventional `Bearer <token>` header value.
 */
function extractBearerToken(rawHeader) {
    if (!rawHeader) return null;
    const match = /^Bearer\s+(.+)$/i.exec(String(rawHeader).trim());
    return match ? match[1] : String(rawHeader).trim();
}

async function validateSessionToken(catalystApp, rawHeader) {
    const rawToken = extractBearerToken(rawHeader);
    if (!rawToken) {
        console.warn('[session] No token in request header');
        return null;
    }

    const tokenHash = hashToken(rawToken);
    const zcql = catalystApp.zcql();

    const sessionRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, user_rowid, expires_at, revoked_at FROM user_sessions WHERE session_token_hash = '${tokenHash}'`
    );
    if (!sessionRows || sessionRows.length === 0) {
        console.warn('[session] No user_sessions row for token hash', tokenHash);
        return null;
    }

    const session = sessionRows[0].user_sessions;
    if (session.revoked_at) {
        console.warn('[session] Session revoked at', session.revoked_at, 'ROWID', session.ROWID);
        return null;
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
        console.warn('[session] Session expired. expires_at =', session.expires_at, 'now =', new Date().toISOString(), 'ROWID', session.ROWID);
        return null;
    }

    const userRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, full_name, email, role_rowid, is_active, phone_number FROM users WHERE ROWID = ${session.user_rowid}`
    );
    if (!userRows || userRows.length === 0) {
        console.warn('[session] No users row for user_rowid', session.user_rowid);
        return null;
    }

    const user = userRows[0].users;
    if (user.is_active === false) {
        console.warn('[session] User is inactive, ROWID', user.ROWID);
        return null;
    }

    try {
        await catalystApp.datastore().table('user_sessions').updateRow({
            ROWID: session.ROWID,
            last_used_at: formatDateTime(new Date()),
        });
    } catch (err) {
        console.warn('[session] Failed to update last_used_at:', err.message);
    }

    return { user, sessionRowId: session.ROWID };
}

async function fetchRoleName(catalystApp, roleRowId) {
    if (!roleRowId) return null;
    try {
        const rows = await catalystApp.zcql().executeZCQLQuery(
            `SELECT role_name FROM roles WHERE ROWID = ${roleRowId}`
        );
        return rows?.[0]?.roles?.role_name || null;
    } catch (err) {
        console.warn('[session] Role lookup failed:', err.message);
        return null;
    }
}

function toPublicUser(userRow, roleName) {
    const fullName = userRow.full_name || '';
    const [firstName, ...rest] = fullName.split(' ');
    return {
        user_id: userRow.ROWID,
        full_name: fullName,
        first_name: firstName || 'Officer',
        last_name: rest.join(' ') || '',
        email: userRow.email,
        phone_number: userRow.phone_number || null,
        role: roleName || null,
        app_role: roleName || null,
        status: userRow.is_active === false ? 'INACTIVE' : 'ACTIVE',
        confirmed: true,
    };
}

module.exports = {
    hashToken,
    generateToken,
    formatDateTime,
    validateSessionToken,
    fetchRoleName,
    toPublicUser,
    SESSION_TTL_MS,
};
