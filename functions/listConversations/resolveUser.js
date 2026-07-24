'use strict';

const { validateSessionToken } = require('./session');

/**
 * Resolves the caller's session token (Authorization header) to their
 * Datastore `users` row. Returns `{ rowid, roleRowId, authUser }`, or
 * `null` when there is no valid session (caller should respond 401).
 */
async function resolveUserRow(catalystApp, req) {
    const session = await validateSessionToken(catalystApp, req?.headers?.authorization);
    if (!session) return null;

    return {
        rowid: session.user.ROWID,
        roleRowId: session.user.role_rowid || null,
        authUser: session.user,
    };
}

module.exports = { resolveUserRow };
