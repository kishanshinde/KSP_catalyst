const catalyst = require("zcatalyst-sdk-node");
const { resolveUserRow } = require("./resolveUser");
const https = require("https");
const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;

    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) return;

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

loadLocalEnv();

const LLM_TOKEN = process.env.LLM_ACCESS_TOKEN;

// Best-effort LLM title generation for a brand-new conversation. Falls back
// to a truncated question on any failure (missing token, API error, etc.)
// so a save never fails just because the title call did.
function generateTitleWithLLM(question, response, token) {
    return new Promise((resolve) => {
        const fallback = String(question || 'New Investigation').substring(0, 50);

        if (!token || !question) {
            resolve(fallback);
            return;
        }

        const systemPrompt = `You summarize the start of a police case-intelligence chat into a short title.

IMPORTANT RULES:
1. Return ONLY the title text, nothing else — no quotes, no punctuation at the end, no explanations.
2. Keep it to 4-8 words.
3. Summarize what the conversation is about, not a generic phrase like "New Chat".
4. Use the same language as the question.`;

        const userPrompt = `Question: ${String(question).slice(0, 500)}\n\nAnswer: ${String(response || '').slice(0, 500)}\n\nTitle:`;

        const payload = JSON.stringify({
            model: "crm-di-glm47b_30b_it",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 30,
            temperature: 0.3,
            stream: false,
            chat_template_kwargs: {
                enable_thinking: false
            }
        });

        const options = {
            hostname: 'api.catalyst.zoho.in',
            path: '/quickml/v1/project/47024000000013051/glm/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${token}`,
                'CATALYST-ORG': '60073436832',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const request = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => { data += chunk; });
            apiRes.on('end', () => {
                try {
                    if (apiRes.statusCode !== 200) {
                        console.warn('[saveConversation] generateTitleWithLLM API Error:', apiRes.statusCode);
                        return resolve(fallback);
                    }
                    const parsed = JSON.parse(data);
                    let title = parsed.choices?.[0]?.message?.content || '';
                    title = title.replace(/^["'\s]+|["'\s.]+$/g, '').trim();
                    resolve(title.length > 0 ? title.slice(0, 80) : fallback);
                } catch (err) {
                    console.warn('[saveConversation] generateTitleWithLLM Parse Error:', err.message);
                    resolve(fallback);
                }
            });
        });

        request.on('error', (err) => {
            console.warn('[saveConversation] generateTitleWithLLM Request Error:', err.message);
            resolve(fallback);
        });

        request.write(payload);
        request.end();
    });
}

module.exports = (req, res) => {
    return new Promise((resolve) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');
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

        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        // Resolve the logged-in user's Datastore row (users table)
        const resolved = await resolveUserRow(catalystApp, req);
        if (!resolved) {
            setCorsHeaders(res);
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                code: 'AUTH_REQUIRED',
                message: 'Authentication required. Please sign in.',
            }));
            return resolve();
        }
        const user_rowid = resolved.rowid;

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
                WHERE ROWID = ${conversationId} AND user_rowid = ${user_rowid}
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
            const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
            const storedQuestion = question || firstUserMsg;

            const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
            const storedResponse = responseText || lastAssistantMsg;

            // Always LLM-generate the title for a brand-new conversation —
            // the frontend only has a generic placeholder ("New Investigation")
            // at this point, since this is the first save.
            const generatedTitle = await generateTitleWithLLM(storedQuestion, storedResponse, LLM_TOKEN);

            const fields = ['user_rowid', 'language', 'created_at', 'conversation_title'];
            const values = [
                user_rowid,
                `'${language.replace(/'/g, "''")}'`,
                `'${timestamp}'`,
                `'${generatedTitle.replace(/'/g, "''")}'`,
            ];

            if (messages.length > 0) {
                const conversationJson = JSON.stringify(conversationPayload);
                fields.push('conversation');
                values.push(`'${conversationJson.replace(/'/g, "''")}'`);
            }

            if (storedQuestion) {
                fields.push('question');
                values.push(`'${storedQuestion.replace(/'/g, "''")}'`);
            }

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
                title: generatedTitle,
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
