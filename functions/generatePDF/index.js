const catalyst = require("zcatalyst-sdk-node");
const PDFDocument = require("pdfkit");

module.exports = (req, res) => {
    return new Promise((resolve) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        if (req.body && req.body.conversationId) {
            generatePDFFromDB(req.body, req, res, resolve);
            return;
        }

        let bodyStr = "";
        req.on("data", chunk => { bodyStr += chunk; });
        req.on("end", () => {
            try {
                const parsedBody = bodyStr ? JSON.parse(bodyStr) : {};
                if (parsedBody.conversationId) {
                    generatePDFFromDB(parsedBody, req, res, resolve);
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, message: "conversationId is required" }));
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

async function generatePDFFromDB(body, req, res, resolve) {
    try {
        const { conversationId } = body;
        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        // Fetch conversation from database
        const result = await zcql.executeZCQLQuery(`
            SELECT
                ROWID,
                conversation_title,
                conversation,
                question,
                response,
                language,
                created_at
            FROM conversation_history
            WHERE ROWID = '${conversationId.replace(/'/g, "''")}'
        `);

        if (!result || result.length === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: "Conversation not found" }));
            return resolve();
        }

        const record = result[0].conversation_history;
        const title = record.conversation_title || record.question || 'Conversation Report';
        const createdAt = record.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Parse conversation messages
        let messages = [];
        if (record.conversation) {
            try {
                messages = JSON.parse(record.conversation);
            } catch (e) {
                console.error("Failed to parse conversation JSON:", e);
                messages = [];
            }
        }

        // Fallback if no conversation JSON but has question/response
        if (messages.length === 0 && record.question) {
            messages.push({ role: 'user', content: record.question });
            if (record.response) {
                messages.push({ role: 'assistant', content: record.response });
            }
        }

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.writeHead(200, {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
                "Content-Length": pdfBuffer.length,
                'Access-Control-Allow-Origin': '*',
            });
            res.end(pdfBuffer);
            resolve();
        });

        // --- PDF Content ---

        // Header: Karnataka Police
        doc.fontSize(18).font('Helvetica-Bold');
        doc.text('KARNATAKA STATE POLICE', { align: 'center' });
        doc.fontSize(10).font('Helvetica');
        doc.text('Crime Intelligence Unit — Conversation Report', { align: 'center' });
        doc.moveDown(0.5);

        // Divider line
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
        doc.moveDown(0.5);

        // Title
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(title);
        doc.moveDown(0.3);

        // Date
        doc.fontSize(9).font('Helvetica');
        doc.text(`Generated: ${createdAt}`, { continued: false });
        doc.moveDown(0.3);
        doc.text(`Messages: ${messages.length}`);
        doc.moveDown(0.5);

        // Divider
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
        doc.moveDown(0.5);

        // Conversation messages
        for (const msg of messages) {
            const role = msg.role === 'user' ? 'Officer' : 'AI Assistant';
            const content = msg.content || '';

            // Role label
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text(`${role}:`, { continued: false });
            doc.moveDown(0.2);

            // Message content (word wrap)
            doc.fontSize(9).font('Helvetica');
            doc.text(content, {
                indent: 10,
                align: 'left',
            });
            doc.moveDown(0.5);
        }

        // Footer
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
        doc.moveDown(0.3);
        doc.fontSize(8).font('Helvetica').fillColor('#666666');
        doc.text('This report is generated by the KSP Crime Intelligence Platform. For official use only.', { align: 'center' });

        doc.end();

    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
        resolve();
    }
}
