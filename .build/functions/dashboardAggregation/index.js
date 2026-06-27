// const catalyst = require("zcatalyst-sdk-node");

// module.exports = (req, res) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const app = catalyst.initialize(req);
//             const zcql = app.zcql();

//             // 1. Define real-time aggregation queries across your data stores
//             const totalConversationsQuery = `SELECT COUNT(ROWID) FROM conversation_history`;
//             const totalEvidenceQuery = `SELECT COUNT(ROWID) FROM ai_evidence_log`;
//             const languageBreakdownQuery = `SELECT language, COUNT(ROWID) FROM conversation_history GROUP BY language`;

//             // 2. Execute all queries simultaneously
//             const [convResult, evidenceResult, langResult] = await Promise.all([
//                 zcql.executeZCQLQuery(totalConversationsQuery),
//                 zcql.executeZCQLQuery(totalEvidenceQuery),
//                 zcql.executeZCQLQuery(languageBreakdownQuery)
//             ]);

//             // 3. Process totals safely (fall back to 0 if tables are completely empty)
//             const totalChats = convResult[0]?.conversation_history?.ROWID || 0;
//             const totalEvidence = evidenceResult[0]?.ai_evidence_log?.ROWID || 0;

//             // 4. Map the language breakdown rows into an easy-to-chart format
//             const languageMetrics = langResult.map(row => ({
//                 dimension_value: row.conversation_history.language || "Unknown",
//                 metric_value: parseInt(row.conversation_history.ROWID || 0)
//             }));

//             // 5. Structure the standardized JSON payload for your React components
//             const payload = {
//                 success: true,
//                 summary_cards: [
//                     {
//                         metric_type: "total_conversations",
//                         metric_value: parseInt(totalChats)
//                     },
//                     {
//                         metric_type: "total_evidence_logged",
//                         metric_value: parseInt(totalEvidence)
//                     }
//                 ],
//                 charts: {
//                     by_language: languageMetrics
//                 }
//             };

//             // 6. Return response to browser
//             res.writeHead(200, { "Content-Type": "application/json" });
//             res.end(JSON.stringify(payload));
//             resolve();

//         } catch (error) {
//             console.error("Dashboard calculation error:", error);
//             res.writeHead(500, { "Content-Type": "application/json" });
//             res.end(JSON.stringify({ success: false, error: error.message }));
//             resolve();
//         }
//     });
// };








const catalyst = require("zcatalyst-sdk-node");

module.exports = (req, res) => {
    return new Promise(async (resolve, reject) => {
        try {
            const app = catalyst.initialize(req);
            const zcql = app.zcql();

            // 1. Added explicit aliases (AS total) to ensure consistent key extraction
            const totalConversationsQuery = `SELECT COUNT(ROWID) AS total FROM conversation_history`;
            const totalEvidenceQuery = `SELECT COUNT(ROWID) AS total FROM ai_evidence_log`;
            const languageBreakdownQuery = `SELECT language, COUNT(ROWID) AS total FROM conversation_history GROUP BY language`;

            const [convResult, evidenceResult, langResult] = await Promise.all([
                zcql.executeZCQLQuery(totalConversationsQuery),
                zcql.executeZCQLQuery(totalEvidenceQuery),
                zcql.executeZCQLQuery(languageBreakdownQuery)
            ]);

            // 2. Extract values using the new explicit alias keys safely
            const totalChats = convResult[0]?.conversation_history?.total || 0;
            const totalEvidence = evidenceResult[0]?.ai_evidence_log?.total || 0;

            const languageMetrics = langResult.map(row => ({
                dimension_value: row.conversation_history.language || "Unknown",
                metric_value: parseInt(row.conversation_history.total || 0)
            }));

            const payload = {
                success: true,
                summary_cards: [
                    {
                        metric_type: "total_conversations",
                        metric_value: parseInt(totalChats)
                    },
                    {
                        metric_type: "total_evidence_logged",
                        metric_value: parseInt(totalEvidence)
                    }
                ],
                charts: {
                    by_language: languageMetrics
                }
            };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(payload));
            resolve();

        } catch (error) {
            console.error("Dashboard calculation error:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: error.message }));
            resolve();
        }
    });
};