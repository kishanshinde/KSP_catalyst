// D:\Project\KSP\KSP_catalyst\functions\ai-chat\index.js
'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { resolveUserRow } = require('./resolveUser');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// AUTO-REFRESH TOKEN MANAGER
// Tokens are refreshed automatically via Zoho OAuth refresh_token.
// Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
// in Catalyst Console → App Settings → Environments.
// Falls back to LLM_ACCESS_TOKEN in .env for local dev.
// ============================================================
const { getLLMToken, getTranslateToken } = require('./shared/tokenManager');

// ============================================================
// LOAD .env FROM CURRENT DIRECTORY (local dev fallback)
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
        
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

// Load .env (populates LLM_ACCESS_TOKEN etc. as local dev fallback)
loadLocalEnv();

// Log token strategy at startup
if (process.env.ZOHO_REFRESH_TOKEN) {
    console.log('[ai-chat] 🔑 Token strategy: AUTO-REFRESH via ZOHO_REFRESH_TOKEN ✅');
} else if (process.env.LLM_ACCESS_TOKEN) {
    console.log('[ai-chat] 🔑 Token strategy: STATIC .env token (local dev fallback) ⚠️ — token will expire!');
} else {
    console.error('[ai-chat] ❌ No token source found! Set ZOHO_REFRESH_TOKEN in Catalyst Console or LLM_ACCESS_TOKEN in .env');
}

// ============================================================
// CONTEXT WINDOW MANAGER - INTEGRATED
// ============================================================

// ============================================================
// TOKEN COUNTER (Accurate estimation for GLM-4.7)
// ============================================================

function countTokens(text) {
    if (!text) return 0;
    const kannadaChars = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
    const englishChars = text.length - kannadaChars;
    return Math.ceil((englishChars / 4) + (kannadaChars / 2) * 1.05);
}

function countMessages(messages) {
    let total = 0;
    for (const msg of messages) {
        total += countTokens(msg.role || '');
        total += countTokens(msg.content || '');
        total += 4;
    }
    return total + 3;
}

// ============================================================
// MESSAGE PRIORITIZATION
// ============================================================

function prioritizeMessages(messages) {
    const prioritized = messages.map((msg, index) => {
        const total = messages.length;
        const recency = total > 0 ? index / total : 0;
        
        let priority = 0;
        
        if (msg.role === 'system') {
            priority = 100;
        } else if (msg.role === 'user' && recency > 0.7) {
            priority = 80;
        } else if (msg.role === 'assistant' && recency > 0.7) {
            priority = 70;
        } else if (msg.role === 'user' && recency > 0.4) {
            priority = 50;
        } else if (msg.role === 'assistant') {
            priority = 30;
        } else {
            priority = 10;
        }
        
        return {
            ...msg,
            priority,
            recency,
            tokenCount: countTokens(msg.content || '')
        };
    });
    
    return prioritized.sort((a, b) => b.priority - a.priority);
}

// ============================================================
// SLIDING WINDOW CONTEXT BUILDER
// ============================================================

function buildContextWithSlidingWindow({
    systemPrompt,
    conversationHistory = [],
    currentQuestion,
    databaseResults = null,
    intent = 'general',
    maxTokens = 8000,
    reserveForResponse = 2000,
    maxHistoryExchanges = 2
}) {
    const systemTokens = countTokens(systemPrompt);
    const questionTokens = countTokens(currentQuestion);
    const formattedData = databaseResults && databaseResults.length > 0 ? formatDataForLLM(databaseResults, intent) : '';
    const dataTokens = formattedData ? countTokens(formattedData) : 0;
    const overhead = 100;
    
    const availableForHistory = maxTokens - reserveForResponse - systemTokens - questionTokens - dataTokens - overhead;
    
    console.log(`[ContextManager] Available for history: ${availableForHistory} tokens`);
    
    // ✅ Filter out invalid messages
    const validHistory = conversationHistory.filter(msg => 
        msg && typeof msg === 'object' && msg.role && msg.content
    );
    
    // ✅ Keep only last N messages (maxHistoryExchanges * 2)
    const maxMessages = maxHistoryExchanges * 2;
    let recentMessages = validHistory.slice(-maxMessages);
    
    console.log(`[ContextManager] Keeping ${recentMessages.length} recent messages (out of ${conversationHistory.length})`);
    
    const prioritized = prioritizeMessages(recentMessages);
    
    let selectedMessages = [];
    let usedTokens = 0;
    let skipped = 0;
    
    for (const msg of prioritized) {
        if (usedTokens + msg.tokenCount <= availableForHistory) {
            selectedMessages.push({
                role: msg.role,
                content: msg.content
            });
            usedTokens += msg.tokenCount;
        } else {
            skipped++;
        }
    }
    
    // Ensure chronological order
    selectedMessages = selectedMessages.sort((a, b) => {
        const idxA = conversationHistory.findIndex(m => m.content === a.content && m.role === a.role);
        const idxB = conversationHistory.findIndex(m => m.content === b.content && m.role === b.role);
        return idxA - idxB;
    });
    
    console.log(`[ContextManager] Selected ${selectedMessages.length} messages, skipped ${skipped}, used ${usedTokens} tokens`);
    
    const messages = [
        { role: "system", content: systemPrompt }
    ];
    
    for (const msg of selectedMessages) {
        messages.push(msg);
    }
    
    if (formattedData) {
        messages.push({
            role: "user",
            content: `DATABASE RECORDS:\n${formattedData}\n---\nUser Question: ${currentQuestion}\n\nFormat the above records into a response.`
        });
    } else {
        messages.push({ role: "user", content: currentQuestion });
    }
    
    const totalTokens = countMessages(messages);
    console.log(`[ContextManager] Final context: ${messages.length} messages, ${totalTokens} tokens`);
    
    return {
        messages,
        totalTokens,
        usedHistoryMessages: selectedMessages.length,
        skippedMessages: skipped,
        wasCompressed: skipped > 0
    };
}

