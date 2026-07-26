const catalyst = require("zcatalyst-sdk-node");
const { sanitizeFilename } = require('./shared/helpers');
const reportFactory = require('./reportFactory');

module.exports = (req, res) => {
    return new Promise((resolve) => {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        let bodyStr = "";
        req.on("data", chunk => { bodyStr += chunk; });
        req.on("end", () => {
            try {
                const body = bodyStr ? JSON.parse(bodyStr) : {};

                if (body.reportType && reportFactory.isSupported(body.reportType)) {
                    if (body.reportType === 'crime_trends') {
                        generateFromPayload(body, req, res, resolve);
                    } else {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: false, message: "Direct payload generation is only supported for 'crime_trends'." }));
                        resolve();
                    }
                } else if (body.conversationId) {
                    generateFromDB(body, req, res, resolve);
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, message: "Either reportType with data or conversationId is required." }));
                    resolve();
                }
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, message: "Invalid JSON format." }));
                resolve();
            }
        });
    });
};

async function generateFromDB(body, req, res, resolve) {
    try {
        const { conversationId } = body;
        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        const result = await zcql.executeZCQLQuery(`
            SELECT ROWID, conversation_title, conversation, question, response, language, created_at
            FROM conversation_history WHERE ROWID = '${conversationId.replace(/'/g, "''")}'
        `);

        if (!result || result.length === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "Conversation not found" }));
            return resolve();
        }

        const record = result[0].conversation_history;
        const data = {
            conversationId: record.ROWID,
            conversation_title: record.conversation_title,
            conversation: record.conversation,
            question: record.question,
            response: record.response,
            language: record.language,
            created_at: record.created_at
        };

        const title = record.conversation_title || record.question || 'Conversation Report';
        const doc = await reportFactory.generate('conversation', data);

        streamPDF(doc, res, resolve, title);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
        resolve();
    }
}

function generateFromPayload(body, req, res, resolve) {
    try {
        const { reportType, period, summary, chart, crimeTypes, insights, dateRange, generatedAt, metadata, barColor } = body;

        const doc = reportFactory.generate(reportType, {
            period,
            dateRange,
            summary,
            chart,
            crimeTypes,
            insights,
            barColor,
            metadata: {
                ...metadata,
                generatedAt: generatedAt || metadata?.generatedAt || new Date().toISOString()
            }
        });

        const filename = `Crime_Intelligence_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
        streamPDF(doc, res, resolve, filename);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
        resolve();
    }
}

function streamPDF(doc, res, resolve, title) {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${sanitizeFilename(title)}.pdf"`,
            "Content-Length": pdfBuffer.length,
        });
        res.end(pdfBuffer);
        resolve();
    });
}
