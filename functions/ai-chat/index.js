// // D:\Project\KSP\KSP_catalyst\functions\ai-chat\index.js
// 'use strict';

// const catalyst = require('zcatalyst-sdk-node');
// const https = require('https');
// const fs = require('fs');
// const path = require('path');

// // ============================================================
// // ✅ HARDCODED TOKEN (WORKING)
// // ============================================================
// const HARDCODED_TOKEN = '1000.18ebddc806d2ea0b252b6a681db605af.709511446d7057e83ef5aa4bd4139e3d';  // ← PUT YOUR WORKING TOKEN HERE

// // ============================================================
// // OPTIONAL: Fallback to .env
// // ============================================================
// function loadLocalEnv() {
//     const envPath = path.join(__dirname, '.env');
//     if (!fs.existsSync(envPath)) return;
//     const envFile = fs.readFileSync(envPath, 'utf8');
//     envFile.split(/\r?\n/).forEach(line => {
//         const trimmed = line.trim();
//         if (!trimmed || trimmed.startsWith('#')) return;
//         const separatorIndex = trimmed.indexOf('=');
//         if (separatorIndex === -1) return;
//         const key = trimmed.slice(0, separatorIndex).trim();
//         let value = trimmed.slice(separatorIndex + 1).trim();
//         if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
//             value = value.slice(1, -1);
//         }
//         if (key && process.env[key] === undefined) {
//             process.env[key] = value;
//         }
//     });
// }

// loadLocalEnv();

// // ✅ Get token: Hardcoded first, then .env as fallback
// const ACCESS_TOKEN = HARDCODED_TOKEN || process.env.ACCESS_TOKEN;

// console.log('[ai-chat] 🔑 Token loaded:', ACCESS_TOKEN ? '✅ Yes' : '❌ No');
// console.log('[ai-chat] 🔑 Token starts with:', ACCESS_TOKEN?.substring(0, 15) + '...');

// // ============================================================
// // MAIN FUNCTION
// // ============================================================

// module.exports = async (req, res) => {

//     // CORS
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//     if (req.method === 'OPTIONS') {
//         res.writeHead(200);
//         return res.end();
//     }

//     let body = '';

//     req.on('data', chunk => {
//         body += chunk.toString();
//     });

//     req.on('end', async () => {
//         try {
//             const data = JSON.parse(body);
//             const userQuestion = data.question || data.message || data.user || '';

//             console.log('[ai-chat] 📝 User Question:', userQuestion);

//             if (!userQuestion || userQuestion.trim() === '') {
//                 res.writeHead(400, { 'Content-Type': 'application/json' });
//                 return res.end(JSON.stringify({
//                     success: false,
//                     error: 'No question provided'
//                 }));
//             }

//             // ✅ Check if token exists
//             if (!ACCESS_TOKEN) {
//                 console.error('[ai-chat] ❌ No ACCESS_TOKEN found!');
//                 res.writeHead(500, { 'Content-Type': 'application/json' });
//                 return res.end(JSON.stringify({
//                     success: false,
//                     error: 'ACCESS_TOKEN not configured.'
//                 }));
//             }

//             // ✅ Initialize Catalyst
//             const app = catalyst.initialize(req);
//             const zcql = app.zcql();

//             // Step 1: Classify intent using LLM
//             console.log('[ai-chat] Step 1: Classifying intent...');
//             const intentResult = await callIntentClassifier(userQuestion, ACCESS_TOKEN);
//             console.log('[ai-chat] Intent Result:', JSON.stringify(intentResult));

//             if (!intentResult || !intentResult.intent) {
//                 res.writeHead(200, { 'Content-Type': 'application/json' });
//                 return res.end(JSON.stringify({
//                     success: true,
//                     response: "I'm not sure how to help with that. Please ask about criminal records, FIRs, or crime statistics.",
//                     raw_data: null,
//                     data_count: 0
//                 }));
//             }

//             // Step 2: Execute query using ZCQL directly
//             console.log('[ai-chat] Step 2: Executing query...');
//             const queryResult = await executeQueryDirect(zcql, intentResult);
//             console.log('[ai-chat] Query Result Count:', queryResult.length || 0);

//             // Step 3: Generate user-friendly response
//             console.log('[ai-chat] Step 3: Generating response...');
//             const finalResponse = await generateResponse(userQuestion, queryResult, ACCESS_TOKEN);

//             // Step 4: Save conversation
//             console.log('[ai-chat] Step 4: Saving conversation...');
//             await saveConversationDirect(zcql, {
//                 question: userQuestion,
//                 response: finalResponse.response || 'No response generated',
//                 intent: intentResult,
//                 data_count: queryResult.length || 0
//             });

//             res.writeHead(200, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({
//                 success: true,
//                 intent: intentResult,
//                 response: finalResponse.response || 'No response generated',
//                 raw_data: queryResult,
//                 data_count: queryResult.length || 0
//             }));

//         } catch (err) {
//             console.error('[ai-chat] ❌ Error:', err);
//             res.writeHead(500, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({
//                 success: false,
//                 error: err.message || 'Internal server error'
//             }));
//         }
//     });
// };

// // ============================================================
// // HELPER: Call Intent Classifier using LLM
// // ============================================================

// function callIntentClassifier(userQuestion, ACCESS_TOKEN) {
//     return new Promise((resolve, reject) => {
//         if (!ACCESS_TOKEN) {
//             reject(new Error('ACCESS_TOKEN is not available'));
//             return;
//         }

//         const systemPrompt = `You are a precise JSON classifier for crime data queries. Always return valid JSON only.

// Supported intents:
// 1. criminal_history - REQUIRED: accused_name
// 2. search_fir - Optional: fir_number, status, location, crime_type
// 3. repeat_offenders
// 4. crime_hotspots - Optional: location
// 5. search_accused - Optional: accused_name
// 6. monthly_crime_trends
// 7. fir_accused - REQUIRED: fir_number
// 8. risk_profile - REQUIRED: accused_name

// Examples:
// User: "What's the criminal history of Ravi Kumar?"
// {"intent":"criminal_history","accused_name":"Ravi Kumar"}

// User: "Show all FIRs in Bangalore"
// {"intent":"search_fir","location":"Bangalore"}

// User: "List repeat offenders"
// {"intent":"repeat_offenders"}

// Return ONLY JSON. No markdown. No backticks.`;

//         const payload = JSON.stringify({
//             model: "crm-di-glm47b_30b_it",
//             messages: [
//                 {
//                     role: "system",
//                     content: systemPrompt
//                 },
//                 {
//                     role: "user",
//                     content: `User Query: "${userQuestion}"\n\nReturn JSON only:`
//                 }
//             ],
//             max_tokens: 300,
//             temperature: 0.3,
//             stream: false,
//             chat_template_kwargs: {
//                 enable_thinking: false
//             }
//         });

//         const options = {
//             hostname: 'api.catalyst.zoho.in',
//             path: '/quickml/v1/project/47024000000013051/glm/chat',
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
//                 'CATALYST-ORG': '60073436832',
//                 'Content-Length': Buffer.byteLength(payload)
//             }
//         };

//         console.log('[ai-chat] 📡 Calling LLM API...');

//         const request = https.request(options, response => {
//             let data = '';

//             response.on('data', chunk => {
//                 data += chunk;
//             });

//             response.on('end', () => {
//                 try {
//                     console.log('[ai-chat] 📡 LLM Response Status:', response.statusCode);

//                     if (response.statusCode === 401) {
//                         console.error('[ai-chat] ❌ Authentication failed. Token is invalid or expired.');
//                         reject(new Error('Authentication failed. Please regenerate your ACCESS_TOKEN.'));
//                         return;
//                     }

//                     if (response.statusCode !== 200) {
//                         console.error('[ai-chat] ❌ LLM API Error:', response.statusCode, data);
//                         reject(new Error(`Intent classifier returned ${response.statusCode}`));
//                         return;
//                     }

//                     const parsed = JSON.parse(data);
//                     let rawText = '';

//                     if (parsed.choices && parsed.choices.length > 0) {
//                         rawText = parsed.choices[0].message?.content || '';
//                     } else if (parsed.output?.text) {
//                         rawText = parsed.output.text;
//                     } else if (parsed.response) {
//                         rawText = parsed.response;
//                     }

//                     const jsonMatch = rawText.match(/\{[\s\S]*\}/);
//                     if (jsonMatch) {
//                         const intentJson = JSON.parse(jsonMatch[0]);
//                         resolve(intentJson);
//                     } else {
//                         resolve({ intent: 'search_fir' });
//                     }
//                 } catch (err) {
//                     reject(err);
//                 }
//             });
//         });

//         request.on('error', (err) => {
//             console.error('[ai-chat] ❌ Request error:', err);
//             reject(err);
//         });

//         request.write(payload);
//         request.end();
//     });
// }

// // ============================================================
// // HELPER: Execute Query Directly using ZCQL
// // ============================================================

// function executeQueryDirect(zcql, intentData) {
//     return new Promise(async (resolve) => {
//         try {
//             const intent = intentData.intent;
//             let result = [];

//             switch (intent) {
//                 case 'criminal_history':
//                     result = await criminalHistoryQuery(zcql, intentData.accused_name);
//                     break;
//                 case 'search_fir':
//                     result = await searchFIRQuery(zcql, intentData);
//                     break;
//                 case 'repeat_offenders':
//                     result = await repeatOffendersQuery(zcql);
//                     break;
//                 case 'crime_hotspots':
//                     result = await crimeHotspotsQuery(zcql, intentData);
//                     break;
//                 case 'fir_accused':
//                     result = await getFIRAccusedQuery(zcql, intentData.fir_number);
//                     break;
//                 case 'risk_profile':
//                     result = await riskProfileQuery(zcql, intentData.accused_name);
//                     break;
//                 case 'monthly_crime_trends':
//                     result = await monthlyCrimeTrendsQuery(zcql);
//                     break;
//                 case 'search_accused':
//                     result = await searchAccusedQuery(zcql, intentData);
//                     break;
//                 default:
//                     result = [];
//             }

