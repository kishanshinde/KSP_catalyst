'use strict';

const catalyst = require('zcatalyst-sdk-node');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// LOAD .env FROM CURRENT DIRECTORY
// ============================================================
function loadLocalEnv() {
    const envPath = path.join(__dirname, '.env');
    console.log('[ai-chat] Looking for .env at:', envPath);
    
    if (!fs.existsSync(envPath)) {
        console.warn('[ai-chat] ⚠️ .env file not found at:', envPath);
        return;
    }
    
    const envFile = fs.readFileSync(envPath, 'utf8');
    console.log('[ai-chat] ✅ .env file loaded');
    
    envFile.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        
        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) return;
        
        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

// Load .env
loadLocalEnv();

// ============================================================
// GET TOKENS FROM .env ONLY
// ============================================================
const LLM_TOKEN = process.env.LLM_ACCESS_TOKEN;
const TRANSLATE_TOKEN = process.env.TRANSLATE_ACCESS_TOKEN;

console.log('[ai-chat] 🔑 LLM Token loaded:', LLM_TOKEN ? '✅ Yes' : '❌ No');
console.log('[ai-chat] 🔑 LLM Token starts with:', LLM_TOKEN?.substring(0, 15) + '...');
console.log('[ai-chat] 🔑 Translate Token loaded:', TRANSLATE_TOKEN ? '✅ Yes' : '❌ No');
console.log('[ai-chat] 🔑 Translate Token starts with:', TRANSLATE_TOKEN?.substring(0, 15) + '...');

// Validate tokens
if (!LLM_TOKEN) {
    console.error('[ai-chat] ❌ LLM_ACCESS_TOKEN is missing in .env');
}
if (!TRANSLATE_TOKEN) {
    console.error('[ai-chat] ❌ TRANSLATE_ACCESS_TOKEN is missing in .env');
}

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