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
            conversationId,
            conversation_title,
            language = 'en',
            conversation,
            question,
            response: responseText,
            created_at,
        } = body;

        // Normalize: accept both bare array (legacy) and wrapped { schemaVersion, messages }
        const conversationPayload =
            Array.isArray(conversation)
                ? { schemaVersion: 1, messages: conversation }
                : (conversation ?? {});

        if (typeof conversationPayload.schemaVersion !== 'number') {
            conversationPayload.schemaVersion = 1
        }

        const messages = Array.isArray(conversationPayload.messages)
            ? conversationPayload.messages
            : [];

        // Hardcoded user_rowid (BigInt FK) until auth is implemented
        const user_rowid = '47024000000029023';

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        const timestamp = created_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (conversationId) {
            // --- UPDATE existing row ---
            const setClauses = [
                `language = '${language.replace(/'/g, "''")}'`,
                `created_at = '${timestamp}'`,
            ];

            if (conversation_title) {
                setClauses.push(`conversation_title = '${conversation_title.replace(/'/g, "''")}'`);
            }

            if (messages.length > 0) {
                const conversationJson = JSON.stringify(conversationPayload);
                setClauses.push(`conversation = '${conversationJson.replace(/'/g, "''")}'`);
            }

            const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
            const storedQuestion = question || firstUserMsg;
            if (storedQuestion) {
                setClauses.push(`question = '${storedQuestion.replace(/'/g, "''")}'`);
            }

            const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
            const storedResponse = responseText || lastAssistantMsg;
            if (storedResponse) {
                setClauses.push(`response = '${storedResponse.replace(/'/g, "''")}'`);
            }

            const updateQuery = `
                UPDATE conversation_history
                SET ${setClauses.join(', ')}
                WHERE ROWID = ${conversationId}
            `;

            console.log("Executing ZCQL UPDATE:", updateQuery);
            await zcql.executeZCQLQuery(updateQuery);

            setCorsHeaders(res);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                message: "Conversation updated successfully.",
                conversationId,
            }));
            resolve();
        } else {
            // --- INSERT new row ---
            const fields = ['user_rowid', 'language', 'created_at'];
            const values = [user_rowid, `'${language.replace(/'/g, "''")}'`, `'${timestamp}'`];

            if (conversation_title) {
                fields.push('conversation_title');
                values.push(`'${conversation_title.replace(/'/g, "''")}'`);
            }

            if (messages.length > 0) {
                const conversationJson = JSON.stringify(conversationPayload);
                fields.push('conversation');
                values.push(`'${conversationJson.replace(/'/g, "''")}'`);
            }

            const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
            const storedQuestion = question || firstUserMsg;
            if (storedQuestion) {
                fields.push('question');
                values.push(`'${storedQuestion.replace(/'/g, "''")}'`);
            }

            const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
            const storedResponse = responseText || lastAssistantMsg;
            if (storedResponse) {
                fields.push('response');
                values.push(`'${storedResponse.replace(/'/g, "''")}'`);
            }

            const insertQuery = `
                INSERT INTO conversation_history (
                    ${fields.join(', ')}
                ) VALUES (
                    ${values.join(', ')}
                )
            `;

            console.log("Executing ZCQL INSERT:", insertQuery);
            const queryResult = await zcql.executeZCQLQuery(insertQuery);

            const newId = queryResult?.[0]?.conversation_history?.ROWID || null;

            setCorsHeaders(res);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                message: "Conversation created successfully.",
                conversationId: newId,
                result: queryResult,
            }));
            resolve();
        }

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