//             resolve(result);
//         } catch (err) {
//             console.error('[executeQueryDirect] Error:', err);
//             resolve([]);
//         }
//     });
// }

// // ============================================================
// // QUERY FUNCTIONS (FIXED WITH BETTER SEARCH)
// // ============================================================

// function safeString(value) {
//     if (!value) return null;
//     return String(value).replace(/'/g, "''");
// }

// // ✅ ZCQL-COMPATIBLE: criminalHistoryQuery (using LOWER/LIKE)
// async function criminalHistoryQuery(zcql, accusedName) {
//     if (!accusedName || accusedName.trim() === '') {
//         console.log('[criminalHistoryQuery] Empty accusedName provided');
//         return [];
//     }

//     const searchName = accusedName.trim();
//     console.log('[criminalHistoryQuery] Searching for:', searchName);

//     // First, let's do a simple test query to verify the table exists and has data
//     try {
//         const testQuery = `SELECT COUNT(*) AS total FROM accused`;
//         const testResult = await zcql.executeZCQLQuery(testQuery);
//         console.log('[criminalHistoryQuery] Total accused records:', testResult[0]?.accused?.total || 'unknown');
//     } catch (err) {
//         console.error('[criminalHistoryQuery] Test query failed:', err.message);
//     }

//     let accusedRows = [];

//     // Pattern 1: Use LOWER() with LIKE (ZCQL supports this)
//     try {
//         const query1 = `
//             SELECT ROWID, full_name, gender, occupation, risk_score, is_repeat_offender
//             FROM accused
//             WHERE LOWER(full_name) LIKE '%${safeString(searchName.toLowerCase())}%'
//         `;
//         console.log('[criminalHistoryQuery] Query 1 (LOWER+LIKE):', query1);
//         const result = await zcql.executeZCQLQuery(query1);
//         if (result && result.length > 0) {
//             console.log('[criminalHistoryQuery] ✅ Found by LOWER+LIKE match');
//             accusedRows = result;
//         }
//     } catch (err) {
//         console.log('[criminalHistoryQuery] LOWER+LIKE match failed:', err.message);
//         console.log('[criminalHistoryQuery] Full error:', JSON.stringify(err));
//     }

//     // Pattern 2: Try without LOWER (case-sensitive) - in case data is stored with proper case
//     if (accusedRows.length === 0) {
//         try {
//             // Try different case variations
//             const variations = [
//                 searchName,
//                 searchName.toLowerCase(),
//                 searchName.toUpperCase(),
//                 searchName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
//             ];
            
//             for (const variation of variations) {
//                 try {
//                     const query2 = `
//                         SELECT ROWID, full_name, gender, occupation, risk_score, is_repeat_offender
//                         FROM accused
//                         WHERE full_name LIKE '%${safeString(variation)}%'
//                     `;
//                     console.log('[criminalHistoryQuery] Query 2 (LIKE with variation):', query2);
//                     const result = await zcql.executeZCQLQuery(query2);
//                     if (result && result.length > 0) {
//                         console.log('[criminalHistoryQuery] ✅ Found by LIKE with variation:', variation);
//                         accusedRows = result;
//                         break;
//                     }
//                 } catch (err) {
//                     console.log('[criminalHistoryQuery] Variation failed:', variation, err.message);
//                 }
//             }
//         } catch (err) {
//             console.log('[criminalHistoryQuery] LIKE variations failed:', err.message);
//         }
//     }

//     // Pattern 3: Try exact match with different cases
//     if (accusedRows.length === 0) {
//         const variations = [
//             searchName,
//             searchName.toLowerCase(),
//             searchName.toUpperCase(),
//             searchName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
//         ];
        
//         const uniqueVariations = [...new Set(variations)];
        
//         for (const variation of uniqueVariations) {
//             try {
//                 const query3 = `
//                     SELECT ROWID, full_name, gender, occupation, risk_score, is_repeat_offender
//                     FROM accused
//                     WHERE full_name = '${safeString(variation)}'
//                 `;
//                 console.log('[criminalHistoryQuery] Query 3 (exact match):', query3);
//                 const result = await zcql.executeZCQLQuery(query3);
//                 if (result && result.length > 0) {
//                     console.log('[criminalHistoryQuery] ✅ Found by exact match:', variation);
//                     accusedRows = result;
//                     break;
//                 }
//             } catch (err) {
//                 console.log('[criminalHistoryQuery] Exact match failed for:', variation, err.message);
//             }
//         }
//     }

//     // Pattern 4: Split name and search each part
//     if (accusedRows.length === 0 && searchName.includes(' ')) {
//         const parts = searchName.split(' ');
//         for (const part of parts) {
//             if (part.length < 2) continue;
//             try {
//                 const query4 = `
//                     SELECT ROWID, full_name, gender, occupation, risk_score, is_repeat_offender
//                     FROM accused
//                     WHERE LOWER(full_name) LIKE '%${safeString(part.toLowerCase())}%'
//                 `;
//                 console.log('[criminalHistoryQuery] Query 4 (part search):', query4);
//                 const result = await zcql.executeZCQLQuery(query4);
//                 if (result && result.length > 0) {
//                     console.log('[criminalHistoryQuery] ✅ Found by partial match:', part);
//                     console.log('[criminalHistoryQuery] Found:', result.length, 'results');
//                     accusedRows = result;
//                     break;
//                 }
//             } catch (err) {
//                 console.log('[criminalHistoryQuery] Partial match failed for:', part, err.message);
//             }
//         }
//     }

//     if (accusedRows.length === 0) {
//         console.log('[criminalHistoryQuery] ❌ No accused found for:', searchName);
//         return [];
//     }

//     console.log('[criminalHistoryQuery] Found', accusedRows.length, 'accused matching:', searchName);

//     // Now get criminal history for all matching accused
//     const allResults = [];

//     for (const accRow of accusedRows) {
//         const accused = accRow.accused || accRow;
//         const accusedId = accused.ROWID;

//         try {
//             const historyQuery = `
//                 SELECT
//                     a.full_name,
//                     a.gender,
//                     a.occupation,
//                     a.is_repeat_offender,
//                     a.risk_score,
//                     fa.role_in_crime,
//                     f.fir_number,
//                     f.status,
//                     f.date_registered,
//                     c.crime_name
//                 FROM accused a
//                 JOIN fir_accused fa ON a.ROWID = fa.accused_rowid
//                 JOIN fir f ON f.ROWID = fa.fir_rowid
//                 LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
//                 WHERE a.ROWID = '${accusedId}'
//                 ORDER BY f.date_registered DESC
//             `;

//             const historyResult = await zcql.executeZCQLQuery(historyQuery);

//             if (historyResult && historyResult.length > 0) {
//                 for (const row of historyResult) {
//                     allResults.push({
//                         full_name: row.a.full_name,
//                         gender: row.a.gender,
//                         occupation: row.a.occupation,
//                         is_repeat_offender: row.a.is_repeat_offender,
//                         risk_score: row.a.risk_score,
//                         fir_number: row.f.fir_number,
//                         status: row.f.status,
//                         date_registered: row.f.date_registered,
//                         crime_type: row.c?.crime_name || 'Unknown',
//                         role_in_crime: row.fa.role_in_crime
//                     });
//                 }
//             } else {
//                 allResults.push({
//                     full_name: accused.full_name,
//                     gender: accused.gender || 'Unknown',
//                     occupation: accused.occupation || 'Unknown',
//                     is_repeat_offender: accused.is_repeat_offender || false,
//                     risk_score: accused.risk_score || 0,
//                     fir_number: 'No FIRs found',
//                     status: 'No cases',
//                     date_registered: null,
//                     crime_type: 'N/A',
//                     role_in_crime: 'N/A'
//                 });
//             }
//         } catch (err) {
//             console.error('[criminalHistoryQuery] History query failed for', accusedId, err.message);
//         }
//     }

//     console.log('[criminalHistoryQuery] Total results:', allResults.length);
//     return allResults;
// }

// // ✅ FIXED: searchFIRQuery
// async function searchFIRQuery(zcql, params = {}) {
//     let query = `
//         SELECT 
//             ROWID, 
//             fir_number, 
//             date_registered, 
//             status, 
//             description, 
//             investigating_officer,
//             priorites
//         FROM fir
//     `;
//     const conditions = [];
//     const limit = params.limit || 20;

//     if (params.fir_number) {
//         conditions.push(`fir_number = '${safeString(params.fir_number)}'`);
//     }
//     if (params.status) {
//         conditions.push(`status = '${safeString(params.status)}'`);
//     }
//     if (params.location) {
//         conditions.push(`
//             location_rowid IN (
//                 SELECT ROWID FROM location 
//                 WHERE LOWER(city) LIKE '%${safeString(params.location.toLowerCase())}%'
//                 OR LOWER(district) LIKE '%${safeString(params.location.toLowerCase())}%'
//             )
//         `);
//     }
//     if (params.crime_type) {
//         conditions.push(`
//             crime_type_rowid IN (
//                 SELECT ROWID FROM crime_type_master 
//                 WHERE LOWER(crime_name) LIKE '%${safeString(params.crime_type.toLowerCase())}%'
//             )
//         `);
//     }
//     if (conditions.length > 0) {
//         query += ' WHERE ' + conditions.join(' AND ');
//     }
//     query += ` ORDER BY date_registered DESC LIMIT ${limit}`;