// ============================================================
// RESULT SUMMARIZER
// ============================================================

function summarizeResults(results) {
    if (!results || results.length === 0) return 'No data found.';
    
    const items = results.slice(0, 20);
    let summary = `Found ${results.length} record(s).\n`;
    
    for (const item of items) {
        const fields = [];
        if (item.name) fields.push(`Name: ${item.name}`);
        if (item.gender && item.gender !== 'Unknown') fields.push(`Gender: ${item.gender}`);
        if (item.dob && item.dob !== 'Unknown') fields.push(`DOB: ${item.dob}`);
        if (item.occupation && item.occupation !== 'Unknown') fields.push(`Occupation: ${item.occupation}`);
        if (item.address && item.address !== 'Unknown') fields.push(`Address: ${item.address}`);
        if (item.phone_number && item.phone_number !== 'Unknown') fields.push(`Phone: ${item.phone_number}`);
        if (item.risk_score) fields.push(`Risk Score: ${item.risk_score}`);
        if (item.is_repeat_offender) fields.push(`Repeat Offender: YES`);
        if (item.fir_number) fields.push(`FIR: ${item.fir_number}`);
        if (item.crime_type && item.crime_type !== 'Unknown') fields.push(`Crime: ${item.crime_type}`);
        if (item.status && item.status !== 'Unknown') fields.push(`Status: ${item.status}`);
        if (item.date_registered) fields.push(`Date: ${item.date_registered}`);
        if (item.role_in_crime && item.role_in_crime !== 'Unknown') fields.push(`Role: ${item.role_in_crime}`);
        if (item.city && item.city !== 'Unknown') fields.push(`City: ${item.city}`);
        if (item.district && item.district !== 'Unknown') fields.push(`District: ${item.district}`);
        if (item.description && item.description !== 'Unknown') fields.push(`Description: ${item.description}`);
        if (item.priority && item.priority !== 'Unknown') fields.push(`Priority: ${item.priority}`);
        if (item.victims && item.victims.length > 0) {
            const victimNames = item.victims.map(v => v.name).join(', ');
            fields.push(`Victims: ${victimNames}`);
        }
        if (item.investigation) {
            const inv = item.investigation;
            fields.push(`Investigation: ${inv.status || 'Unknown'} (Officer: ${inv.officer_name || 'Unknown'})`);
            if (inv.start_date) fields.push(`Investigation Start: ${inv.start_date}`);
        }
        if (item.investigating_officer && item.investigating_officer !== 'Unknown') fields.push(`IO: ${item.investigating_officer}`);
        if (item.table) fields.push(`Source: ${item.table}`);
        
        if (fields.length > 0) {
            summary += `• ${fields.join(' | ')}\n`;
        } else {
            summary += `• ${JSON.stringify(item).substring(0, 150)}...\n`;
        }
    }
    
    if (results.length > 20) {
        summary += `\n... and ${results.length - 20} more records.`;
    }
    
    return summary;
}

// ============================================================
// FORMAT DATA FOR LLM (Clean structured text, no JSON noise)
// ============================================================

function formatDataForLLM(results, intent) {
    if (!results || results.length === 0) {
        return 'NO DATA FOUND. The database has no records matching this query.';
    }

    const fw = (val, fallback) => {
        if (val === null || val === undefined || val === 'Unknown' || val === '') return fallback || 'Not Available';
        return String(val);
    };

    let output = `DATABASE RECORDS FOUND: ${results.length} record(s)\n\n`;

    // Group by person name for profile intents
    const profileIntents = ['criminal_history', 'search_accused', 'risk_profile'];
    const isProfile = profileIntents.includes(intent);

    if (isProfile) {
        // Collect accused record
        const accused = results.find(r => r.table === 'accused');
        if (accused) {
            output += `=== ACCUSED PERSON PROFILE ===\n`;
            output += `Name: ${fw(accused.name, 'Unknown')}\n`;
            output += `Gender: ${fw(accused.gender)}\n`;
            output += `Date of Birth: ${fw(accused.dob)}\n`;
            output += `Occupation: ${fw(accused.occupation)}\n`;
            output += `Address: ${fw(accused.address)}\n`;
            output += `Phone: ${fw(accused.phone_number)}\n`;
            output += `Risk Score: ${fw(accused.risk_score, '0')}\n`;
            output += `Repeat Offender: ${accused.is_repeat_offender ? 'YES' : 'NO'}\n`;
            output += `\n`;
        }

        // Group FIR cases
        const firCases = results.filter(r => r.table === 'fir_accused');
        if (firCases.length > 0) {
            output += `=== CASE HISTORY (${firCases.length} case(s)) ===\n\n`;
            for (let i = 0; i < firCases.length; i++) {
                const fir = firCases[i];
                output += `--- Case ${i + 1} ---\n`;
                output += `FIR Number: ${fw(fir.fir_number)}\n`;
                output += `Crime Type: ${fw(fir.crime_type)}\n`;
                output += `Date Registered: ${fw(fir.date_registered)}\n`;
                output += `Status: ${fw(fir.status)}\n`;
                output += `Priority: ${fw(fir.priority)}\n`;
                output += `Description: ${fw(fir.description)}\n`;
                output += `Role in Crime: ${fw(fir.role_in_crime)}\n`;
                output += `City: ${fw(fir.city)}\n`;
                output += `District: ${fw(fir.district)}\n`;
                if (fir.victims && fir.victims.length > 0) {
                    output += `Victims:\n`;
                    for (const v of fir.victims) {
                        output += `  - ${fw(v.name)} (${fw(v.gender)}, ${fw(v.occupation)})\n`;
                    }
                }
                if (fir.investigation) {
                    output += `Investigation Status: ${fw(fir.investigation.status)}\n`;
                    output += `Investigating Officer: ${fw(fir.investigation.officer_name)}\n`;
                    output += `Investigation Start: ${fw(fir.investigation.start_date)}\n`;
                    if (fir.investigation.end_date) {
                        output += `Investigation End: ${fw(fir.investigation.end_date)}\n`;
                    }
                }
                output += `\n`;
            }
        }
    } else {
        // Non-profile: list all records generically
        for (let i = 0; i < Math.min(results.length, 20); i++) {
            const r = results[i];
            output += `--- Record ${i + 1} (${fw(r.type, r.table)}) ---\n`;
            if (r.name) output += `Name: ${fw(r.name)}\n`;
            if (r.fir_number) output += `FIR Number: ${fw(r.fir_number)}\n`;
            if (r.crime_type) output += `Crime Type: ${fw(r.crime_type)}\n`;
            if (r.status) output += `Status: ${fw(r.status)}\n`;
            if (r.date_registered) output += `Date: ${fw(r.date_registered)}\n`;
            if (r.gender && r.gender !== 'Unknown') output += `Gender: ${fw(r.gender)}\n`;
            if (r.occupation && r.occupation !== 'Unknown') output += `Occupation: ${fw(r.occupation)}\n`;
            if (r.address && r.address !== 'Unknown') output += `Address: ${fw(r.address)}\n`;
            if (r.phone_number && r.phone_number !== 'Unknown') output += `Phone: ${fw(r.phone_number)}\n`;
            if (r.risk_score) output += `Risk Score: ${fw(r.risk_score)}\n`;
            if (r.role_in_crime) output += `Role: ${fw(r.role_in_crime)}\n`;
            if (r.city && r.city !== 'Unknown') output += `City: ${fw(r.city)}\n`;
            if (r.district && r.district !== 'Unknown') output += `District: ${fw(r.district)}\n`;
            if (r.description && r.description !== 'Unknown') output += `Description: ${fw(r.description)}\n`;
            if (r.victims && r.victims.length > 0) {
                output += `Victims: ${r.victims.map(v => fw(v.name)).join(', ')}\n`;
            }
            if (r.investigation) {
                output += `Investigation: ${fw(r.investigation.status)} (Officer: ${fw(r.investigation.officer_name)})\n`;
            }
            output += `\n`;
        }
    }

    return output;
}

