const catalyst = require("zcatalyst-sdk-node");
const { resolveUserRow } = require("./resolveUser");

module.exports = (req, res) => {
    return new Promise((resolve) => {

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        let bodyStr = "";
        req.on("data", chunk => { bodyStr += chunk; });
        req.on("end", () => {
            try {
                const parsedBody = bodyStr ? JSON.parse(bodyStr) : {};
                processRename(parsedBody, req, res, resolve);
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, message: "Invalid JSON format." }));
                resolve();
            }
        });
    });
};

async function processRename(body, req, res, resolve) {
    try {
        const { conversationId, conversation_title } = body;

        if (!conversationId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "conversationId is required." }));
            return resolve();
        }

        if (!conversation_title) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "conversation_title is required." }));
            return resolve();
        }

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        // Resolve the logged-in user's Datastore row — without this, any
        // caller could rename any conversation just by guessing its ID.
        const resolved = await resolveUserRow(catalystApp, req);
        if (!resolved) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                code: 'AUTH_REQUIRED',
                message: 'Authentication required. Please sign in.',
            }));
            return resolve();
        }
        const user_rowid = resolved.rowid;

        const escapedTitle = conversation_title.replace(/'/g, "''");

        const query = `
            UPDATE conversation_history
            SET conversation_title = '${escapedTitle}'
            WHERE ROWID = ${conversationId} AND user_rowid = ${user_rowid}
        `;

        console.log("Executing ZCQL UPDATE:", query);
        await zcql.executeZCQLQuery(query);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            message: "Conversation renamed successfully.",
        }));
        resolve();

    } catch (error) {
        console.error("Rename Conversation Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: false,
            error: error.message,
        }));
        resolve();
    }
}
