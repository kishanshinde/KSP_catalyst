const { getAccessToken } = require("./quickmlAuth");

/**
 * Makes an authenticated request to a QuickML endpoint.
 *
 * @param {Object} options
 * @param {string} options.hostname
 * @param {string} options.path
 * @param {string} [options.method="POST"]
 * @param {Object} [options.headers={}]
 * @param {string|Buffer} [options.body]
 *
 * @returns {Promise<Object>}
 */
async function quickmlRequest({
    hostname,
    path,
    method = "POST",
    headers = {},
    body
}) {

    let token = await getAccessToken();

    let response = await fetch(`https://${hostname}${path}`, {
        method,
        headers: {
            ...headers,
            Authorization: `Zoho-oauthtoken ${token}`
        },
        body
    });

    // If token somehow became invalid, refresh and retry once.
    if (response.status === 401) {

        console.log("QuickML returned 401. Refreshing token and retrying...");

        token = await getAccessToken(true);

        response = await fetch(`https://${hostname}${path}`, {
            method,
            headers: {
                ...headers,
                Authorization: `Zoho-oauthtoken ${token}`
            },
            body
        });
    }

    return response;
}

module.exports = {
    quickmlRequest
};