// ============================================================
// CONTEXT-AWARE INTENT RESOLVER
// ============================================================

function resolveContextAwareIntent(userQuestion, conversationHistory) {
    let lastEntity = null;
    let lastEntityType = null;
    
    // Scan from newest to oldest
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === 'assistant') {
            // Pattern 1: "Name: Xxx Yyy" (explicit label)
            const nameLabel = msg.content.match(/(?:Name|name):\s*([A-Za-z][A-Za-z\s]{1,40})/i);
            if (nameLabel) {
                lastEntity = nameLabel[1].trim();
                lastEntityType = 'name';
                break;
            }
            // Pattern 2: "for the name Xxx Yyy" or "about Xxx Yyy"
            const forName = msg.content.match(/(?:for|about|of|on)\s+(?:the\s+)?(?:name\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
            if (forName) {
                lastEntity = forName[1].trim();
                lastEntityType = 'name';
                break;
            }
            // Pattern 3: bold markdown **Xxx Yyy**
            const boldName = msg.content.match(/\*\*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\*\*/);
            if (boldName) {
                lastEntity = boldName[1].trim();
                lastEntityType = 'name';
                break;
            }
            // Pattern 4: "accused Xxx Yyy" / "person Xxx Yyy" / "suspect Xxx Yyy"
            const roleName = msg.content.match(/(?:accused|person|suspect|individual|offender)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i);
            if (roleName) {
                lastEntity = roleName[1].trim();
                lastEntityType = 'name';
                break;
            }
            // Pattern 5: FIR number
            const firMatch = msg.content.match(/FIR[-_\s]?(\d{4}[-_\s]?\d+)/i);
            if (firMatch) {
                lastEntity = firMatch[0];
                lastEntityType = 'fir';
                break;
            }
        }
    }
    
    const pronounPatterns = [
        /\b(?:his|her|he|she|their|them|they)\b/i,
        /\bthe (?:accused|person|case|fir)\b/i,
        /\bthat (?:case|fir|person)\b/i
    ];
    
    let isReferencingContext = false;
    for (const pattern of pronounPatterns) {
        if (pattern.test(userQuestion)) {
            isReferencingContext = true;
            break;
        }
    }
    
    let resolvedQuery = userQuestion;
    if (isReferencingContext && lastEntity) {
        resolvedQuery = userQuestion
            .replace(/\bhis\b/gi, lastEntity)
            .replace(/\bher\b/gi, lastEntity)
            .replace(/\bhe\b/gi, lastEntity)
            .replace(/\bshe\b/gi, lastEntity)
            .replace(/\btheir\b/gi, lastEntity)
            .replace(/\bthem\b/gi, lastEntity)
            .replace(/\bthe accused\b/gi, lastEntity)
            .replace(/\bthe person\b/gi, lastEntity)
            .replace(/\bthe case\b/gi, lastEntity)
            .replace(/\bthe fir\b/gi, lastEntity);
    }
    
    return {
        lastEntity,
        lastEntityType,
        isReferencingContext,
        resolvedQuery
    };
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
// LLM-BASED TRANSLATION WITH RETRY LOGIC
// ============================================================

async function translateWithLLM(text, sourceLang, targetLang, token, retryCount = 0) {
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

        let cleanText = text;
        cleanText = cleanText.replace(/\*\*/g, '');
        cleanText = cleanText.replace(/\*/g, '');
        cleanText = cleanText.replace(/\s+/g, ' ').trim();

        if (cleanText.length < 2) {
            resolve(text);
            return;
        }

        const systemPrompt = `You are a professional translator. Translate the following text from ${sourceName} to ${targetName}.
        
IMPORTANT RULES:
1. Translate accurately and naturally
2. Preserve the meaning and tone
3. Return ONLY the translated text, nothing else
4. Do not add any explanations, notes, or markdown formatting
5. If the text is a question, translate it as a question
6. Keep the structure similar (bullet points, numbered lists if present)
7. Return the translation in ${targetName} script only`;

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

        console.log(`[translateWithLLM] Attempt ${retryCount + 1}: Translating from ${sourceName} to ${targetName}...`);

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
                        
                        translated = translated.replace(/^["']|["']$/g, '').trim();
                        
                        const isTranslationSuccessful = translated && 
                                                        translated.length > 0 && 
                                                        translated !== cleanText &&
                                                        translated !== text;
                        
                        if (isTranslationSuccessful) {
                            console.log(`[translateWithLLM] ✅ Translation successful`);
                            resolve(translated);
                        } else {
                            console.warn(`[translateWithLLM] ⚠️ Translation returned same text or empty`);
                            
                            if (retryCount < 2) {
                                console.log(`[translateWithLLM] 🔄 Retrying translation (attempt ${retryCount + 2})...`);
                                setTimeout(() => {
                                    translateWithLLM(text, sourceLang, targetLang, token, retryCount + 1)
                                        .then(resolve);
                                }, 500);
                            } else {
                                console.error(`[translateWithLLM] ❌ Translation failed after 3 attempts`);
                                resolve(text);
                            }
                        }
                    } else {
                        console.error(`[translateWithLLM] API Error: ${response.statusCode}`);
                        
                        if (retryCount < 2) {
                            console.log(`[translateWithLLM] 🔄 Retrying translation (attempt ${retryCount + 2})...`);
                            setTimeout(() => {
                                translateWithLLM(text, sourceLang, targetLang, token, retryCount + 1)
                                    .then(resolve);
                            }, 500);
                        } else {
                            console.error(`[translateWithLLM] ❌ Translation failed after 3 attempts`);
                            resolve(text);
                        }
                    }
                } catch (err) {
                    console.error('[translateWithLLM] Parse Error:', err.message);
                    
                    if (retryCount < 2) {
                        console.log(`[translateWithLLM] 🔄 Retrying translation (attempt ${retryCount + 2})...`);
                        setTimeout(() => {
                            translateWithLLM(text, sourceLang, targetLang, token, retryCount + 1)
                                .then(resolve);
                        }, 500);
                    } else {
                        resolve(text);
                    }
                }
            });
        });

        request.on('error', (err) => {
            console.error('[translateWithLLM] Request Error:', err.message);
            
            if (retryCount < 2) {
                console.log(`[translateWithLLM] 🔄 Retrying translation (attempt ${retryCount + 2})...`);
                setTimeout(() => {
                    translateWithLLM(text, sourceLang, targetLang, token, retryCount + 1)
                        .then(resolve);
                }, 500);
            } else {
                resolve(text);
            }
        });

        request.write(payload);
        request.end();
    });
}

