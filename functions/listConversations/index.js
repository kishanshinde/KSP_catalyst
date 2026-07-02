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

        processList(req, res, resolve);
    });
};

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function processList(req, res, resolve) {
    try {
        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        // Hardcoded user_rowid until auth is implemented
        const userRowId = '47024000000029023';

        const query = `
            SELECT ROWID, conversation_title, language, created_at
            FROM conversation_history
            WHERE user_rowid = ${userRowId}
            ORDER BY created_at DESC
        `;

        console.log("Executing ZCQL:", query);
        const queryResult = await zcql.executeZCQLQuery(query);

        const conversations = (queryResult || []).map((row) => {
            const r = row.conversation_history;
            return {
                id: r.ROWID,
                title: r.conversation_title || 'Untitled',
                language: r.language || 'en',
                createdAt: r.created_at || new Date().toISOString(),
            };
        });

        setCorsHeaders(res);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            conversations,
        }));
        resolve();

    } catch (error) {
        console.error("List Conversations Error:", error);
        setCorsHeaders(res);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: false,
            error: error.message,
        }));
        resolve();
    }
}