//     try {
//         const result = await zcql.executeZCQLQuery(query);
//         return result.map(row => ({
//             rowid: row.fir.ROWID,
//             fir_number: row.fir.fir_number,
//             date_registered: row.fir.date_registered,
//             status: row.fir.status,
//             description: row.fir.description,
//             investigating_officer: row.fir.investigating_officer,
//             priorites: row.fir.priorites
//         }));
//     } catch (err) {
//         console.error('[searchFIRQuery] Query failed:', err.message);
//         return [];
//     }
// }

// // ✅ ZCQL-COMPATIBLE: searchAccusedQuery
// async function searchAccusedQuery(zcql, params = {}) {
//     let query = `
//         SELECT 
//             ROWID, 
//             full_name, 
//             gender, 
//             occupation, 
//             address, 
//             risk_score, 
//             is_repeat_offender
//         FROM accused
//     `;
//     const conditions = [];
//     const limit = params.limit || 20;

//     if (params.accused_name) {
//         const safeName = safeString(params.accused_name);
//         // Use LOWER with LIKE for case-insensitive search
//         conditions.push(`LOWER(full_name) LIKE '%${safeName.toLowerCase()}%'`);
//     }
//     if (conditions.length > 0) {
//         query += ' WHERE ' + conditions.join(' AND ');
//     }
//     query += ` ORDER BY risk_score DESC LIMIT ${limit}`;

//     try {
//         console.log('[searchAccusedQuery] Query:', query);
//         const result = await zcql.executeZCQLQuery(query);
//         return result.map(row => ({
//             rowid: row.accused.ROWID,
//             full_name: row.accused.full_name,
//             gender: row.accused.gender,
//             occupation: row.accused.occupation,
//             address: row.accused.address,
//             risk_score: row.accused.risk_score,
//             is_repeat_offender: row.accused.is_repeat_offender
//         }));
//     } catch (err) {
//         console.error('[searchAccusedQuery] Query failed:', err.message);
//         console.error('[searchAccusedQuery] Full error:', JSON.stringify(err));
//         return [];
//     }
// }

// // ✅ FIXED: repeatOffendersQuery
// async function repeatOffendersQuery(zcql) {
//     const query = `
//         SELECT 
//             full_name, 
//             gender,
//             risk_score, 
//             is_repeat_offender,
//             (
//                 SELECT COUNT(*) 
//                 FROM fir_accused fa 
//                 WHERE fa.accused_rowid = a.ROWID
//             ) AS total_cases
//         FROM accused a
//         WHERE is_repeat_offender = true
//         ORDER BY risk_score DESC
//     `;

//     try {
//         const result = await zcql.executeZCQLQuery(query);
//         return result.map(row => ({
//             full_name: row.a.full_name,
//             gender: row.a.gender,
//             risk_score: row.a.risk_score,
//             is_repeat_offender: row.a.is_repeat_offender,
//             total_cases: parseInt(row.a.total_cases || 0)
//         }));
//     } catch (err) {
//         console.error('[repeatOffendersQuery] Query failed:', err.message);
//         return [];
//     }
// }

// // ✅ FIXED: crimeHotspotsQuery
// async function crimeHotspotsQuery(zcql, params = {}) {
//     let query = `
//         SELECT 
//             l.city,
//             l.district,
//             COUNT(f.ROWID) AS crime_count
//         FROM fir f
//         JOIN location l ON l.ROWID = f.location_rowid
//     `;
//     const conditions = [];
//     if (params.location) {
//         conditions.push(`
//             LOWER(l.city) LIKE '%${safeString(params.location.toLowerCase())}%'
//             OR LOWER(l.district) LIKE '%${safeString(params.location.toLowerCase())}%'
//         `);
//     }
//     if (conditions.length > 0) {
//         query += ' WHERE ' + conditions.join(' AND ');
//     }
//     query += ` GROUP BY l.city, l.district ORDER BY crime_count DESC`;

//     try {
//         const result = await zcql.executeZCQLQuery(query);
//         return result.map(row => ({
//             city: row.l.city,
//             district: row.l.district,
//             crime_count: parseInt(row.l?.crime_count || 0),
//             hotspot_level: parseInt(row.l?.crime_count || 0) >= 10 ? 'HIGH' :
//                            parseInt(row.l?.crime_count || 0) >= 5 ? 'MEDIUM' : 'LOW'
//         }));
//     } catch (err) {
//         console.error('[crimeHotspotsQuery] Query failed:', err.message);
//         return [];
//     }
// }

// // ✅ FIXED: getFIRAccusedQuery
// async function getFIRAccusedQuery(zcql, firNumber) {
//     if (!firNumber) {
//         console.log('[getFIRAccusedQuery] Empty firNumber provided');
//         return [];
//     }

//     const safeFir = safeString(firNumber);
//     const query = `
//         SELECT
//             f.fir_number,
//             a.full_name,
//             a.gender,
//             a.phone_number,
//             a.is_repeat_offender,
//             a.risk_score,
//             fa.role_in_crime
//         FROM fir f
//         JOIN fir_accused fa ON f.ROWID = fa.fir_rowid
//         JOIN accused a ON a.ROWID = fa.accused_rowid
//         WHERE f.fir_number = '${safeFir}'
//     `;

//     try {
//         const result = await zcql.executeZCQLQuery(query);
//         return result.map(row => ({
//             fir_number: row.f.fir_number,
//             full_name: row.a.full_name,
//             gender: row.a.gender,
//             phone_number: row.a.phone_number,
//             is_repeat_offender: row.a.is_repeat_offender,
//             risk_score: row.a.risk_score,
//             role_in_crime: row.fa.role_in_crime
//         }));
//     } catch (err) {
//         console.error('[getFIRAccusedQuery] Query failed:', err.message);
//         return [];
//     }
// }

// // ✅ FIXED: riskProfileQuery
// async function riskProfileQuery(zcql, accusedName) {
//     if (!accusedName || accusedName.trim() === '') {
//         console.log('[riskProfileQuery] Empty accusedName provided');
//         return [{ error: 'No accused name provided' }];
//     }

//     const safeName = safeString(accusedName.trim());
//     const accusedQuery = `
//         SELECT 
//             ROWID,
//             full_name,
//             gender,
//             occupation,
//             address,
//             risk_score,
//             is_repeat_offender
//         FROM accused
//         WHERE LOWER(full_name) LIKE '%${safeName.toLowerCase()}%'
//     `;

//     try {
//         const accusedResult = await zcql.executeZCQLQuery(accusedQuery);
//         if (!accusedResult.length) {
//             return [{ error: 'Accused not found' }];
//         }

//         const accused = accusedResult[0].accused;
//         const firQuery = `
//             SELECT 
//                 f.ROWID AS fir_id,
//                 f.fir_number,
//                 f.status,
//                 f.date_registered,
//                 l.city,
//                 l.district,
//                 a2.full_name AS associate_name
//             FROM fir_accused fa1
//             JOIN fir f ON f.ROWID = fa1.fir_rowid
//             LEFT JOIN location l ON l.ROWID = f.location_rowid
//             LEFT JOIN fir_accused fa2 ON fa2.fir_rowid = f.ROWID AND fa2.accused_rowid != '${accused.ROWID}'
//             LEFT JOIN accused a2 ON a2.ROWID = fa2.accused_rowid
//             WHERE fa1.accused_rowid = '${accused.ROWID}'
//             ORDER BY f.date_registered DESC
//         `;

//         const firResult = await zcql.executeZCQLQuery(firQuery);
//         const totalFirs = firResult.length;
//         const associates = new Set();
//         const locations = new Set();
//         const firNumbers = [];

//         for (const row of firResult) {
//             if (row.f?.fir_number) {
//                 firNumbers.push(row.f.fir_number);
//             }
//             if (row.a2?.full_name && row.a2.full_name !== accused.full_name) {
//                 associates.add(row.a2.full_name);
//             }
//             if (row.l?.city) {
//                 locations.add(row.l.city);
//             } else if (row.l?.district) {
//                 locations.add(row.l.district);
//             }
//         }

//         let threatLevel = 'LOW';
//         if (Number(accused.risk_score) >= 80) {
//             threatLevel = 'HIGH';
//         } else if (Number(accused.risk_score) >= 60) {
//             threatLevel = 'MEDIUM';
//         }

//         return [{
//             name: accused.full_name,
//             gender: accused.gender,
//             occupation: accused.occupation,
//             address: accused.address,
//             risk_score: accused.risk_score,
//             repeat_offender: accused.is_repeat_offender,
//             total_firs: totalFirs,
//             fir_numbers: firNumbers,
//             known_associates: Array.from(associates),
//             associate_count: associates.size,
//             hotspot_locations: Array.from(locations),
//             threat_level: threatLevel
//         }];
//     } catch (err) {
//         console.error('[riskProfileQuery] Query failed:', err.message);
//         return [{ error: 'Query failed: ' + err.message }];
//     }
// }

// // ✅ FIXED: monthlyCrimeTrendsQuery
// async function monthlyCrimeTrendsQuery(zcql) {
//     const query = `SELECT date_registered FROM fir`;

//     try {
//         const result = await zcql.executeZCQLQuery(query);
//         const monthCounts = {};
//         for (const row of result) {
//             const date = row.fir.date_registered;
//             if (date) {
//                 const month = date.substring(0, 7);
//                 monthCounts[month] = (monthCounts[month] || 0) + 1;
//             }
//         }
//         const trends = Object.entries(monthCounts)
//             .map(([month, count]) => ({ month, crime_count: count }))
//             .sort((a, b) => a.month.localeCompare(b.month));
//         for (let i = 0; i < trends.length; i++) {
//             if (i === 0) {
//                 trends[i].trend = 'BASELINE';
//                 trends[i].change = '0';
//             } else {
//                 const diff = trends[i].crime_count - trends[i - 1].crime_count;
//                 trends[i].trend = diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE';
//                 trends[i].change = diff > 0 ? `+${diff}` : `${diff}`;
//             }
//         }
//         return trends;
//     } catch (err) {
//         console.error('[monthlyCrimeTrendsQuery] Query failed:', err.message);
//         return [];
//     }
// }