// ============================================================
// TRANSLATE FUNCTION
// ============================================================

async function translateText(text, sourceLang, targetLang, token) {
    return await translateWithLLM(text, sourceLang, targetLang, token, 0);
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
// ✅ FIXED: FETCH CONVERSATION HISTORY (Handles corrupted JSON)
// ============================================================

async function fetchConversationHistory(zcql, conversationId) {
    if (!conversationId) return [];
    
    try {
        const query = `SELECT conversation FROM conversation_history WHERE ROWID = '${safeString(conversationId)}'`;
        const result = await zcql.executeZCQLQuery(query);
        
        if (result && result.length > 0) {
            const row = result[0].conversation_history || result[0];
            if (row.conversation) {
                try {
                    const parsed = JSON.parse(row.conversation);
                    const messages = Array.isArray(parsed) ? parsed : (parsed.messages || []);
                    // ✅ Only keep last 6 messages (3 exchanges) to avoid corruption
                    const validMessages = messages.filter(msg => 
                        msg && typeof msg === 'object' && msg.role && msg.content
                    );
                    console.log(`[fetchConversationHistory] Loaded ${validMessages.length} valid messages`);
                    return validMessages.slice(-6);
                } catch (parseErr) {
                    console.error('[fetchConversationHistory] ❌ Corrupted JSON detected. Returning empty history.');
                    console.error('[fetchConversationHistory] Error:', parseErr.message);
                    // ✅ Try to fix the corrupted conversation
                    await fixCorruptedConversation(zcql, conversationId);
                    return [];
                }
            }
        }
    } catch (err) {
        console.error('[fetchConversationHistory] Error:', err.message);
    }
    
    return [];
}

// ============================================================
// ✅ NEW: Fix corrupted conversation
// ============================================================

async function fixCorruptedConversation(zcql, conversationId) {
    try {
        const query = `SELECT conversation FROM conversation_history WHERE ROWID = '${safeString(conversationId)}'`;
        const result = await zcql.executeZCQLQuery(query);
        
        if (result && result.length > 0) {
            const raw = result[0].conversation_history?.conversation || '';
            
            // Try to extract valid messages from corrupted JSON
            const validMessages = extractValidMessages(raw);
            
            if (validMessages.length > 0) {
                const fixedJson = JSON.stringify(validMessages);
                const updateQuery = `
                    UPDATE conversation_history 
                    SET conversation = '${safeString(fixedJson)}' 
                    WHERE ROWID = '${safeString(conversationId)}'
                `;
                await zcql.executeZCQLQuery(updateQuery);
                console.log('[fixCorruptedConversation] ✅ Fixed corrupted conversation');
            } else {
                // If can't fix, clear the conversation
                const updateQuery = `
                    UPDATE conversation_history 
                    SET conversation = '[]' 
                    WHERE ROWID = '${safeString(conversationId)}'
                `;
                await zcql.executeZCQLQuery(updateQuery);
                console.log('[fixCorruptedConversation] ✅ Cleared corrupted conversation');
            }
        }
    } catch (err) {
        console.error('[fixCorruptedConversation] ❌ Failed to fix conversation:', err.message);
    }
}

// ============================================================
// ✅ NEW: Extract valid messages from corrupted JSON
// ============================================================

function extractValidMessages(raw) {
    try {
        // Try to find message array pattern
        const messagePattern = /\[\s*\{[^]*\}\s*\]/;
        const match = raw.match(messagePattern);
        if (match) {
            const extracted = JSON.parse(match[0]);
            if (Array.isArray(extracted)) return extracted;
        }
    } catch (e) {
        // If extraction fails, try to parse individual messages
        const messages = [];
        const msgPattern = /\{"id":"[^"]*","role":"[^"]*","content":"[^"]*"[^}]*\}/g;
        const matches = raw.match(msgPattern);
        if (matches) {
            for (const m of matches) {
                try {
                    messages.push(JSON.parse(m));
                } catch (e) {}
            }
        }
        return messages;
    }
    return [];
}

// ============================================================
// MAIN FUNCTION
// ============================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');

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
            const conversationId = data.conversationId || null;

            console.log('[ai-chat] 📝 User Question:', userQuestion);
            if (conversationId) console.log('[ai-chat] 🔗 Conversation ID:', conversationId);

            if (!userQuestion || userQuestion.trim() === '') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: 'No question provided'
                }));
            }

            // ✅ STEP 0: Initialize Catalyst & fetch token (auto-refreshes if expired)
            const app = catalyst.initialize(req);
            const zcql = app.zcql();

            let LLM_TOKEN;
            try {
                LLM_TOKEN = await getLLMToken(app);
                console.log('[ai-chat] 🔑 LLM token acquired:', LLM_TOKEN.substring(0, 15) + '...');
            } catch (tokenErr) {
                console.error('[ai-chat] ❌ Could not obtain LLM token:', tokenErr.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: 'LLM token unavailable. Check ZOHO_REFRESH_TOKEN in Catalyst Console.'
                }));
            }

            // ✅ STEP 1: Detect Language & Normalize Query
            console.log('[ai-chat] Step 1: Language Detection...');
            const { originalQuery, normalizedQuery, originalLanguage } = await normalizeQuery(userQuestion, LLM_TOKEN);
            console.log('[ai-chat] Original Language:', originalLanguage);
            console.log('[ai-chat] Normalized Query:', normalizedQuery);

            // ✅ STEP 2: Initialize Catalyst
            const app = catalyst.initialize(req);
            const zcql = app.zcql();

            // Resolve the logged-in user's Datastore row (users table)
            const resolvedUser = await resolveUserRow(app, req);
            if (!resolvedUser) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    code: 'AUTH_REQUIRED',
                    error: 'Authentication required. Please sign in.'
                }));
            }

            // ✅ STEP 3: Fetch Conversation History (with corruption handling)
            let conversationHistory = [];
            if (conversationId) {
                console.log('[ai-chat] Loading conversation history for:', conversationId);
                conversationHistory = await fetchConversationHistory(zcql, conversationId);
                console.log('[ai-chat] Loaded', conversationHistory.length, 'previous messages');
            }

            // ✅ STEP 4: Resolve Context-Aware Intent
            console.log('[ai-chat] Step 2: Resolving context-aware intent...');
            const contextResolution = resolveContextAwareIntent(normalizedQuery, conversationHistory);
            console.log('[ai-chat] Context Resolution:', JSON.stringify(contextResolution));
            
            let finalQuery = normalizedQuery;
            if (contextResolution.isReferencingContext && contextResolution.lastEntity) {
                finalQuery = contextResolution.resolvedQuery;
                console.log('[ai-chat] 🔄 Resolved query:', normalizedQuery, '→', finalQuery);
            }

            // ✅ STEP 5: Classify intent using LLM (with resolved query)
            console.log('[ai-chat] Step 3: Classifying intent...');
            const intentResult = await callIntentClassifier(finalQuery, LLM_TOKEN);
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

            // ✅ STEP 5.5: Handle network intents (call criminal-network-analysis function)
            const networkIntents = ['criminal_network', 'network_analysis', 'network_metrics', 'network_path', 'network_community'];
            if (networkIntents.includes(intentResult.intent)) {
                console.log('[ai-chat] Step 3.5: Handling network intent:', intentResult.intent);
                const networkResult = await handleNetworkIntent(intentResult, LLM_TOKEN, originalLanguage);

                if (networkResult.success) {
                    // Generate a text response about the network
                    const networkTextResponse = await generateNetworkTextResponse(
                        finalQuery, networkResult.workspace, LLM_TOKEN, originalLanguage, conversationHistory
                    );

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        intent: intentResult,
                        response: networkTextResponse || 'Network analysis complete',
                        workspace: networkResult.workspace,
                        raw_data: networkResult.workspace?.data?.nodes || [],
                        data_count: networkResult.workspace?.data?.nodes?.length || 0,
                        language: originalLanguage
                    }));
                    return;
                } else {
                    console.error('[ai-chat] Network analysis failed:', networkResult.error);
                    // Fall through to normal search flow
                }
            }

            // ✅ STEP 6: Search ALL tables
            console.log('[ai-chat] Step 4: Searching all tables...');
            
            let searchName = intentResult.accused_name || contextResolution.lastEntity || '';
            let queryResult = [];
            
            if (searchName) {
                queryResult = await searchAllTables(zcql, searchName);
            }
            
            console.log('[ai-chat] Query Result Count:', queryResult.length || 0);

            // ✅ STEP 7: Generate response with context manager
            console.log('[ai-chat] Step 5: Generating response with context manager...');
            const finalResponse = await generateResponseWithContextManager(
                finalQuery,
                userQuestion,
                queryResult,
                LLM_TOKEN,
                originalLanguage,
                conversationHistory,
                intentResult.intent
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                intent: intentResult,
                response: finalResponse.response || 'No response generated',
                raw_data: queryResult,
                data_count: queryResult.length || 0,
                language: originalLanguage,
                context: {
                    wasCompressed: finalResponse.wasCompressed || false,
                    usedHistory: finalResponse.usedHistory || 0,
                    totalTokens: finalResponse.totalTokens || 0
                }
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
9. criminal_network - REQUIRED: accused_name
10. network_analysis - Full network analysis of all accused
11. network_metrics - Network statistics and metrics
12. network_path - REQUIRED: source_person, target_person
13. network_community - Community detection analysis

Examples:
User: "What's the criminal history of Ravi Kumar?"
{"intent":"criminal_history","accused_name":"Ravi Kumar"}

User: "Show all FIRs in Bangalore"
{"intent":"search_fir","location":"Bangalore"}

User: "List repeat offenders"
{"intent":"repeat_offenders"}

User: "Show network of Ravi Kumar"
{"intent":"criminal_network","accused_name":"Ravi Kumar"}

User: "Analyze the full criminal network"
{"intent":"network_analysis"}

User: "Find connection between Ravi and Suresh"
{"intent":"network_path","source_person":"Ravi","target_person":"Suresh"}

User: "Show crime communities"
{"intent":"network_community"}

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
            temperature: 0.1,
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
                    phone_number,
                    dob,
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
            address: accused.address || 'Unknown',
            phone_number: accused.phone_number || 'Unknown',
            dob: accused.dob || 'Unknown',
            risk_score: accused.risk_score || 0,
            is_repeat_offender: accused.is_repeat_offender || false,
            rowid: accused.ROWID,
            details: `Found in accused records. Risk score: ${accused.risk_score || 0}`
        });

        try {
            const firQuery = `
                SELECT 
                    f.ROWID as fir_rowid,
                    f.fir_number,
                    f.status,
                    f.date_registered,
                    f.description,
                    f.priorites,
                    c.crime_name,
                    fa.role_in_crime,
                    l.city,
                    l.district
                FROM fir_accused fa
                JOIN fir f ON f.ROWID = fa.fir_rowid
                LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
                LEFT JOIN location l ON l.ROWID = f.location_rowid
                WHERE fa.accused_rowid = '${accused.ROWID}'
                ORDER BY f.date_registered DESC
            `;
            const firResults = await zcql.executeZCQLQuery(firQuery);
            
            if (firResults && firResults.length > 0) {
                for (const firRow of firResults) {
                    const firData = firRow.f || {};
                    const crimeData = firRow.c || {};
                    const locData = firRow.l || {};
                    const firROWID = firRow.fa?.fir_rowid || firData.ROWID || '';

                    const firEntry = {
                        table: 'fir_accused',
                        type: 'FIR Case',
                        name: accused.full_name,
                        fir_number: firData.fir_number || 'Unknown',
                        status: firData.status || 'Unknown',
                        date_registered: firData.date_registered || 'Unknown',
                        description: firData.description || 'Unknown',
                        priority: firData.priorites || 'Unknown',
                        crime_type: crimeData.crime_name || 'Unknown',
                        role_in_crime: firRow.fa?.role_in_crime || 'Unknown',
                        city: locData.city || 'Unknown',
                        district: locData.district || 'Unknown',
                        victims: [],
                        investigation: null,
                        details: `Involved in FIR ${firData.fir_number || 'Unknown'}`
                    };

                    if (firROWID) {
                        try {
                            const victimQuery = `
                                SELECT 
                                    v.full_name,
                                    v.gender,
                                    v.occupation,
                                    v.phone_number
                                FROM fir_victim fv
                                JOIN victim v ON v.ROWID = fv.victim_rowid
                                WHERE fv.fir_rowid = '${firROWID}'
                            `;
                            const victimResults = await zcql.executeZCQLQuery(victimQuery);
                            if (victimResults && victimResults.length > 0) {
                                firEntry.victims = victimResults.map(vr => {
                                    const v = vr.v || {};
                                    return {
                                        name: v.full_name || 'Unknown',
                                        gender: v.gender || 'Unknown',
                                        occupation: v.occupation || 'Unknown',
                                        phone_number: v.phone_number || 'Unknown'
                                    };
                                });
                            }
                        } catch (vErr) {
                            console.log('[searchAllTables] Victim fetch failed:', vErr.message);
                        }

                        try {
                            const invQuery = `
                                SELECT 
                                    i.status,
                                    i.start_date,
                                    i.end_date,
                                    u.full_name as officer_name
                                FROM investigation i
                                LEFT JOIN users u ON u.ROWID = i.officer_rowid
                                WHERE i.fir_rowid = '${firROWID}'
                            `;
                            const invResults = await zcql.executeZCQLQuery(invQuery);
                            if (invResults && invResults.length > 0) {
                                const inv = invResults[0];
                                firEntry.investigation = {
                                    status: inv.status || 'Unknown',
                                    start_date: inv.start_date || 'Unknown',
                                    end_date: inv.end_date || null,
                                    officer_name: inv.officer_name || 'Unknown'
                                };
                            }
                        } catch (iErr) {
                            console.log('[searchAllTables] Investigation fetch failed:', iErr.message);
                        }
                    }

                    allResults.push(firEntry);
                }
            }
        } catch (err) {
            console.log('[searchAllTables] FIR fetch failed:', err.message);
        }
    }

    // TABLE 2: VICTIM (always search to cross-reference)
    {
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

    // TABLE 3: FIR (search for investigating officer mentions)
    {
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

    // TABLE 4: USERS (search for officer/user mentions)
    {
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
// HELPER: Call Criminal Network Analysis Function
// ============================================================

async function callCatalystFunction(functionName, payload, token) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(payload);

        const options = {
            hostname: 'api.catalyst.zoho.in',
            path: `/server/v1/project/47024000000013051/function/${functionName}/execute`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${token}`,
                'CATALYST-ORG': '60073436832',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const request = https.request(options, response => {
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
                try {
                    if (response.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        console.error(`[callCatalystFunction] ${functionName} returned ${response.statusCode}:`, data);
                        reject(new Error(`Function ${functionName} returned ${response.statusCode}`));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });

        request.on('error', reject);
        request.write(postData);
        request.end();
    });
}

async function handleNetworkIntent(intentResult, llmToken, originalLanguage) {
    const actionMap = {
        criminal_network: 'get_full_network',
        network_analysis: 'get_full_network',
        network_metrics: 'get_network_metrics',
        network_path: 'find_shortest_path',
        network_community: 'detect_communities',
    };

    const action = actionMap[intentResult.intent] || 'get_full_network';

    const payload = {
        action: action,
        accused_name: intentResult.accused_name || null,
        source_person: intentResult.source_person || null,
        target_person: intentResult.target_person || null,
    };

    console.log('[handleNetworkIntent] Calling criminal-network-analysis with:', JSON.stringify(payload));

    try {
        const result = await callCatalystFunction('criminal-network-analysis', payload, llmToken);

        if (!result || !result.success) {
            console.error('[handleNetworkIntent] Function failed:', result);
            return { success: false, error: 'Network analysis failed' };
        }

        console.log('[handleNetworkIntent] Got network data:', {
            nodes: result.workspace?.data?.nodes?.length || 0,
            edges: result.workspace?.data?.edges?.length || 0,
        });

        return {
            success: true,
            workspace: result.workspace || { type: 'network', data: result },
        };
    } catch (err) {
        console.error('[handleNetworkIntent] Error calling function:', err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================
// HELPER: Generate Network Text Response
// ============================================================

async function generateNetworkTextResponse(resolvedQuery, workspace, llmToken, originalLanguage, conversationHistory) {
    return new Promise(async (resolve) => {
        if (!llmToken) {
            resolve('Network analysis complete. Please see the interactive graph.');
            return;
        }

        const networkData = workspace?.data || {};
        const nodes = networkData.nodes || [];
        const edges = networkData.edges || [];
        const metrics = networkData.metrics || {};
        const communities = networkData.communities || {};

        const systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP).
The user has requested a criminal network analysis. Below is the network data.
Provide a clear, professional summary of the criminal network. Highlight:
- Key actors and their roles
- Number of connections and communities
- Any important patterns or insights
- Risk assessment of the network
Keep it concise (3-5 paragraphs). Use bullet points for key findings.`;

        const dataContext = `
Network Summary:
- Total Nodes: ${nodes.length}
- Total Connections: ${edges.length}
- Network Density: ${metrics.density || 'N/A'}
- Detected Communities: ${Object.keys(communities).length}
- Key Actors: ${(metrics.topActors || []).slice(0, 5).map(a => `${a.label} (${a.role}, score: ${a.composite_score})`).join(', ') || 'N/A'}
- Node Types: ${[...new Set(nodes.map(n => n.type))].join(', ')}
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'system', content: `Network Data:\n${dataContext}` },
            { role: 'user', content: resolvedQuery }
        ];

        const payload = JSON.stringify({
            model: "crm-di-glm47b_30b_it",
            messages: messages,
            max_tokens: 1000,
            temperature: 0.1,
            stream: false,
            chat_template_kwargs: { enable_thinking: false }
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
            response.on('data', chunk => { data += chunk; });
            response.on('end', async () => {
                try {
                    let responseText = 'Network analysis complete. Please see the interactive graph.';
                    if (response.statusCode === 200) {
                        const parsed = JSON.parse(data);
                        responseText = parsed.choices?.[0]?.message?.content ||
                                      parsed.output?.text ||
                                      parsed.response ||
                                      responseText;
                    }

                    if (originalLanguage === 'kn') {
                        try {
                            const translated = await translateWithLLM(responseText, 'en', 'kn', llmToken);
                            if (translated && translated !== responseText) responseText = translated;
                        } catch (err) {
                            console.error('[generateNetworkTextResponse] Translation failed:', err);
                        }
                    }

                    resolve(responseText);
                } catch (err) {
                    console.error('[generateNetworkTextResponse] Error:', err);
                    resolve('Network analysis complete. Please see the interactive graph.');
                }
            });
        });

        request.on('error', () => resolve('Network analysis complete. Please see the interactive graph.'));
        request.write(payload);
        request.end();
    });
}

// ============================================================
// HELPER: Generate Response with Context Manager
// ============================================================

async function generateResponseWithContextManager(
    resolvedQuery,
    originalUserQuestion,
    queryResult,
    llmToken,
    originalLanguage,
    conversationHistory,
    intent
) {
    return new Promise(async (resolve) => {
        if (!llmToken) {
            resolve({ 
                response: "Authentication failed. Please check your API token.",
                wasCompressed: false,
                usedHistory: 0,
                totalTokens: 0
            });
            return;
        }

        // ============================================================
        // STEP 1: Build System Prompt (intent-aware, minimal, with example)
        // ============================================================

        let systemPrompt;

        const profileIntents = ['criminal_history', 'search_accused', 'risk_profile'];
        const firIntents = ['search_fir', 'fir_accused'];

        if (profileIntents.includes(intent)) {
            systemPrompt = `You are a crime data formatter. Format the DATABASE RECORDS below into a criminal profile.

RULES:
- Copy every value EXACTLY as it appears in the records. Do NOT invent, guess, or fabricate any value.
- If a field says "Not Available", write "Not Available".
- Do NOT add information that is not in the records.

FORMAT the response like this example:

## Criminal Profile: [Name]

### Personal Details
- **Name:** [exact value]
- **Gender:** [exact value]
- **Date of Birth:** [exact value]
- **Occupation:** [exact value]
- **Address:** [exact value]
- **Phone:** [exact value]

### Risk Assessment
- **Risk Score:** [exact value]
- **Repeat Offender:** [YES/NO]
- **Threat Level:** [Based on risk score: Low if <4, Medium if 4-7, High if >7]

### Case History
For each case, list:
- **FIR Number:** [exact value]
- **Crime Type:** [exact value]
- **Date Registered:** [exact value]
- **Status:** [exact value]
- **Priority:** [exact value]
- **Description:** [exact value]
- **Role in Crime:** [exact value]
- **Location:** [City, District]

### Victims
For each case, list victims with name, gender, occupation.

### Investigation
For each case, list investigation status, officer name, start date.

If the records show NO DATA FOUND, say: "No criminal records found for this person in the database."`;
        } else if (firIntents.includes(intent)) {
            systemPrompt = `You are a crime data formatter. Format the DATABASE RECORDS below into FIR details.

RULES:
- Copy every value EXACTLY as it appears. Do NOT fabricate any value.
- If a field says "Not Available", write "Not Available".

FORMAT the response like:
## FIR Details: [FIR Number]
- **Crime Type:** [exact value]
- **Date Registered:** [exact value]
- **Status:** [exact value]
- **Priority:** [exact value]
- **Description:** [exact value]
- **Location:** [City, District]
- **Accused:** [names and roles]
- **Victims:** [names]
- **Investigation:** [status, officer]

If NO DATA FOUND, say: "No FIR records found."`;
        } else {
            systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP).

The DATABASE RECORDS below contain the accurate, current data. Use ONLY this data to answer.

RULES:
- Be professional, factual, and concise.
- Use the actual data from the records. Do NOT fabricate values.
- If no data is found, say so politely.
- Use bullet points and bold labels for readability.
- Highlight important details like dates, FIR numbers, status.`;
        }

        // ============================================================
        // STEP 2: Build Context with Sliding Window
        // ============================================================
        const context = buildContextWithSlidingWindow({
            systemPrompt: systemPrompt,
            conversationHistory: conversationHistory,
            currentQuestion: resolvedQuery,
            databaseResults: queryResult,
            intent: intent,
            maxTokens: 8000,
            reserveForResponse: 2000,
            maxHistoryExchanges: 2
        });

        console.log('[generateResponse] 📊 Context built:', {
            messages: context.messages.length,
            totalTokens: context.totalTokens,
            wasCompressed: context.wasCompressed,
            skippedMessages: context.skippedMessages
        });

        // ============================================================
        // STEP 3: Call LLM
        // ============================================================
        const payload = JSON.stringify({
            model: "crm-di-glm47b_30b_it",
            messages: context.messages,
            max_tokens: 3000,
            temperature: 0.1,
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
                        resolve({ 
                            response: "Authentication failed. Please check your API token.",
                            wasCompressed: context.wasCompressed,
                            usedHistory: context.usedHistoryMessages,
                            totalTokens: context.totalTokens
                        });
                        return;
                    }

                    if (response.statusCode !== 200) {
                        console.error('[generateResponse] LLM API Error:', response.statusCode);
                        const fallback = formatFallbackResponse(queryResult, resolvedQuery);
                        resolve({ 
                            response: fallback,
                            wasCompressed: context.wasCompressed,
                            usedHistory: context.usedHistoryMessages,
                            totalTokens: context.totalTokens
                        });
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
                        responseText = formatFallbackResponse(queryResult, resolvedQuery);
                    }

                    // ✅ If original input was Kannada, translate response to Kannada
                    if (originalLanguage === 'kn') {
                        console.log('[generateResponse] Translating response to Kannada...');
                        try {
                            const translatedResponse = await translateWithLLM(responseText, 'en', 'kn', llmToken);
                            if (translatedResponse && translatedResponse !== responseText) {
                                responseText = translatedResponse;
                                console.log('[generateResponse] ✅ Translated response successfully');
                            }
                        } catch (err) {
                            console.error('[generateResponse] Translation failed:', err);
                        }
                    }

                    resolve({ 
                        response: responseText,
                        wasCompressed: context.wasCompressed,
                        usedHistory: context.usedHistoryMessages,
                        totalTokens: context.totalTokens
                    });

                } catch (err) {
                    console.error('[generateResponse] Error:', err);
                    const fallback = formatFallbackResponse(queryResult, resolvedQuery);
                    resolve({ 
                        response: fallback,
                        wasCompressed: context.wasCompressed,
                        usedHistory: context.usedHistoryMessages,
                        totalTokens: context.totalTokens
                    });
                }
            });
        });

        request.on('error', (err) => {
            console.error('[generateResponse] Request error:', err);
            const fallback = formatFallbackResponse(queryResult, resolvedQuery);
            resolve({ 
                response: fallback,
                wasCompressed: false,
                usedHistory: 0,
                totalTokens: 0
            });
        });

        request.write(payload);
        request.end();
    });
}

