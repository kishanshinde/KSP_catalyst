// functions/ai-chat/shared/tokenManager.js
// ============================================================
// ZOHO OAUTH AUTO-REFRESH TOKEN MANAGER
// ============================================================
// The access_token expires every ~1 hour. This module:
//   1. Reads the token from Catalyst Cache (fast, shared across instances)
//   2. If expired/missing → uses the long-lived refresh_token to get a new one
//   3. Saves the new token back to cache with a 55-minute TTL
//   4. Provides a withAutoRefresh() wrapper that detects 401 errors
//      and automatically retries once with a freshly-refreshed token
//
// CATALYST ENVIRONMENT VARIABLES REQUIRED (set in Catalyst Console once):
//   ZOHO_CLIENT_ID       — e.g. 1000.OFMAEIENIMLDY5MMSR47NH3OX6UF7O
//   ZOHO_CLIENT_SECRET   — e.g. f4003b85fb47578d409...
//   ZOHO_REFRESH_TOKEN   — e.g. 1000.d2a4c100616... (long-lived, never expires)
//
// LOCAL DEV FALLBACK (functions/ai-chat/.env):
//   LLM_ACCESS_TOKEN     — manual token for offline / local testing
// ============================================================

'use strict';

const https = require('https');
const querystring = require('querystring');

const CACHE_SEGMENT   = 'zoho_tokens';
const CACHE_KEY_LLM   = 'llm_access_token';
const TOKEN_TTL_MS    = 55 * 60 * 1000; // 55 minutes in milliseconds
const ZOHO_TOKEN_URL  = 'https://accounts.zoho.in/oauth/v2/token';

// In-process memory fallback for local dev (catalyst serve)
// This is cleared on process restart, which is fine for dev.
let _inMemoryToken   = null;
let _inMemoryExpires = 0;

// ============================================================
// INTERNAL: Call Zoho token endpoint with grant_type=refresh_token
// ============================================================
function _refreshAccessToken() {
    return new Promise((resolve, reject) => {
        const clientId     = process.env.ZOHO_CLIENT_ID;
        const clientSecret = process.env.ZOHO_CLIENT_SECRET;
        const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            return reject(new Error(
                '[tokenManager] Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REFRESH_TOKEN env vars. ' +
                'Set them in Catalyst Console → App Settings → Environments.'
            ));
        }

        const body = querystring.stringify({
            grant_type:    'refresh_token',
            client_id:     clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        });

        const url  = new URL(ZOHO_TOKEN_URL);
        const opts = {
            hostname: url.hostname,
            path:     url.pathname,
            method:   'POST',
            headers: {
                'Content-Type':   'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        console.log('[tokenManager] 🔄 Refreshing access token via Zoho OAuth...');

        const req = https.request(opts, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.access_token) {
                        console.log(`[tokenManager] ✅ Token refreshed successfully. Expires in ${parsed.expires_in}s.`);
                        resolve({
                            access_token: parsed.access_token,
                            expires_in:   parsed.expires_in || 3600,
                        });
                    } else {
                        console.error('[tokenManager] ❌ Refresh failed:', data);
                        reject(new Error(`[tokenManager] Token refresh failed: ${data}`));
                    }
                } catch (err) {
                    reject(new Error(`[tokenManager] Failed to parse token response: ${err.message}`));
                }
            });
        });

        req.on('error', err => {
            reject(new Error(`[tokenManager] Token refresh request error: ${err.message}`));
        });

        req.write(body);
        req.end();
    });
}

// ============================================================
// INTERNAL: Save token to Catalyst Cache (if app available)
// Always also saves to in-memory as a fallback.
// ============================================================
async function _saveToCache(catalystApp, token, expiresInSeconds) {
    // Always update in-memory fallback
    _inMemoryToken   = token;
    _inMemoryExpires = Date.now() + (expiresInSeconds - 60) * 1000; // subtract 60s buffer

    if (!catalystApp) return;

    try {
        // Catalyst Cache stores strings; we store the token as-is.
        // SDK segment.put(key, value, ttl) expects TTL in hours (1–48 range).
        const ttlHours = Math.max(Math.ceil((expiresInSeconds - 60) / 3600), 1); // 1–48 range (SDK requires hours)
        const cache = catalystApp.cache();
        const segment = cache.segment(CACHE_SEGMENT);
        await segment.put(CACHE_KEY_LLM, token, ttlHours);
        console.log(`[tokenManager] 💾 Token saved to Catalyst Cache (TTL: ${ttlHours}h).`);
    } catch (err) {
        // Cache write failure is non-fatal — in-memory fallback is available
        console.warn('[tokenManager] ⚠️ Could not write to Catalyst Cache:', err.message);
    }
}