// // ============================================================
// // HELPER: Generate Response using LLM
// // ============================================================

// function generateResponse(userQuestion, queryResult, ACCESS_TOKEN) {
//     return new Promise((resolve, reject) => {
//         if (!ACCESS_TOKEN) {
//             reject(new Error('ACCESS_TOKEN is not available'));
//             return;
//         }

//         let formattedData = '';
//         if (queryResult && queryResult.length > 0) {
//             formattedData = JSON.stringify(queryResult, null, 2);
//         } else {
//             formattedData = 'No data found.';
//         }

//         const systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP).
// Convert raw crime data into clear, professional, user-friendly responses.

// Guidelines:
// 1. Be professional and factual
// 2. Format data in a readable way
// 3. If the user asks for "history" or "record", provide a chronological summary
// 4. If no data is found, politely say so
// 5. Use bullet points for cases
// 6. Highlight important details (dates, FIR numbers, status)`;

//         const userPrompt = `User Question: "${userQuestion}"

// Raw Data from Database:
// ${formattedData}

// Respond in a clear, professional way. If data exists, present it in a readable format.`;

//         const payload = JSON.stringify({
//             model: "crm-di-glm47b_30b_it",
//             messages: [
//                 {
//                     role: "system",
//                     content: systemPrompt
//                 },
//                 {
//                     role: "user",
//                     content: userPrompt
//                 }
//             ],
//             max_tokens: 1000,
//             temperature: 0.5,
//             stream: false,
//             chat_template_kwargs: {
//                 enable_thinking: false
//             }
//         });

//         const options = {
//             hostname: 'api.catalyst.zoho.in',
//             path: '/quickml/v1/project/47024000000013051/glm/chat',
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
//                 'CATALYST-ORG': '60073436832',
//                 'Content-Length': Buffer.byteLength(payload)
//             }
//         };

//         const request = https.request(options, response => {
//             let data = '';

//             response.on('data', chunk => {
//                 data += chunk;
//             });

//             response.on('end', () => {
//                 try {
//                     if (response.statusCode === 401) {
//                         console.error('[ai-chat] Authentication failed for response generation.');
//                         resolve({ response: "Authentication failed. Please check your API token." });
//                         return;
//                     }

//                     if (response.statusCode !== 200) {
//                         resolve({ response: "Unable to generate response. Please try again." });
//                         return;
//                     }

//                     const parsed = JSON.parse(data);
//                     let responseText = '';

//                     if (parsed.choices && parsed.choices.length > 0) {
//                         responseText = parsed.choices[0].message?.content || '';
//                     } else if (parsed.output?.text) {
//                         responseText = parsed.output.text;
//                     } else if (parsed.response) {
//                         responseText = parsed.response;
//                     }

//                     if (!responseText || responseText.trim() === '') {
//                         responseText = "I found some data but couldn't format it.";
//                     }

//                     resolve({ response: responseText });
//                 } catch (err) {
//                     resolve({ response: "Error processing response. Please try again." });
//                 }
//             });
//         });

//         request.on('error', () => {
//             resolve({ response: "Unable to connect to AI service. Please try again." });
//         });

//         request.write(payload);
//         request.end();
//     });
// }

// // ============================================================
// // HELPER: Save Conversation Directly
// // ============================================================

// function saveConversationDirect(zcql, data) {
//     return new Promise((resolve) => {
//         try {
//             const user_rowid = '47024000000029023';
//             const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
//             const conversation = JSON.stringify([
//                 { role: 'user', content: data.question },
//                 { role: 'assistant', content: data.response }
//             ]);

//             const query = `
//                 INSERT INTO conversation_history (
//                     user_rowid, 
//                     conversation_title,
//                     conversation,
//                     question,
//                     response,
//                     language,
//                     created_at
//                 ) VALUES (
//                     '${user_rowid}',
//                     '${safeString(data.question.substring(0, 50))}',
//                     '${safeString(conversation)}',
//                     '${safeString(data.question)}',
//                     '${safeString(data.response)}',
//                     'en',
//                     '${timestamp}'
//                 )
//             `;

//             zcql.executeZCQLQuery(query).then(() => {
//                 console.log('[ai-chat] ✅ Conversation saved successfully');
//                 resolve();
//             }).catch((err) => {
//                 console.error('[ai-chat] ❌ Failed to save conversation:', err);
//                 resolve();
//             });
//         } catch (err) {
//             console.error('[ai-chat] ❌ Save conversation error:', err);
//             resolve();
//         }
//     });
// }





// Only English is supported
// D:\Project\KSP\KSP_catalyst\functions\ai-chat\index.js
// 'use strict';

// const catalyst = require('zcatalyst-sdk-node');
// const https = require('https');
// const fs = require('fs');
// const path = require('path');

// // ============================================================
// // ✅ HARDCODED TOKEN
// // ============================================================
// // const HARDCODED_TOKEN = '1000.18ebddc806d2ea0b252b6a681db605af.709511446d7057e83ef5aa4bd4139e3d';  // ← PUT YOUR WORKING TOKEN HERE
// const HARDCODED_TOKEN = '1000.9fac282788e0ec86b698e366ed7edc5c.8a54ade792ea47fab46b871fd74e66ec';  // ← PUT

// // ============================================================
// // OPTIONAL: Fallback to .env
// // ============================================================
// function loadLocalEnv() {
//     const envPath = path.join(__dirname, '.env');
//     if (!fs.existsSync(envPath)) return;
//     const envFile = fs.readFileSync(envPath, 'utf8');
//     envFile.split(/\r?\n/).forEach(line => {
//         const trimmed = line.trim();
//         if (!trimmed || trimmed.startsWith('#')) return;
//         const separatorIndex = trimmed.indexOf('=');
//         if (separatorIndex === -1) return;
//         const key = trimmed.slice(0, separatorIndex).trim();
//         let value = trimmed.slice(separatorIndex + 1).trim();
//         if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
//             value = value.slice(1, -1);
//         }
//         if (key && process.env[key] === undefined) {
//             process.env[key] = value;
//         }
//     });
// }

// loadLocalEnv();

// // ✅ Get token
// const ACCESS_TOKEN = HARDCODED_TOKEN || process.env.ACCESS_TOKEN;

// console.log('[ai-chat] 🔑 Token loaded:', ACCESS_TOKEN ? '✅ Yes' : '❌ No');
// console.log('[ai-chat] 🔑 Token starts with:', ACCESS_TOKEN?.substring(0, 15) + '...');

// // ============================================================
// // MAIN FUNCTION
// // ============================================================

// module.exports = async (req, res) => {

//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//     if (req.method === 'OPTIONS') {
//         res.writeHead(200);
//         return res.end();
//     }

//     let body = '';

//     req.on('data', chunk => {
//         body += chunk.toString();
//     });

//     req.on('end', async () => {
//         try {
//             const data = JSON.parse(body);
//             const userQuestion = data.question || data.message || data.user || '';

//             console.log('[ai-chat] 📝 User Question:', userQuestion);

//             if (!userQuestion || userQuestion.trim() === '') {
//                 res.writeHead(400, { 'Content-Type': 'application/json' });
//                 return res.end(JSON.stringify({
//                     success: false,
//                     error: 'No question provided'
//                 }));
//             }

//             if (!ACCESS_TOKEN) {
//                 console.error('[ai-chat] ❌ No ACCESS_TOKEN found!');
//                 res.writeHead(500, { 'Content-Type': 'application/json' });
//                 return res.end(JSON.stringify({
//                     success: false,
//                     error: 'ACCESS_TOKEN not configured.'
//                 }));
//             }

//             const app = catalyst.initialize(req);
//             const zcql = app.zcql();

//             // Step 1: Classify intent
//             console.log('[ai-chat] Step 1: Classifying intent...');
//             const intentResult = await callIntentClassifier(userQuestion, ACCESS_TOKEN);
//             console.log('[ai-chat] Intent Result:', JSON.stringify(intentResult));

//             if (!intentResult || !intentResult.intent) {
//                 res.writeHead(200, { 'Content-Type': 'application/json' });
//                 return res.end(JSON.stringify({
//                     success: true,
//                     response: "I'm not sure how to help with that.",
//                     raw_data: null,
//                     data_count: 0
//                 }));
//             }

//             // Step 2: Search ALL tables
//             console.log('[ai-chat] Step 2: Searching all tables...');
//             const queryResult = await searchAllTables(zcql, intentResult);
//             console.log('[ai-chat] Query Result Count:', queryResult.length || 0);

//             // Step 3: Generate response
//             console.log('[ai-chat] Step 3: Generating response...');
//             const finalResponse = await generateResponse(userQuestion, queryResult, ACCESS_TOKEN);

//             // Step 4: Save conversation
//             console.log('[ai-chat] Step 4: Saving conversation...');
//             await saveConversationDirect(zcql, {
//                 question: userQuestion,
//                 response: finalResponse.response || 'No response generated',
//                 intent: intentResult,
//                 data_count: queryResult.length || 0
//             });

//             res.writeHead(200, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({
//                 success: true,
//                 intent: intentResult,
//                 response: finalResponse.response || 'No response generated',
//                 raw_data: queryResult,
//                 data_count: queryResult.length || 0
//             }));

//         } catch (err) {
//             console.error('[ai-chat] ❌ Error:', err);
//             res.writeHead(500, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({
//                 success: false,
//                 error: err.message || 'Internal server error'
//             }));
//         }
//     });
// };

// // ============================================================
// // HELPER: Call Intent Classifier
// // ============================================================