// ============================================================
// FALLBACK RESPONSE FORMATTER
// ============================================================

function formatFallbackResponse(queryResult, userQuestion) {
    if (!queryResult || queryResult.length === 0) {
        return `I searched for "${userQuestion}" but couldn't find any matching records in the database. Please try with a different name, FIR number, or location.`;
    }

    let response = `I found ${queryResult.length} record(s) related to your query:\n\n`;
    
    for (let i = 0; i < Math.min(queryResult.length, 10); i++) {
        const item = queryResult[i];
        response += `**${i + 1}. ${item.type || 'Record'}**\n`;
        if (item.name) response += `• Name: ${item.name}\n`;
        if (item.fir_number) response += `• FIR: ${item.fir_number}\n`;
        if (item.status) response += `• Status: ${item.status}\n`;
        if (item.crime_type) response += `• Crime: ${item.crime_type}\n`;
        if (item.date_registered) response += `• Date: ${item.date_registered}\n`;
        if (item.role_in_crime) response += `• Role: ${item.role_in_crime}\n`;
        if (item.risk_score) response += `• Risk Score: ${item.risk_score}\n`;
        if (item.details) response += `• Details: ${item.details}\n`;
        response += '\n';
    }

    if (queryResult.length > 10) {
        response += `\n... and ${queryResult.length - 10} more records.`;
    }

    response += `\n\nWould you like more details about any specific record?`;
    return response;
}

// ============================================================
// HELPER: Safe String
// ============================================================

function safeString(value) {
    if (!value) return '';
    return String(value).replace(/'/g, "''");
}

