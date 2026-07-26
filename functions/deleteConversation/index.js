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
                processDelete(parsedBody, req, res, resolve);
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, message: "Invalid JSON format." }));
                resolve();
            }
        });
    });
};

async function processDelete(body, req, res, resolve) {
    try {
        const { conversationId } = body;

        if (!conversationId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "conversationId is required." }));
            return resolve();
        }

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        // Resolve the logged-in user's Datastore row — without this, any
        // caller could delete any conversation just by guessing its ID.
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

        const query = `
            DELETE FROM conversation_history
            WHERE ROWID = ${conversationId} AND user_rowid = ${user_rowid}
        `;

        console.log("Executing ZCQL DELETE:", query);
        await zcql.executeZCQLQuery(query);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            message: "Conversation deleted successfully.",
        }));
        resolve();

    } catch (error) {
        console.error("Delete Conversation Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: false,
            error: error.message,
        }));
        resolve();
    }
}