// function callIntentClassifier(userQuestion, ACCESS_TOKEN) {
//     return new Promise((resolve, reject) => {
//         if (!ACCESS_TOKEN) {
//             reject(new Error('ACCESS_TOKEN is not available'));
//             return;
//         }

//         const systemPrompt = `You are a precise JSON classifier for crime data queries. Always return valid JSON only.

// Supported intents:
// 1. criminal_history - REQUIRED: accused_name
// 2. search_fir - Optional: fir_number, status, location, crime_type
// 3. repeat_offenders
// 4. crime_hotspots - Optional: location
// 5. search_accused - Optional: accused_name
// 6. monthly_crime_trends
// 7. fir_accused - REQUIRED: fir_number
// 8. risk_profile - REQUIRED: accused_name

// Examples:
// User: "What's the criminal history of Ravi Kumar?"
// {"intent":"criminal_history","accused_name":"Ravi Kumar"}

// User: "Show all FIRs in Bangalore"
// {"intent":"search_fir","location":"Bangalore"}

// User: "List repeat offenders"
// {"intent":"repeat_offenders"}

// Return ONLY JSON. No markdown. No backticks.`;

//         const payload = JSON.stringify({
//             model: "crm-di-glm47b_30b_it",
//             messages: [
//                 {
//                     role: "system",
//                     content: systemPrompt
//                 },
//                 {
//                     role: "user",
//                     content: `User Query: "${userQuestion}"\n\nReturn JSON only:`
//                 }
//             ],
//             max_tokens: 300,
//             temperature: 0.3,
//             stream: false,
//             chat_template_kwargs: {
//                 enable_thinking: false
//             }
//         });

//         const options = {
//             hostname: 'api.catalyst.zoho.in',
//             path: '/quickml/v1/project/47024000000013051/glm/chat',
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
//                 'CATALYST-ORG': '60073436832',
//                 'Content-Length': Buffer.byteLength(payload)
//             }
//         };

//         console.log('[ai-chat] 📡 Calling LLM API...');

//         const request = https.request(options, response => {
//             let data = '';

//             response.on('data', chunk => {
//                 data += chunk;
//             });

//             response.on('end', () => {
//                 try {
//                     console.log('[ai-chat] 📡 LLM Response Status:', response.statusCode);

//                     if (response.statusCode === 401) {
//                         reject(new Error('Authentication failed. Please regenerate your ACCESS_TOKEN.'));
//                         return;
//                     }

//                     if (response.statusCode !== 200) {
//                         reject(new Error(`Intent classifier returned ${response.statusCode}`));
//                         return;
//                     }

//                     const parsed = JSON.parse(data);
//                     let rawText = '';

//                     if (parsed.choices && parsed.choices.length > 0) {
//                         rawText = parsed.choices[0].message?.content || '';
//                     } else if (parsed.output?.text) {
//                         rawText = parsed.output.text;
//                     } else if (parsed.response) {
//                         rawText = parsed.response;
//                     }

//                     const jsonMatch = rawText.match(/\{[\s\S]*\}/);
//                     if (jsonMatch) {
//                         const intentJson = JSON.parse(jsonMatch[0]);
//                         resolve(intentJson);
//                     } else {
//                         resolve({ intent: 'search_fir' });
//                     }
//                 } catch (err) {
//                     reject(err);
//                 }
//             });
//         });

//         request.on('error', reject);
//         request.write(payload);
//         request.end();
//     });
// }

// // ============================================================
// // HELPER: Search ALL Tables
// // ============================================================

// async function searchAllTables(zcql, intentData) {
//     const searchName = intentData.accused_name || '';
    
//     if (!searchName || searchName.trim() === '') {
//         console.log('[searchAllTables] No search name provided');
//         return [];
//     }

//     console.log('[searchAllTables] Searching for:', searchName);
    
//     const allResults = [];
//     const nameParts = searchName.trim().split(' ');
//     const variations = [
//         searchName,
//         searchName.toLowerCase(),
//         searchName.toUpperCase(),
//         nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
//         nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
//     ];
    
//     // Remove duplicates
//     const uniqueVariations = [...new Set(variations)];

//     // ============================================================
//     // TABLE 1: Search in ACCUSED table
//     // ============================================================
//     console.log('[searchAllTables] 🔍 Searching in ACCUSED table...');
//     let accusedResults = [];
    
//     for (const variation of uniqueVariations) {
//         if (accusedResults.length > 0) break;
//         try {
//             const query = `
//                 SELECT 
//                     ROWID, 
//                     full_name, 
//                     gender, 
//                     occupation, 
//                     address,
//                     risk_score, 
//                     is_repeat_offender
//                 FROM accused
//                 WHERE full_name = '${safeString(variation)}'
//                 OR full_name LIKE '%${safeString(variation)}%'
//             `;
//             const result = await zcql.executeZCQLQuery(query);
//             if (result && result.length > 0) {
//                 accusedResults = result;
//                 console.log('[searchAllTables] ✅ Found in ACCUSED:', result.length, 'results');
//                 break;
//             }
//         } catch (err) {
//             console.log('[searchAllTables] ACCUSED search failed:', err.message);
//         }
//     }

//     // Process accused results
//     for (const row of accusedResults) {
//         const accused = row.accused || row;
//         allResults.push({
//             table: 'accused',
//             type: 'Accused Person',
//             name: accused.full_name,
//             gender: accused.gender || 'Unknown',
//             occupation: accused.occupation || 'Unknown',
//             risk_score: accused.risk_score || 0,
//             is_repeat_offender: accused.is_repeat_offender || false,
//             rowid: accused.ROWID,
//             details: `Found in accused records. Risk score: ${accused.risk_score || 0}`
//         });

//         // Also fetch FIRs for this accused
//         try {
//             const firQuery = `
//                 SELECT 
//                     f.fir_number,
//                     f.status,
//                     f.date_registered,
//                     c.crime_name,
//                     fa.role_in_crime
//                 FROM fir_accused fa
//                 JOIN fir f ON f.ROWID = fa.fir_rowid
//                 LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
//                 WHERE fa.accused_rowid = '${accused.ROWID}'
//                 ORDER BY f.date_registered DESC
//             `;
//             const firResults = await zcql.executeZCQLQuery(firQuery);
            
//             if (firResults && firResults.length > 0) {
//                 for (const firRow of firResults) {
//                     allResults.push({
//                         table: 'fir_accused',
//                         type: 'FIR Case',
//                         name: accused.full_name,
//                         fir_number: firRow.f?.fir_number || 'Unknown',
//                         status: firRow.f?.status || 'Unknown',
//                         date_registered: firRow.f?.date_registered || 'Unknown',
//                         crime_type: firRow.c?.crime_name || 'Unknown',
//                         role_in_crime: firRow.fa?.role_in_crime || 'Unknown',
//                         details: `Involved in FIR ${firRow.f?.fir_number || 'Unknown'}`
//                     });
//                 }
//             }
//         } catch (err) {
//             console.log('[searchAllTables] FIR fetch failed:', err.message);
//         }
//     }

//     // ============================================================
//     // TABLE 2: Search in VICTIM table
//     // ============================================================
//     if (allResults.length === 0) {
//         console.log('[searchAllTables] 🔍 Searching in VICTIM table...');
//         let victimResults = [];
        
//         for (const variation of uniqueVariations) {
//             if (victimResults.length > 0) break;
//             try {
//                 const query = `
//                     SELECT 
//                         ROWID, 
//                         full_name, 
//                         gender, 
//                         occupation, 
//                         address,
//                         phone_number
//                     FROM victim
//                     WHERE full_name = '${safeString(variation)}'
//                     OR full_name LIKE '%${safeString(variation)}%'
//                 `;
//                 const result = await zcql.executeZCQLQuery(query);
//                 if (result && result.length > 0) {
//                     victimResults = result;
//                     console.log('[searchAllTables] ✅ Found in VICTIM:', result.length, 'results');
//                     break;
//                 }
//             } catch (err) {
//                 console.log('[searchAllTables] VICTIM search failed:', err.message);
//             }
//         }

//         for (const row of victimResults) {
//             const victim = row.victim || row;
//             allResults.push({
//                 table: 'victim',
//                 type: 'Victim',
//                 name: victim.full_name,
//                 gender: victim.gender || 'Unknown',
//                 occupation: victim.occupation || 'Unknown',
//                 address: victim.address || 'Unknown',
//                 phone_number: victim.phone_number || 'Unknown',
//                 rowid: victim.ROWID,
//                 details: `Found as victim in crime records`
//             });
//         }
//     }

//     // ============================================================
//     // TABLE 3: Search in FIR table (investigating officer)
//     // ============================================================
//     if (allResults.length === 0) {
//         console.log('[searchAllTables] 🔍 Searching in FIR table...');
//         let firResults = [];
        
//         for (const variation of uniqueVariations) {
//             if (firResults.length > 0) break;
//             try {
//                 const query = `
//                     SELECT 
//                         ROWID, 
//                         fir_number, 
//                         status, 
//                         date_registered, 
//                         investigating_officer,
//                         description
//                     FROM fir
//                     WHERE investigating_officer = '${safeString(variation)}'
//                     OR investigating_officer LIKE '%${safeString(variation)}%'
//                     OR description LIKE '%${safeString(variation)}%'
//                 `;
//                 const result = await zcql.executeZCQLQuery(query);
//                 if (result && result.length > 0) {
//                     firResults = result;
//                     console.log('[searchAllTables] ✅ Found in FIR:', result.length, 'results');
//                     break;
//                 }
//             } catch (err) {
//                 console.log('[searchAllTables] FIR search failed:', err.message);
//             }
//         }

