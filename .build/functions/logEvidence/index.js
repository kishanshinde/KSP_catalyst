// const catalyst = require("zcatalyst-sdk-node");

// module.exports = (req, res) => {
//     return new Promise((resolve, reject) => {
//         // Handle variations in body parser streaming states
//         if (req.body && Object.keys(req.body).length > 0) {
//             processLog(req.body, req, res, resolve);
//         } else {
//             let bodyStr = "";
//             req.on("data", chunk => { bodyStr += chunk; });
//             req.on("end", () => {
//                 try {
//                     processLog(bodyStr ? JSON.parse(bodyStr) : {}, req, res, resolve);
//                 } catch (e) {
//                     res.writeHead(400, { "Content-Type": "application/json" });
//                     res.end(JSON.stringify({ error: "Invalid JSON request body format" }));
//                     resolve();
//                 }
//             });
//         }
//     });
// };

// async function processLog(body, req, res, resolve) {
//     try {
//         // Destination keys matching your exact Data Store Schema columns
//         const { conversation_rowid, source_table, source_rowid, confidence_score } = body;

//         // Validation rule check
//         if (!conversation_rowid || !source_table || !source_rowid) {
//             res.writeHead(400, { "Content-Type": "application/json" });
//             res.end(JSON.stringify({ 
//                 error: "Validation Error: conversation_rowid, source_table, and source_rowid are mandatory." 
//             }));
//             return resolve();
//         }

//         const app = catalyst.initialize(req);
//         const zcql = app.zcql();

//         // Standard format timestamp generation for Catalyst Data Store
//         const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
//         const score = confidence_score !== undefined ? confidence_score : 1.0;

//         // SQL execution context structure
//         const query = `
//             INSERT INTO ai_evidence_log (conversation_rowid, source_table, source_rowid, confidence_score, CREATEDTIME, MODIFIEDTIME)
//             VALUES ('${conversation_rowid}', '${source_table.replace(/'/g, "''")}', '${source_rowid}', ${score}, '${timestamp}', '${timestamp}')
//         `;

//         const result = await zcql.executeZCQLQuery(query);

//         res.writeHead(200, { "Content-Type": "application/json" });
//         res.end(JSON.stringify({ 
//             success: true, 
//             message: "AI Evidence artifact logged successfully.", 
//             result 
//         }));
//         resolve();

//     } catch (err) {
//         console.error("Database Transaction Failure Context:", err);
//         res.writeHead(500, { "Content-Type": "application/json" });
//         res.end(JSON.stringify({ error: err.message }));
//         resolve();
//     }
// }


const catalyst = require("zcatalyst-sdk-node");

module.exports = (req, res) => {
    return new Promise((resolve, reject) => {
        if (req.body && Object.keys(req.body).length > 0) {
            processLog(req.body, req, res, resolve);
        } else {
            let bodyStr = "";
            req.on("data", chunk => { bodyStr += chunk; });
            req.on("end", () => {
                try {
                    processLog(bodyStr ? JSON.parse(bodyStr) : {}, req, res, resolve);
                } catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid JSON request body format" }));
                    resolve();
                }
            });
        }
    });
};

async function processLog(body, req, res, resolve) {
    try {
        const { conversation_rowid, source_table, source_rowid, confidence_score } = body;

        if (!conversation_rowid || !source_table || !source_rowid) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ 
                error: "Validation Error: conversation_rowid, source_table, and source_rowid are mandatory." 
            }));
            return resolve();
        }

        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        const score = confidence_score !== undefined ? confidence_score : 1.0;

        // FIXED: Removed manual CREATEDTIME and MODIFIEDTIME column hooks from the ZCQL query execution context
        const query = `
            INSERT INTO ai_evidence_log (conversation_rowid, source_table, source_rowid, confidence_score)
            VALUES ('${conversation_rowid}', '${source_table.replace(/'/g, "''")}', '${source_rowid}', ${score})
        `;

        const result = await zcql.executeZCQLQuery(query);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
            success: true, 
            message: "AI Evidence artifact logged successfully.", 
            result 
        }));
        resolve();

    } catch (err) {
        console.error("Database Transaction Failure Context:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
        resolve();
    }
}