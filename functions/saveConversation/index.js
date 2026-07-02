const catalyst = require("zcatalyst-sdk-node");

module.exports = (req, res) => {
    return new Promise((resolve) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        if (req.body && Object.keys(req.body).length > 0) {
            processAndSave(req.body, req, res, resolve);
            return;
        }

        let bodyStr = "";
        req.on("data", chunk => { bodyStr += chunk; });
        req.on("end", () => {
            try {
                const parsedBody = bodyStr ? JSON.parse(bodyStr) : {};
                processAndSave(parsedBody, req, res, resolve);
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

async function processAndSave(body, req, res, resolve) {
    try {
        console.log("Incoming Conversation Payload:", JSON.stringify(body));

        const {
            conversation_title,
            language = 'en',
            conversation,
            question,
            response: responseText,
            created_at,
        } = body;

        // Hardcoded user_rowid (BigInt FK) until auth is implemented
        const user_rowid = '47024000000029023';

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        const timestamp = created_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Build fields for the INSERT
        // user_rowid is BigInt — no quotes in ZCQL
        const fields = ['user_rowid', 'language', 'created_at'];
        const values = [user_rowid, `'${language.replace(/'/g, "''")}'`, `'${timestamp}'`];

        // conversation_title
        if (conversation_title) {
            fields.push('conversation_title');
            values.push(`'${conversation_title.replace(/'/g, "''")}'`);
        }

        // conversation JSON array — serialize to string
        if (conversation && Array.isArray(conversation) && conversation.length > 0) {
            const conversationJson = JSON.stringify(conversation);
            fields.push('conversation');
            values.push(`'${conversationJson.replace(/'/g, "''")}'`);
        }

        // question (backward compat — first user message from conversation or explicit)
        const firstUserMsg = conversation && Array.isArray(conversation)
            ? conversation.find(m => m.role === 'user')?.content || ''
            : '';
        const storedQuestion = question || firstUserMsg;
        if (storedQuestion) {
            fields.push('question');
            values.push(`'${storedQuestion.replace(/'/g, "''")}'`);
        }

        // response (backward compat — last assistant message or explicit)
        const lastAssistantMsg = conversation && Array.isArray(conversation)
            ? conversation.filter(m => m.role === 'assistant').pop()?.content || ''
            : '';
        const storedResponse = responseText || lastAssistantMsg;
        if (storedResponse) {
            fields.push('response');
            values.push(`'${storedResponse.replace(/'/g, "''")}'`);
        }

        const query = `
            INSERT INTO conversation_history (
                ${fields.join(', ')}
            ) VALUES (
                ${values.join(', ')}
            )
        `;

        console.log("Executing ZCQL:", query);
        const queryResult = await zcql.executeZCQLQuery(query);

        setCorsHeaders(res);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            message: "Chat historical turn saved successfully.",
            conversationId: queryResult?.[0]?.conversation_history?.ROWID || null,
            result: queryResult
        }));
        resolve();

    } catch (error) {
        console.error("Database Save Exception:", error);
        setCorsHeaders(res);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
        resolve();
    }
}