//         for (const row of firResults) {
//             const fir = row.fir || row;
//             allResults.push({
//                 table: 'fir',
//                 type: 'FIR Record',
//                 fir_number: fir.fir_number || 'Unknown',
//                 status: fir.status || 'Unknown',
//                 date_registered: fir.date_registered || 'Unknown',
//                 investigating_officer: fir.investigating_officer || 'Unknown',
//                 description: fir.description || 'Unknown',
//                 rowid: fir.ROWID,
//                 details: `Found as investigating officer or mentioned in FIR ${fir.fir_number || 'Unknown'}`
//             });
//         }
//     }

//     // ============================================================
//     // TABLE 4: Search in USERS table (police officers)
//     // ============================================================
//     if (allResults.length === 0) {
//         console.log('[searchAllTables] 🔍 Searching in USERS table...');
//         let userResults = [];
        
//         for (const variation of uniqueVariations) {
//             if (userResults.length > 0) break;
//             try {
//                 const query = `
//                     SELECT 
//                         ROWID, 
//                         full_name, 
//                         email, 
//                         phone_number
//                     FROM users
//                     WHERE full_name = '${safeString(variation)}'
//                     OR full_name LIKE '%${safeString(variation)}%'
//                     OR email LIKE '%${safeString(variation)}%'
//                 `;
//                 const result = await zcql.executeZCQLQuery(query);
//                 if (result && result.length > 0) {
//                     userResults = result;
//                     console.log('[searchAllTables] ✅ Found in USERS:', result.length, 'results');
//                     break;
//                 }
//             } catch (err) {
//                 console.log('[searchAllTables] USERS search failed:', err.message);
//             }
//         }

//         for (const row of userResults) {
//             const user = row.users || row;
//             allResults.push({
//                 table: 'users',
//                 type: 'Police Officer/User',
//                 name: user.full_name,
//                 email: user.email || 'Unknown',
//                 phone_number: user.phone_number || 'Unknown',
//                 rowid: user.ROWID,
//                 details: `Found in system users/records`
//             });
//         }
//     }

//     console.log('[searchAllTables] Total results from all tables:', allResults.length);
//     return allResults;
// }

// // ============================================================
// // HELPER: Safe String
// // ============================================================

// function safeString(value) {
//     if (!value) return '';
//     return String(value).replace(/'/g, "''");
// }

// // ============================================================
// // HELPER: Generate Response
// // ============================================================

// function generateResponse(userQuestion, queryResult, ACCESS_TOKEN) {
//     return new Promise((resolve, reject) => {
//         if (!ACCESS_TOKEN) {
//             reject(new Error('ACCESS_TOKEN is not available'));
//             return;
//         }

//         let formattedData = '';
//         if (queryResult && queryResult.length > 0) {
//             formattedData = JSON.stringify(queryResult, null, 2);
//         } else {
//             formattedData = 'No data found.';
//         }

//         const systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP).
// Convert raw crime data into clear, professional, user-friendly responses.

// Guidelines:
// 1. Be professional and factual
// 2. Format data in a readable way
// 3. If the user asks for "history" or "record", provide a chronological summary
// 4. If no data is found, politely say so
// 5. Use bullet points for cases
// 6. Highlight important details (dates, FIR numbers, status)
// 7. If the name has a slight spelling variation, mention the correct spelling found
// 8. Group results by table/source (Accused, Victim, FIR, etc.)`;

//         const userPrompt = `User Question: "${userQuestion}"

// Raw Data from Database (from all tables):
// ${formattedData}

// Respond in a clear, professional way. If data exists, present it in a readable format with proper grouping.`;

//         const payload = JSON.stringify({
//             model: "crm-di-glm47b_30b_it",
//             messages: [
//                 {
//                     role: "system",
//                     content: systemPrompt
//                 },
//                 {
//                     role: "user",
//                     content: userPrompt
//                 }
//             ],
//             max_tokens: 1500,
//             temperature: 0.5,
//             stream: false,
//             chat_template_kwargs: {
//                 enable_thinking: false
//             }
//         });

//         const options = {
//             hostname: 'api.catalyst.zoho.in',
//             path: '/quickml/v1/project/47024000000013051/glm/chat',
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
//                 'CATALYST-ORG': '60073436832',
//                 'Content-Length': Buffer.byteLength(payload)
//             }
//         };

//         const request = https.request(options, response => {
//             let data = '';

//             response.on('data', chunk => {
//                 data += chunk;
//             });

//             response.on('end', () => {
//                 try {
//                     if (response.statusCode === 401) {
//                         resolve({ response: "Authentication failed. Please check your API token." });
//                         return;
//                     }

//                     if (response.statusCode !== 200) {
//                         resolve({ response: "Unable to generate response. Please try again." });
//                         return;
//                     }

//                     const parsed = JSON.parse(data);
//                     let responseText = '';

//                     if (parsed.choices && parsed.choices.length > 0) {
//                         responseText = parsed.choices[0].message?.content || '';
//                     } else if (parsed.output?.text) {
//                         responseText = parsed.output.text;
//                     } else if (parsed.response) {
//                         responseText = parsed.response;
//                     }

//                     if (!responseText || responseText.trim() === '') {
//                         responseText = "I found some data but couldn't format it.";
//                     }

//                     resolve({ response: responseText });
//                 } catch (err) {
//                     resolve({ response: "Error processing response. Please try again." });
//                 }
//             });
//         });

//         request.on('error', () => {
//             resolve({ response: "Unable to connect to AI service. Please try again." });
//         });

//         request.write(payload);
//         request.end();
//     });
// }

// // ============================================================
// // HELPER: Save Conversation
// // ============================================================

// function saveConversationDirect(zcql, data) {
//     return new Promise((resolve) => {
//         try {
//             const user_rowid = '47024000000029023';
//             const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
//             const conversation = JSON.stringify([
//                 { role: 'user', content: data.question },
//                 { role: 'assistant', content: data.response }
//             ]);

//             const query = `
//                 INSERT INTO conversation_history (
//                     user_rowid, 
//                     conversation_title,
//                     conversation,
//                     question,
//                     response,
//                     language,
//                     created_at
//                 ) VALUES (
//                     '${user_rowid}',
//                     '${safeString(data.question.substring(0, 50))}',
//                     '${safeString(conversation)}',
//                     '${safeString(data.question)}',
//                     '${safeString(data.response)}',
//                     'en',
//                     '${timestamp}'
//                 )
//             `;

//             zcql.executeZCQLQuery(query).then(() => {
//                 console.log('[ai-chat] ✅ Conversation saved successfully');
//                 resolve();
//             }).catch((err) => {
//                 console.error('[ai-chat] ❌ Failed to save conversation:', err);
//                 resolve();
//             });
//         } catch (err) {
//             console.error('[ai-chat] ❌ Save conversation error:', err);
//             resolve();
//         }
//     });
// }


// D:\Project\KSP\KSP_catalyst\functions\ai-chat\index.js
'use strict';

const catalyst = require('zcatalyst-sdk-node');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// ✅ HARDCODED TOKENS
// ============================================================
const LLM_HARDCODED_TOKEN = '1000.adfbaddb280fcab1f573f16d59bec769.4df2a86b168c1d1a366ecbce34270d04';  // LLM Token
const TRANSLATE_HARDCODED_TOKEN = '1000.6e6805494689768faf327fedc2dcd096.082448a511029650b3da7d4153da125e';  // Translation Token (same or different)

// ============================================================
// OPTIONAL: Fallback to .env
// ============================================================
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

// ✅ Get tokens
const LLM_TOKEN = LLM_HARDCODED_TOKEN || process.env.LLM_ACCESS_TOKEN;
const TRANSLATE_TOKEN = TRANSLATE_HARDCODED_TOKEN || process.env.TRANSLATE_ACCESS_TOKEN;

console.log('[ai-chat] 🔑 LLM Token loaded:', LLM_TOKEN ? '✅ Yes' : '❌ No');
console.log('[ai-chat] 🔑 Translate Token loaded:', TRANSLATE_TOKEN ? '✅ Yes' : '❌ No');

// ============================================================
// LANGUAGE DETECTION HELPERS
// ============================================================

function containsKannada(text) {
    const kannadaRange = /[\u0C80-\u0CFF]/;
    return kannadaRange.test(text);
}

function detectLanguage(text) {
    if (!text || text.trim() === '') return 'en';
    if (containsKannada(text)) return 'kn';
    return 'en';
}

// ============================================================
// ✅ LLM-BASED TRANSLATION (MORE RELIABLE)
// ============================================================

async function translateWithLLM(text, sourceLang, targetLang, token) {
    return new Promise((resolve) => {
        if (!token || !text || text.trim() === '') {
            resolve(text);
            return;
        }

        if (sourceLang === targetLang) {
            resolve(text);
            return;
        }

        const languageMap = { 'en': 'English', 'kn': 'Kannada' };
        const sourceName = languageMap[sourceLang] || sourceLang;
        const targetName = languageMap[targetLang] || targetLang;

        // Clean the text - remove markdown formatting for cleaner translation
        let cleanText = text;
        // Remove markdown bold/italic
        cleanText = cleanText.replace(/\*\*/g, '');
        cleanText = cleanText.replace(/\*/g, '');
        // Remove extra spaces
        cleanText = cleanText.replace(/\s+/g, ' ').trim();

        const systemPrompt = `You are a professional translator. Translate the following text from ${sourceName} to ${targetName}.
        
IMPORTANT RULES:
1. Translate accurately and naturally
2. Preserve the meaning and tone
3. Return ONLY the translated text, nothing else
4. Do not add any explanations, notes, or markdown formatting
5. If the text is a question, translate it as a question
6. Keep the structure similar (bullet points, numbered lists if present)`;

        const userPrompt = `Translate this text from ${sourceName} to ${targetName}:

"${cleanText}"`;

        const payload = JSON.stringify({
            model: "crm-di-glm47b_30b_it",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.3,
            stream: false,
            chat_template_kwargs: {
                enable_thinking: false
            }
        });

        console.log(`[translateWithLLM] Translating from ${sourceName} to ${targetName}...`);

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

        const request = https.request(options, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    if (response.statusCode === 200) {
                        const parsed = JSON.parse(data);
                        let translated = parsed.choices?.[0]?.message?.content || 
                                        parsed.output?.text || 
                                        parsed.response || 
                                        text;
                        
                        // Clean up the response
                        translated = translated.replace(/^["']|["']$/g, '').trim();
                        
                        if (translated && translated.length > 0 && translated !== cleanText) {
                            console.log(`[translateWithLLM] ✅ Translation successful`);
                            resolve(translated);
                        } else {
                            console.warn('[translateWithLLM] Empty or same translation, using original');
                            resolve(text);
                        }
                    } else {
                        console.error('[translateWithLLM] API Error:', response.statusCode);
                        resolve(text);
                    }
                } catch (err) {
                    console.error('[translateWithLLM] Parse Error:', err);
                    resolve(text);
                }
            });
        });

        request.on('error', (err) => {
            console.error('[translateWithLLM] Request Error:', err);
            resolve(text);
        });

        request.write(payload);
        request.end();
    });
}

