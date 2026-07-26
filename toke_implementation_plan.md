# Auto-Refresh Zoho OAuth Token — Implementation Plan

## Problem Summary

The Zoho OAuth `access_token` for `QuickML.deployment.READ` expires every **~1 hour** (in practice after ~10 minutes of idle time or due to reuse). Currently, developers must manually:
1. Go to [api-console.zoho.com](https://api-console.zoho.com), generate a new **authorization_code**
2. Run a Postman request with `grant_type=authorization_code` to get a fresh `access_token`
3. Paste the new token into `.env` files and restart functions

This breaks the LLM pipeline in `ai-chat` and `test-llm` every ~10–60 minutes.

---

## Solution: Automatic Token Refresh Using `refresh_token`

The Zoho OAuth response already includes a **`refresh_token`** which is long-lived and can be used indefinitely to obtain new `access_token`s without re-authenticating via the browser.

### How it works
```
refresh_token (permanent, stored in Catalyst Env Vars)
   ↓  POST /oauth/v2/token  (grant_type=refresh_token)
access_token (valid for ~1 hour)
   ↓  cached in Catalyst Cache (in-memory, shared across all function instances)
All LLM API calls (ai-chat, test-llm, etc.) read token from cache
   ↓  if 401 → auto-refresh token → retry once → success
```

---

## Design: Shared Token Manager Module

We create **one shared module** — `functions/ai-chat/shared/tokenManager.js` — that all functions can import. It:

1. **On first call**: Tries to read the `access_token` from **Catalyst Cache** (`zoho_llm_token` key)
2. **If cache miss or expired**: Calls `https://accounts.zoho.in/oauth/v2/token` with `grant_type=refresh_token` to get a fresh token
3. **Stores the new token** back to Catalyst Cache with a 55-minute TTL
4. **On 401 from LLM API**: Clears the cached token and auto-refreshes once, then retries the original request

---

## Catalyst Environment Variables to Set

> [!IMPORTANT]
> These must be set once in the **Zoho Catalyst Console → App Settings → Environments** for Development (and Production). They are static and never change.

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `ZOHO_CLIENT_ID` | `1000.OFMAEIENIMLDY5MMSR47NH3OX6UF7O` | OAuth client ID |
| `ZOHO_CLIENT_SECRET` | `f4003b85fb47578d409ed50837024ebe24066fc879` | OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | `1000.d2a4c1006162bb437f95996c5c262e5e.368e57cbd51da0493dde3b0f23a8297f` | Long-lived refresh token |
| `CATALYST_ORG_ID` | `60073436832` | Org ID |
| `CATALYST_PROJECT_ID` | `47024000000013051` | Project ID |

> [!WARNING]
> The `LLM_ACCESS_TOKEN` and `TRANSLATE_ACCESS_TOKEN` in `.env` become fallback only (used when cache is empty and no Catalyst env vars are set — i.e., local dev). They are no longer the primary source of truth.

---

## Proposed Changes

### Shared Token Manager Module

#### [NEW] [tokenManager.js](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/shared/tokenManager.js)

A new shared utility with two exported async functions:

```js
// Get a valid LLM access token (auto-refreshes if needed)
async function getLLMToken(catalystApp): string

// Wrap an LLM API call with automatic 401 retry
async function withAutoRefresh(catalystApp, apiFn): any
```

**Logic:**
```
getLLMToken(app):
  1. Try app.cache().segment('zoho_tokens').get('llm_access_token')
  2. If found → return it
  3. Else → call refreshAccessToken()
  4. Store new token in cache with 55-min TTL
  5. Return new token

refreshAccessToken():
  POST https://accounts.zoho.in/oauth/v2/token
  Body: grant_type=refresh_token
        client_id=ZOHO_CLIENT_ID (from env)
        client_secret=ZOHO_CLIENT_SECRET (from env)
        refresh_token=ZOHO_REFRESH_TOKEN (from env)
  Returns: { access_token, expires_in }

withAutoRefresh(app, apiFn):
  token = await getLLMToken(app)
  try:
    return await apiFn(token)
  catch err if 401:
    clearCachedToken()
    token = await refreshAccessToken()
    return await apiFn(token)  // retry once
```

---

### ai-chat Function

#### [MODIFY] [index.js](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/index.js)

**Changes:**
1. Import `tokenManager` from `./shared/tokenManager`
2. Pass `catalystApp` (from `catalyst.initialize(req)`) into `getLLMToken(app)` instead of reading the hardcoded `LLM_TOKEN` from `.env` at module load time
3. In `callIntentClassifier()`, `translateWithLLM()`, and all other LLM call sites:
   - Replace `token` parameter (passed from `.env`) with `await getLLMToken(app)` 
   - Wrap each call in `withAutoRefresh()` so a 401 triggers automatic refresh + retry
4. Keep `.env` `LLM_ACCESS_TOKEN` as a local-dev fallback when env vars not set

**Affected call sites (lines):**
- Line 548 — `translateWithLLM` 
- Line 1067 — `callIntentClassifier`
- Line 1466 — Translation/response LLM call
- Line 1595 — Response generation LLM call
- Line 1788 — Another response LLM call

---

### test-llm Function

#### [MODIFY] [index.js](file:///d:/Project/KSP/KSP_catalyst/functions/test-llm/index.js)

> [!CAUTION]
> This file has **unresolved git merge conflicts** (`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes` markers). These must be resolved first.

**Changes:**
1. Fix merge conflicts — keep the "Stashed changes" version (more complete version with https module)
2. Replace `ACCESS_TOKEN = process.env.ACCESS_TOKEN` with `await getLLMToken(app)` using the shared tokenManager
3. Add `catalystApp = catalyst.initialize(req)` at the top of the handler

---

## Catalyst Cache Setup

The Catalyst Cache segment `zoho_tokens` will be used with key `llm_access_token`. No manual setup needed — Catalyst Cache is enabled by default.

**Cache structure:**
```
Segment: zoho_tokens
Key: llm_access_token
Value: "1000.xxxx..." (the raw token string)
TTL: 55 minutes (3300 seconds)
```

---

## Verification Plan

### Manual Testing
1. Set the 3 Catalyst Env Vars (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`) in the Catalyst Console
2. Start `catalyst serve`
3. Trigger a query via the frontend chat — confirm the LLM responds correctly
4. Wait or manually clear the cache, trigger again — confirm auto-refresh works (check logs for "Token refreshed")
5. Test `test-llm` function endpoint directly with Postman

### Log Verification
```
[tokenManager] ✅ Token found in cache — reusing
[tokenManager] 🔄 Token expired or missing — refreshing...
[tokenManager] ✅ Token refreshed successfully, expires in 3600s
[tokenManager] ⚠️ 401 detected — auto-refreshing token and retrying...
```

---

## Open Questions

> [!IMPORTANT]
> **Q1: Local development fallback** — When running `catalyst serve` locally (without Catalyst env vars), should the system fall back to the `.env` file tokens? **Recommendation: Yes** — if `ZOHO_REFRESH_TOKEN` env var is not set, fall back to `LLM_ACCESS_TOKEN` from `.env`.

> [!IMPORTANT]  
> **Q2: test-llm merge conflicts** — The `test-llm/index.js` has git merge conflicts. I'll resolve them by keeping the "stashed changes" version (https-based, more complete). Please confirm this is OK, or let me know which version you want to keep.
