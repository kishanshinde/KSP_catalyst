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

        if (req.body && Object.keys(req.body).length > 0) {
            processAndFetch(req.body, req, res, resolve);
            return;
        }

        let bodyStr = "";
        req.on("data", chunk => { bodyStr += chunk; });
        req.on("end", () => {
            try {
                const parsedBody = bodyStr ? JSON.parse(bodyStr) : {};
                processAndFetch(parsedBody, req, res, resolve);
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

async function processAndFetch(body, req, res, resolve) {
    try {
        const { conversationId } = body;

        if (!conversationId) {
            setCorsHeaders(res);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "conversationId is required." }));
            return resolve();
        }

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        const query = `
            SELECT ROWID, conversation_title, language, created_at, question, response, conversation
            FROM conversation_history
            WHERE ROWID = ${conversationId}
        `;

        console.log("Executing ZCQL:", query);
        const queryResult = await zcql.executeZCQLQuery(query);

        if (!queryResult || queryResult.length === 0) {
            setCorsHeaders(res);
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "Conversation not found." }));
            return resolve();
        }

        const row = queryResult[0].conversation_history;

        let messages = [];
        if (row.conversation) {
            try {
                messages = JSON.parse(row.conversation);
            } catch (e) {
                console.warn("Failed to parse conversation JSON:", e.message);
                messages = [];
            }
        }

        const result = {
            id: row.ROWID,
            title: row.conversation_title || row.question || 'Untitled',
            language: row.language || 'en',
            createdAt: row.created_at,
            question: row.question || '',
            response: row.response || '',
            messages,
        };

        setCorsHeaders(res);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            conversation: result,
        }));
        resolve();

    } catch (error) {
        console.error("Get Conversation Error:", error);
        setCorsHeaders(res);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: false,
            error: error.message,
        }));
        resolve();
    }
}