// ============================================================
// INTERNAL: Read token from Catalyst Cache
// ============================================================
async function _readFromCache(catalystApp) {
    // 1. Check in-memory first (fastest)
    if (_inMemoryToken && Date.now() < _inMemoryExpires) {
        console.log('[tokenManager] ✅ Token found in in-memory cache — reusing.');
        return _inMemoryToken;
    }

    if (!catalystApp) return null;

    // 2. Try Catalyst Cache
    try {
        const cache = catalystApp.cache();
        const segment = cache.segment(CACHE_SEGMENT);
        // const value = await segment.get(CACHE_KEY_LLM);
        const raw = await segment.get(CACHE_KEY_LLM);
        const value = typeof raw === 'string' ? raw : (raw?.value || null);
        if (value) {
            console.log('[tokenManager] ✅ Token found in Catalyst Cache — reusing.');
            // Sync to in-memory for next call
            _inMemoryToken   = value;
            _inMemoryExpires = Date.now() + TOKEN_TTL_MS; // approximate
            return value;
        }
    } catch (err) {
        console.warn('[tokenManager] ⚠️ Could not read from Catalyst Cache:', err.message);
    }

    return null;
}

// ============================================================
// INTERNAL: Evict cached token (on 401 — token was rejected)
// ============================================================
async function _clearCache(catalystApp) {
    _inMemoryToken   = null;
    _inMemoryExpires = 0;

    if (!catalystApp) return;

    try {
        const cache = catalystApp.cache();
        const segment = cache.segment(CACHE_SEGMENT);
        await segment.delete(CACHE_KEY_LLM);
        console.log('[tokenManager] 🗑️ Cleared token from Catalyst Cache.');
    } catch (err) {
        console.warn('[tokenManager] ⚠️ Could not clear Catalyst Cache entry:', err.message);
    }
}

// ============================================================
// PUBLIC: Get a valid LLM access token
//
// Priority order:
//   1. Catalyst Cache / in-memory (if valid)
//   2. Refresh via ZOHO_REFRESH_TOKEN env var
//   3. Fallback to LLM_ACCESS_TOKEN from .env (local dev only)
//
// @param {object|null} catalystApp - result of catalyst.initialize(req)
// @returns {Promise<string>} - valid access token
// ============================================================
async function getLLMToken(catalystApp) {
    // 1. Try cache
    const cached = await _readFromCache(catalystApp);
    if (cached) return cached;

    // 2. Try to refresh using env vars
    const hasRefreshCreds = process.env.ZOHO_CLIENT_ID &&
                            process.env.ZOHO_CLIENT_SECRET &&
                            process.env.ZOHO_REFRESH_TOKEN;

    if (hasRefreshCreds) {
        try {
            const { access_token, expires_in } = await _refreshAccessToken();
            await _saveToCache(catalystApp, access_token, expires_in);
            return access_token;
        } catch (err) {
            console.error('[tokenManager] ❌ Auto-refresh failed:', err.message);
            // Fall through to .env fallback
        }
    } else {
        console.warn('[tokenManager] ⚠️ ZOHO_*_TOKEN env vars not set — falling back to .env LLM_ACCESS_TOKEN.');
    }

    // 3. Fallback: static .env token (local dev / manual override)
    const envToken = process.env.LLM_ACCESS_TOKEN;
    if (envToken) {
        console.warn('[tokenManager] ⚠️ Using static LLM_ACCESS_TOKEN from .env — this will expire!');
        return envToken;
    }

    throw new Error(
        '[tokenManager] No valid LLM token available. ' +
        'Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in Catalyst Console, ' +
        'or set LLM_ACCESS_TOKEN in .env for local dev.'
    );
}

// ============================================================
// PUBLIC: Get a valid Translation access token
//
// Reuses the same refresh flow — the same OAuth client covers both.
// Falls back to TRANSLATE_ACCESS_TOKEN from .env.
//
// @param {object|null} catalystApp
// @returns {Promise<string>}
// ============================================================
async function getTranslateToken(catalystApp) {
    // Translation uses the same QuickML scope — same token works
    // If you have a separate token in future, extend this with a second key
    return getLLMToken(catalystApp);
}

// ============================================================
// PUBLIC: Wrap an LLM API call with automatic 401 retry
//
// If apiFn(token) throws an error with message containing '401',
// the cached token is cleared, a fresh one is fetched, and
// apiFn is retried exactly once.
//
// @param {object|null} catalystApp
// @param {function} apiFn - async (token: string) => any
// @returns {Promise<any>}
// ============================================================
async function withAutoRefresh(catalystApp, apiFn) {
    const token = await getLLMToken(catalystApp);
    try {
        return await apiFn(token);
    } catch (err) {
        const is401 = err.message && (
            err.message.includes('401') ||
            err.message.toLowerCase().includes('authentication failed') ||
            err.message.toLowerCase().includes('unauthorized')
        );

        if (is401) {
            console.warn('[tokenManager] ⚠️ 401 detected — auto-refreshing token and retrying...');
            await _clearCache(catalystApp);

            try {
                const { access_token, expires_in } = await _refreshAccessToken();
                await _saveToCache(catalystApp, access_token, expires_in);
                // Retry once with the new token
                return await apiFn(access_token);
            } catch (refreshErr) {
                console.error('[tokenManager] ❌ Retry after 401 failed:', refreshErr.message);
                throw refreshErr;
            }
        }

        throw err;
    }
}

module.exports = { getLLMToken, getTranslateToken, withAutoRefresh };
