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
    fetchRoleName,
    toPublicUser,
    SESSION_TTL_MS,
};