// ============================================================
// TRANSLATE FUNCTION (Uses LLM directly)
// ============================================================

async function translateText(text, sourceLang, targetLang, token) {
    // Always use LLM for translation (more reliable)
    return await translateWithLLM(text, sourceLang, targetLang, token);
}

// ============================================================
// NORMALIZE QUERY (Detect + Translate)
// ============================================================

async function normalizeQuery(userQuestion, token) {
    const detectedLang = detectLanguage(userQuestion);
    console.log('[normalizeQuery] Detected Language:', detectedLang);
    console.log('[normalizeQuery] Original Query:', userQuestion);
    
    let normalizedQuestion = userQuestion;
    let originalLanguage = detectedLang;
    
    // If input is Kannada, translate to English for processing
    if (detectedLang === 'kn') {
        console.log('[normalizeQuery] Translating Kannada to English...');
        try {
            normalizedQuestion = await translateText(userQuestion, 'kn', 'en', token);
            console.log('[normalizeQuery] Translated Query:', normalizedQuestion);
        } catch (err) {
            console.error('[normalizeQuery] Translation failed:', err);
        }
    }
    
    return {
        originalQuery: userQuestion,
        normalizedQuery: normalizedQuestion,
        originalLanguage: originalLanguage
    };
}

// ============================================================
// MAIN FUNCTION
// ============================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const userQuestion = data.question || data.message || data.user || '';

            console.log('[ai-chat] 📝 User Question:', userQuestion);

            if (!userQuestion || userQuestion.trim() === '') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: 'No question provided'
                }));
            }

            if (!LLM_TOKEN) {
                console.error('[ai-chat] ❌ No LLM_TOKEN found!');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: 'LLM_TOKEN not configured.'
                }));
            }

            // ✅ STEP 1: Detect Language & Normalize Query
            console.log('[ai-chat] Step 1: Language Detection...');
            const { originalQuery, normalizedQuery, originalLanguage } = await normalizeQuery(userQuestion, LLM_TOKEN);
            console.log('[ai-chat] Original Language:', originalLanguage);
            console.log('[ai-chat] Normalized Query:', normalizedQuery);

            // ✅ STEP 2: Classify intent using LLM (with normalized query)
            console.log('[ai-chat] Step 2: Classifying intent...');
            const intentResult = await callIntentClassifier(normalizedQuery, LLM_TOKEN);
            console.log('[ai-chat] Intent Result:', JSON.stringify(intentResult));

            if (!intentResult || !intentResult.intent) {
                const fallbackResponse = originalLanguage === 'kn' 
                    ? 'ಕ್ಷಮಿಸಿ, ನಾನು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಅಪರಾಧ ದಾಖಲೆಗಳು, FIRಗಳು, ಅಥವಾ ಅಪರಾಧ ಅಂಕಿಅಂಶಗಳ ಕುರಿತು ಕೇಳಿ.'
                    : "I'm not sure how to help with that. Please ask about criminal records, FIRs, or crime statistics.";
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: true,
                    intent: intentResult,
                    response: fallbackResponse,
                    raw_data: null,
                    data_count: 0,
                    language: originalLanguage
                }));
            }

            // ✅ STEP 3: Initialize Catalyst and search
            const app = catalyst.initialize(req);
            const zcql = app.zcql();

            // ✅ STEP 4: Search ALL tables
            console.log('[ai-chat] Step 3: Searching all tables...');
            
            let searchName = intentResult.accused_name || '';
            let queryResult = [];
            
            if (searchName) {
                queryResult = await searchAllTables(zcql, searchName);
            }
            
            console.log('[ai-chat] Query Result Count:', queryResult.length || 0);

            // ✅ STEP 5: Generate response with language support
            console.log('[ai-chat] Step 4: Generating response...');
            const finalResponse = await generateResponseWithLanguage(
                userQuestion, 
                queryResult, 
                LLM_TOKEN,
                originalLanguage
            );

            // ✅ STEP 6: Save conversation
            console.log('[ai-chat] Step 5: Saving conversation...');
            await saveConversationDirect(zcql, {
                question: userQuestion,
                response: finalResponse.response || 'No response generated',
                intent: intentResult,
                data_count: queryResult.length || 0,
                language: originalLanguage
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                intent: intentResult,
                response: finalResponse.response || 'No response generated',
                raw_data: queryResult,
                data_count: queryResult.length || 0,
                language: originalLanguage
            }));

        } catch (err) {
            console.error('[ai-chat] ❌ Error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: err.message || 'Internal server error'
            }));
        }
    });
};

// ============================================================
// HELPER: Call Intent Classifier
// ============================================================

