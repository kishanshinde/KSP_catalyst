// shared/quickmlAuth.js

let cachedToken = null;
let tokenExpiry = 0;
let refreshPromise = null;

const TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";

/**
 * Returns a valid QuickML OAuth access token.
 *
 * @param {boolean} forceRefresh
 *        false -> use cached token if valid
 *        true  -> always generate a new access token
 */
async function getAccessToken(forceRefresh = false) {

    // Return cached token if still valid and refresh isn't forced
    if (
        !forceRefresh &&
        cachedToken &&
        Date.now() < tokenExpiry
    ) {
        console.log("Using cached QuickML access token.");
        return cachedToken;
    }

    // If another request is already refreshing,
    // wait for it instead of creating another refresh request.
    if (refreshPromise) {
        console.log("Waiting for ongoing token refresh...");
        return refreshPromise;
    }

    refreshPromise = (async () => {

        console.log("Refreshing QuickML access token...");

        const response = await fetch(TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "CATALYST-ORG": process.env.CATALYST_ORG
            },
            body: new URLSearchParams({
                refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: "refresh_token"
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh QuickML access token: ${error}`);
        }

        const data = await response.json();

        cachedToken = data.access_token;

        // Cache for 9 minutes (actual expiry is 10 minutes)
        tokenExpiry = Date.now() + (9 * 60 * 1000);

        console.log("QuickML access token refreshed successfully.");

        return cachedToken;

    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

module.exports = {
    getAccessToken
};