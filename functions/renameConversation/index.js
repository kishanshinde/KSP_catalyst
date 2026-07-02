const catalyst = require("zcatalyst-sdk-node");

module.exports = (req, res) => {
    return new Promise((resolve) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function processRename(body, req, res, resolve) {
    try {
        const { conversationId, conversation_title } = body;

        if (!conversationId) {
            setCorsHeaders(res);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "conversationId is required." }));
            return resolve();
        }

        if (!conversation_title) {
            setCorsHeaders(res);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "conversation_title is required." }));
            return resolve();
        }

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        const escapedTitle = conversation_title.replace(/'/g, "''");

        const query = `
            UPDATE conversation_history
            SET conversation_title = '${escapedTitle}'
            WHERE ROWID = ${conversationId}
        `;

        console.log("Executing ZCQL UPDATE:", query);
        await zcql.executeZCQLQuery(query);

        setCorsHeaders(res);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            message: "Conversation renamed successfully.",
        }));
        resolve();

    } catch (error) {
        console.error("Rename Conversation Error:", error);
        setCorsHeaders(res);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: false,
            error: error.message,
        }));
        resolve();
    }
}