function callIntentClassifier(userQuestion, token) {
    return new Promise((resolve, reject) => {
        if (!token) {
            reject(new Error('LLM_TOKEN is not available'));
            return;
        }

        const systemPrompt = `You are a precise JSON classifier for crime data queries. Always return valid JSON only.

Supported intents:
1. criminal_history - REQUIRED: accused_name
2. search_fir - Optional: fir_number, status, location, crime_type
3. repeat_offenders
4. crime_hotspots - Optional: location
5. search_accused - Optional: accused_name
6. monthly_crime_trends
7. fir_accused - REQUIRED: fir_number
8. risk_profile - REQUIRED: accused_name

Examples:
User: "What's the criminal history of Ravi Kumar?"
{"intent":"criminal_history","accused_name":"Ravi Kumar"}

User: "Show all FIRs in Bangalore"
{"intent":"search_fir","location":"Bangalore"}

User: "List repeat offenders"
{"intent":"repeat_offenders"}

Return ONLY JSON. No markdown. No backticks.`;

        const payload = JSON.stringify({
            model: "crm-di-glm47b_30b_it",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `User Query: "${userQuestion}"\n\nReturn JSON only:`
                }
            ],
            max_tokens: 300,
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

        console.log('[ai-chat] 📡 Calling LLM API...');

        const request = https.request(options, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    console.log('[ai-chat] 📡 LLM Response Status:', response.statusCode);

                    if (response.statusCode === 401) {
                        reject(new Error('Authentication failed. Please regenerate your LLM_TOKEN.'));
                        return;
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`Intent classifier returned ${response.statusCode}`));
                        return;
                    }

                    const parsed = JSON.parse(data);
                    let rawText = '';

                    if (parsed.choices && parsed.choices.length > 0) {
                        rawText = parsed.choices[0].message?.content || '';
                    } else if (parsed.output?.text) {
                        rawText = parsed.output.text;
                    } else if (parsed.response) {
                        rawText = parsed.response;
                    }

                    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const intentJson = JSON.parse(jsonMatch[0]);
                        resolve(intentJson);
                    } else {
                        resolve({ intent: 'search_fir' });
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

// ============================================================
// HELPER: Search ALL Tables
// ============================================================

async function searchAllTables(zcql, searchName) {
    if (!searchName || searchName.trim() === '') {
        console.log('[searchAllTables] No search name provided');
        return [];
    }

    console.log('[searchAllTables] Searching for:', searchName);
    
    const allResults = [];
    const nameParts = searchName.trim().split(' ');
    const variations = [
        searchName,
        searchName.toLowerCase(),
        searchName.toUpperCase(),
        nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    ];
    
    const uniqueVariations = [...new Set(variations)];

    // TABLE 1: ACCUSED
    console.log('[searchAllTables] 🔍 Searching in ACCUSED table...');
    let accusedResults = [];
    
    for (const variation of uniqueVariations) {
        if (accusedResults.length > 0) break;
        try {
            const query = `
                SELECT 
                    ROWID, 
                    full_name, 
                    gender, 
                    occupation, 
                    address,
                    risk_score, 
                    is_repeat_offender
                FROM accused
                WHERE full_name = '${safeString(variation)}'
                OR full_name LIKE '%${safeString(variation)}%'
            `;
            const result = await zcql.executeZCQLQuery(query);
            if (result && result.length > 0) {
                accusedResults = result;
                console.log('[searchAllTables] ✅ Found in ACCUSED:', result.length, 'results');
                break;
            }
        } catch (err) {
            console.log('[searchAllTables] ACCUSED search failed:', err.message);
        }
    }

    for (const row of accusedResults) {
        const accused = row.accused || row;
        allResults.push({
            table: 'accused',
            type: 'Accused Person',
            name: accused.full_name,
            gender: accused.gender || 'Unknown',
            occupation: accused.occupation || 'Unknown',
            risk_score: accused.risk_score || 0,
            is_repeat_offender: accused.is_repeat_offender || false,
            rowid: accused.ROWID,
            details: `Found in accused records. Risk score: ${accused.risk_score || 0}`
        });

        try {
            const firQuery = `
                SELECT 
                    f.fir_number,
                    f.status,
                    f.date_registered,
                    c.crime_name,
                    fa.role_in_crime
                FROM fir_accused fa
                JOIN fir f ON f.ROWID = fa.fir_rowid
                LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
                WHERE fa.accused_rowid = '${accused.ROWID}'
                ORDER BY f.date_registered DESC
            `;
            const firResults = await zcql.executeZCQLQuery(firQuery);
            
            if (firResults && firResults.length > 0) {
                for (const firRow of firResults) {
                    allResults.push({
                        table: 'fir_accused',
                        type: 'FIR Case',
                        name: accused.full_name,
                        fir_number: firRow.f?.fir_number || 'Unknown',
                        status: firRow.f?.status || 'Unknown',
                        date_registered: firRow.f?.date_registered || 'Unknown',
                        crime_type: firRow.c?.crime_name || 'Unknown',
                        role_in_crime: firRow.fa?.role_in_crime || 'Unknown',
                        details: `Involved in FIR ${firRow.f?.fir_number || 'Unknown'}`
                    });
                }
            }
        } catch (err) {
            console.log('[searchAllTables] FIR fetch failed:', err.message);
        }
    }

    // TABLE 2: VICTIM
    if (allResults.length === 0) {
        console.log('[searchAllTables] 🔍 Searching in VICTIM table...');
        let victimResults = [];
        
        for (const variation of uniqueVariations) {
            if (victimResults.length > 0) break;
            try {
                const query = `
                    SELECT 
                        ROWID, 
                        full_name, 
                        gender, 
                        occupation, 
                        address,
                        phone_number
                    FROM victim
                    WHERE full_name = '${safeString(variation)}'
                    OR full_name LIKE '%${safeString(variation)}%'
                `;
                const result = await zcql.executeZCQLQuery(query);
                if (result && result.length > 0) {
                    victimResults = result;
                    console.log('[searchAllTables] ✅ Found in VICTIM:', result.length, 'results');
                    break;
                }
            } catch (err) {
                console.log('[searchAllTables] VICTIM search failed:', err.message);
            }
        }

        for (const row of victimResults) {
            const victim = row.victim || row;
            allResults.push({
                table: 'victim',
                type: 'Victim',
                name: victim.full_name,
                gender: victim.gender || 'Unknown',
                occupation: victim.occupation || 'Unknown',
                address: victim.address || 'Unknown',
                phone_number: victim.phone_number || 'Unknown',
                rowid: victim.ROWID,
                details: `Found as victim in crime records`
            });
        }
    }

    // TABLE 3: FIR
    if (allResults.length === 0) {
        console.log('[searchAllTables] 🔍 Searching in FIR table...');
        let firResults = [];
        
        for (const variation of uniqueVariations) {
            if (firResults.length > 0) break;
            try {
                const query = `
                    SELECT 
                        ROWID, 
                        fir_number, 
                        status, 
                        date_registered, 
                        investigating_officer,
                        description
                    FROM fir
                    WHERE investigating_officer = '${safeString(variation)}'
                    OR investigating_officer LIKE '%${safeString(variation)}%'
                    OR description LIKE '%${safeString(variation)}%'
                `;
                const result = await zcql.executeZCQLQuery(query);
                if (result && result.length > 0) {
                    firResults = result;
                    console.log('[searchAllTables] ✅ Found in FIR:', result.length, 'results');
                    break;
                }
            } catch (err) {
                console.log('[searchAllTables] FIR search failed:', err.message);
            }
        }

        for (const row of firResults) {
            const fir = row.fir || row;
            allResults.push({
                table: 'fir',
                type: 'FIR Record',
                fir_number: fir.fir_number || 'Unknown',
                status: fir.status || 'Unknown',
                date_registered: fir.date_registered || 'Unknown',
                investigating_officer: fir.investigating_officer || 'Unknown',
                description: fir.description || 'Unknown',
                rowid: fir.ROWID,
                details: `Found as investigating officer or mentioned in FIR ${fir.fir_number || 'Unknown'}`
            });
        }
    }

    // TABLE 4: USERS
    if (allResults.length === 0) {
        console.log('[searchAllTables] 🔍 Searching in USERS table...');
        let userResults = [];
        
        for (const variation of uniqueVariations) {
            if (userResults.length > 0) break;
            try {
                const query = `
                    SELECT 
                        ROWID, 
                        full_name, 
                        email, 
                        phone_number
                    FROM users
                    WHERE full_name = '${safeString(variation)}'
                    OR full_name LIKE '%${safeString(variation)}%'
                    OR email LIKE '%${safeString(variation)}%'
                `;
                const result = await zcql.executeZCQLQuery(query);
                if (result && result.length > 0) {
                    userResults = result;
                    console.log('[searchAllTables] ✅ Found in USERS:', result.length, 'results');
                    break;
                }
            } catch (err) {
                console.log('[searchAllTables] USERS search failed:', err.message);
            }
        }

        for (const row of userResults) {
            const user = row.users || row;
            allResults.push({
                table: 'users',
                type: 'Police Officer/User',
                name: user.full_name,
                email: user.email || 'Unknown',
                phone_number: user.phone_number || 'Unknown',
                rowid: user.ROWID,
                details: `Found in system users/records`
            });
        }
    }

    console.log('[searchAllTables] Total results from all tables:', allResults.length);
    return allResults;
}

// ============================================================
// HELPER: Generate Response with Language Support
// ============================================================

async function generateResponseWithLanguage(userQuestion, queryResult, llmToken, originalLanguage) {
    return new Promise(async (resolve) => {
        if (!llmToken) {
            resolve({ response: "Authentication failed. Please check your API token." });
            return;
        }

        let formattedData = '';
        if (queryResult && queryResult.length > 0) {
            formattedData = JSON.stringify(queryResult, null, 2);
        } else {
            formattedData = 'No data found.';
        }

        const systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP).
Convert raw crime data into clear, professional, user-friendly responses.

Guidelines:
1. Be professional and factual
2. Format data in a readable way
3. If the user asks for "history" or "record", provide a chronological summary
4. If no data is found, politely say so
5. Use bullet points for cases
6. Highlight important details (dates, FIR numbers, status)
7. If the name has a slight spelling variation, mention the correct spelling found
8. Group results by table/source (Accused, Victim, FIR, etc.)
9. Keep the response clear and structured.`;

        const userPrompt = `User Question: "${userQuestion}"

Raw Data from Database (from all tables):
${formattedData}

Respond in a clear, professional way. If data exists, present it in a readable format with proper grouping.`;

        const payload = JSON.stringify({
            model: "crm-di-glm47b_30b_it",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.5,
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
                'Authorization': `Zoho-oauthtoken ${llmToken}`,
                'CATALYST-ORG': '60073436832',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const request = https.request(options, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', async () => {
                try {
                    if (response.statusCode === 401) {
                        resolve({ response: "Authentication failed. Please check your API token." });
                        return;
                    }

                    if (response.statusCode !== 200) {
                        resolve({ response: "Unable to generate response. Please try again." });
                        return;
                    }

                    const parsed = JSON.parse(data);
                    let responseText = '';

                    if (parsed.choices && parsed.choices.length > 0) {
                        responseText = parsed.choices[0].message?.content || '';
                    } else if (parsed.output?.text) {
                        responseText = parsed.output.text;
                    } else if (parsed.response) {
                        responseText = parsed.response;
                    }

                    if (!responseText || responseText.trim() === '') {
                        responseText = "I found some data but couldn't format it.";
                    }

                    // ✅ If original input was Kannada, translate response to Kannada
                    if (originalLanguage === 'kn') {
                        console.log('[generateResponseWithLanguage] Translating response to Kannada using LLM...');
                        try {
                            const translatedResponse = await translateWithLLM(responseText, 'en', 'kn', llmToken);
                            responseText = translatedResponse;
                            console.log('[generateResponseWithLanguage] ✅ Translated response successfully');
                        } catch (err) {
                            console.error('[generateResponseWithLanguage] Translation failed:', err);
                        }
                    }

                    resolve({ response: responseText });
                } catch (err) {
                    console.error('[generateResponseWithLanguage] Error:', err);
                    resolve({ response: "Error processing response. Please try again." });
                }
            });
        });

        request.on('error', (err) => {
            console.error('[generateResponseWithLanguage] Request error:', err);
            resolve({ response: "Unable to connect to AI service. Please try again." });
        });

        request.write(payload);
        request.end();
    });
}

// ============================================================
// HELPER: Safe String
// ============================================================

function safeString(value) {
    if (!value) return '';
    return String(value).replace(/'/g, "''");
}

// ============================================================
// HELPER: Save Conversation
// ============================================================

function saveConversationDirect(zcql, data) {
    return new Promise((resolve) => {
        try {
            const user_rowid = '47024000000029023';
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const conversation = JSON.stringify([
                { role: 'user', content: data.question },
                { role: 'assistant', content: data.response }
            ]);

            const query = `
                INSERT INTO conversation_history (
                    user_rowid, 
                    conversation_title,
                    conversation,
                    question,
                    response,
                    language,
                    created_at
                ) VALUES (
                    '${user_rowid}',
                    '${safeString(data.question.substring(0, 50))}',
                    '${safeString(conversation)}',
                    '${safeString(data.question)}',
                    '${safeString(data.response)}',
                    '${data.language || 'en'}',
                    '${timestamp}'
                )
            `;

            zcql.executeZCQLQuery(query).then(() => {
                console.log('[ai-chat] ✅ Conversation saved successfully');
                resolve();
            }).catch((err) => {
                console.error('[ai-chat] ❌ Failed to save conversation:', err);
                resolve();
            });
        } catch (err) {
            console.error('[ai-chat] ❌ Save conversation error:', err);
            resolve();
        }
    });
}