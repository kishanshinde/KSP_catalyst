'use strict';

/**
 * Resolves the logged-in Catalyst Auth user to their Datastore `users` row.
 *
 * Resolution order:
 *   1. `users.auth_user_id` link (fast path)
 *   2. `users.email` match — backfills `auth_user_id` for next time
 *   3. Auto-provision a new `users` row on first login
 *
 * Returns `{ rowid, roleRowId, authUser }`, or `null` when there is no
 * authenticated session (caller should respond 401).
 */
async function resolveUserRow(catalystApp) {
    let authUser;
    try {
        authUser = await catalystApp.userManagement().getCurrentUser();
    } catch (err) {
        console.error('[resolveUser] getCurrentUser failed:', err.message);
        return null;
    }
    if (!authUser || !authUser.user_id) return null;

    try {
        const zcql = catalystApp.zcql();

        // 1. Fast path: already linked via auth_user_id
        let rows = await zcql.executeZCQLQuery(
            `SELECT ROWID, full_name, role_rowid FROM users WHERE auth_user_id = ${authUser.user_id}`
        );
        if (rows && rows.length > 0) {
            const u = rows[0].users;
            return { rowid: u.ROWID, roleRowId: u.role_rowid || null, authUser };
        }

        // 2. Fallback: match by email, then backfill the auth link
        const safeEmail = String(authUser.email_id || '').replace(/'/g, "''");
        if (safeEmail) {
            rows = await zcql.executeZCQLQuery(
                `SELECT ROWID, full_name, role_rowid FROM users WHERE email = '${safeEmail}'`
            );
            if (rows && rows.length > 0) {
                const u = rows[0].users;
                try {
                    await catalystApp.datastore().table('users').updateRow({
                        ROWID: u.ROWID,
                        auth_user_id: authUser.user_id,
                    });
                } catch (updateErr) {
                    console.warn('[resolveUser] Update row failed:', updateErr.message);
                }
                return { rowid: u.ROWID, roleRowId: u.role_rowid || null, authUser };
            }
        }

        // 3. First login with no matching row: auto-provision
        try {
            const created = await catalystApp.datastore().table('users').insertRow({
                full_name: `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() || authUser.email_id,
                email: authUser.email_id,
                auth_user_id: authUser.user_id,
                is_active: true,
            });
            console.log('[resolveUser] Provisioned users row', created.ROWID, 'for auth user', authUser.user_id);
            return { rowid: created.ROWID, roleRowId: null, authUser };
        } catch (insertErr) {
            console.warn('[resolveUser] Insert row failed:', insertErr.message);
            return { rowid: null, roleRowId: null, authUser };
        }
    } catch (dbErr) {
        console.warn('[resolveUser] Datastore query failed:', dbErr.message);
        return { rowid: null, roleRowId: null, authUser };
    }
}

module.exports = { resolveUserRow };
