# Walkthrough — Zoho OAuth Auto-Refresh Token

## Problem Solved

Previously, the Zoho `access_token` for `QuickML.deployment.READ` expired every **~1 hour** (sometimes faster), requiring a manual 3-step process:
1. Generate a new authorization code at Zoho API Console
2. Run a Postman request to exchange the code for a token
3. Paste the token into `.env` and restart the function

**This is now fully automated.** The system uses the `refresh_token` to silently get new `access_token`s — no human intervention required.

---

## What Was Built

### 1. [tokenManager.js](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/shared/tokenManager.js) — New shared module

The core of the solution. Provides:

| Export | What it does |
|--------|-------------|
| `getLLMToken(app)` | Returns a valid access token. Checks in-memory cache → Catalyst Cache → auto-refreshes via Zoho if both miss. |
| `getTranslateToken(app)` | Same as getLLMToken (same OAuth scope covers both). |
| `withAutoRefresh(app, apiFn)` | Wraps any API call: if it gets a 401, clears the cache and retries once with a fresh token. |

**Token refresh flow:**
```
POST https://accounts.zoho.in/oauth/v2/token
  grant_type=refresh_token
  client_id=$ZOHO_CLIENT_ID
  client_secret=$ZOHO_CLIENT_SECRET
  refresh_token=$ZOHO_REFRESH_TOKEN
→ { access_token, expires_in: 3600 }
```

Token is cached in-memory + Catalyst Cache (55-minute TTL) so the refresh only happens once per hour, not on every request.

### 2. [ai-chat/index.js](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/index.js) — Modified

- Removed module-level `const LLM_TOKEN = process.env.LLM_ACCESS_TOKEN` (read once at startup, stale after 1 hour)
- Added `const { getLLMToken } = require('./shared/tokenManager')`
- `catalyst.initialize(req)` now runs **first** (before the LLM token is fetched) so the Catalyst app context is available for cache reads
- Token is fetched **per-request** with `await getLLMToken(app)` and stored in a local `LLM_TOKEN` variable
- On failure, returns a clear error message instead of silently failing

### 3. [test-llm/index.js](file:///d:/Project/KSP/KSP_catalyst/functions/test-llm/index.js) — Rewritten

- Fixed all **git merge conflicts** (removed `<<<<<<< Updated upstream` markers)
- Replaced `process.env.ACCESS_TOKEN` with `await getLLMToken(app)`
- Added 401-retry logic directly in the handler
- Clean, consolidated code based on the `https` module version

### 4. [test-model.js](file:///d:/Project/KSP/KSP_catalyst/test-model.js) — Rewritten

Local test script now auto-refreshes too:
```
node test-model.js "Show criminal history of Ravi Kumar"
```
No more pasting tokens manually. Accepts any query as a CLI argument.

### 5. [.env](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/.env) — Updated

Added the three static OAuth credentials (one-time setup, never expire):
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`  
- `ZOHO_REFRESH_TOKEN`

---

## Test Results ✅

```
🚀 Testing LLM Model Connectivity...
📝 Query: Show criminal history of Ravi Kumar

🔄 Refreshing Zoho OAuth access token...
✅ Token refreshed! Expires in 3600s.

🔑 Token (first 15 chars): 1000.3f41f6a78a...

📡 LLM Response Status: 200
✅ SUCCESS!

🎯 Parsed Intent: {
  "intent": "criminal_history",
  "entities": { "person_name": "Ravi Kumar" }
}
```

---

## Production Setup (One-Time)

Set these in **Zoho Catalyst Console → App Settings → Environments** for both Development and Production:

| Variable | Value |
|----------|-------|
| `ZOHO_CLIENT_ID` | From Zoho API Console → Self Client |
| `ZOHO_CLIENT_SECRET` | From Zoho API Console → Self Client |
| `ZOHO_REFRESH_TOKEN` | The `refresh_token` from your Postman response |
| `CATALYST_ORG_ID` | `60073436832` |
| `CATALYST_PROJECT_ID` | `47024000000013051` |

> You have already set these in the Catalyst Console ✅

---

## How Tokens Flow (Summary)

```
Request comes in
  └─ getLLMToken(app)
        ├─ Check in-memory cache → hit? return immediately
        ├─ Check Catalyst Cache → hit? return + sync to memory
        └─ No cache → call Zoho OAuth /token with refresh_token
              └─ Store new access_token in memory + Catalyst Cache (55 min TTL)
              └─ Return new token

LLM API call with token
  └─ If 401 → clear cache → refresh → retry once → success
```

---

## Files Changed

| File | Change |
|------|--------|
| [tokenManager.js](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/shared/tokenManager.js) | **NEW** — shared auto-refresh module |
| [ai-chat/index.js](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/index.js) | Import tokenManager; per-request token fetch |
| [test-llm/index.js](file:///d:/Project/KSP/KSP_catalyst/functions/test-llm/index.js) | Rewritten — merge conflicts fixed + tokenManager |
| [test-model.js](file:///d:/Project/KSP/KSP_catalyst/test-model.js) | Rewritten — auto-refresh + CLI arg support |
| [ai-chat/.env](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/.env) | Added ZOHO_* refresh credentials |
| [ai-chat/.env.example](file:///d:/Project/KSP/KSP_catalyst/functions/ai-chat/.env.example) | Updated template with new variables |
