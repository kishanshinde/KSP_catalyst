// D:\Project\KSP\KSP_catalyst\functions\ai-chat\index.js
'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { resolveUserRow } = require('./resolveUser');
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

if (!LLM_TOKEN) {
    console.error('[ai-chat] ❌ LLM_ACCESS_TOKEN is missing in .env');
}
if (!TRANSLATE_TOKEN) {
    console.error('[ai-chat] ❌ TRANSLATE_ACCESS_TOKEN is missing in .env');
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
    maxTokens = 8000,
    reserveForResponse = 2000,
    maxHistoryExchanges = 2
}) {
    const systemTokens = countTokens(systemPrompt);
    const questionTokens = countTokens(currentQuestion);
    const dataTokens = databaseResults ? countTokens(JSON.stringify(databaseResults)) : 0;
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
    
    if (databaseResults && databaseResults.length > 0) {
        const summary = summarizeResults(databaseResults);
        messages.push({
            role: "system",
            content: `Database Results Summary:\n${summary}`
        });
    }
    
    messages.push({ role: "user", content: currentQuestion });
    
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
    
    const items = results.slice(0, 10);
    let summary = `Found ${results.length} record(s).\n`;
    
    for (const item of items) {
        const fields = [];
        if (item.fir_number) fields.push(`FIR: ${item.fir_number}`);
        if (item.full_name) fields.push(`Name: ${item.full_name}`);
        if (item.status) fields.push(`Status: ${item.status}`);
        if (item.crime_type) fields.push(`Crime: ${item.crime_type}`);
        if (item.date_registered) fields.push(`Date: ${item.date_registered}`);
        if (item.role_in_crime) fields.push(`Role: ${item.role_in_crime}`);
        if (item.risk_score) fields.push(`Risk Score: ${item.risk_score}`);
        if (item.table) fields.push(`Source: ${item.table}`);
        
        if (fields.length > 0) {
            summary += `• ${fields.join(' | ')}\n`;
        } else {
            summary += `• ${JSON.stringify(item).substring(0, 100)}...\n`;
        }
    }
    
    if (results.length > 10) {
        summary += `\n... and ${results.length - 10} more records.`;
    }
    
    return summary;
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
            const nameMatch = msg.content.match(/(?:Name|name):\s*([A-Za-z\s]+)/i);
            if (nameMatch) {
                lastEntity = nameMatch[1].trim();
                lastEntityType = 'name';
                break;
            }
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

            // ✅ STEP 6: Search ALL tables
            console.log('[ai-chat] Step 4: Searching all tables...');
            
            let searchName = intentResult.accused_name || '';
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
                conversationHistory
            );

            // ✅ STEP 8: Save conversation
            console.log('[ai-chat] Step 6: Saving conversation...');
            const saveResult = await saveConversationDirect(zcql, {
                conversationId: conversationId,
                user_rowid: resolvedUser.rowid,
                question: userQuestion,
                response: finalResponse.response || 'No response generated',
                intent: intentResult,
                data_count: queryResult.length || 0,
                language: originalLanguage,
                llmToken: LLM_TOKEN
            });

            const savedConversationId = saveResult?.conversationId || null;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                conversation: { id: savedConversationId, title: saveResult?.title || null },
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
// HELPER: Generate Response with Context Manager
// ============================================================

async function generateResponseWithContextManager(
    resolvedQuery,
    originalUserQuestion,
    queryResult,
    llmToken,
    originalLanguage,
    conversationHistory
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
        // STEP 1: Build System Prompt (with priority instruction)
        // ============================================================
        const systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP).

IMPORTANT: 
- The "Database Results Summary" below contains the CURRENT, ACCURATE data.
- If the Database Results Summary shows data, use it REGARDLESS of previous messages.
- Previous messages may contain outdated information.
- Always prioritize the Database Results Summary over conversation history.

Convert the database results into clear, professional, user-friendly responses.

Guidelines:
1. Be professional and factual
2. Format data in a readable way
3. If the user asks for "history" or "record", provide a chronological summary
4. If no data is found in the Database Results Summary, politely say so
5. Use bullet points for cases
6. Highlight important details (dates, FIR numbers, status)
7. Group results by table/source (Accused, Victim, FIR, etc.)`;

        // ============================================================
        // STEP 2: Build Context with Sliding Window
        // ============================================================
        const context = buildContextWithSlidingWindow({
            systemPrompt: systemPrompt,
            conversationHistory: conversationHistory,
            currentQuestion: resolvedQuery,
            databaseResults: queryResult,
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

// ============================================================
// HELPER: Generate Conversation Title (LLM summary, best-effort)
// ============================================================

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

        const request = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        console.warn('[generateTitleWithLLM] API Error:', res.statusCode);
                        return resolve(fallback);
                    }
                    const parsed = JSON.parse(data);
                    let title = parsed.choices?.[0]?.message?.content || '';
                    title = title.replace(/^["'\s]+|["'\s.]+$/g, '').trim();
                    resolve(title.length > 0 ? title.slice(0, 80) : fallback);
                } catch (err) {
                    console.warn('[generateTitleWithLLM] Parse Error:', err.message);
                    resolve(fallback);
                }
            });
        });

        request.on('error', (err) => {
            console.warn('[generateTitleWithLLM] Request Error:', err.message);
            resolve(fallback);
        });

        request.write(payload);
        request.end();
    });
}

// ============================================================
// HELPER: Save Conversation
// ============================================================

function saveConversationDirect(zcql, data) {
    return new Promise((resolve) => {
        try {
            const user_rowid = data.user_rowid;
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const newExchange = [
                { role: 'user', content: data.question },
                { role: 'assistant', content: data.response }
            ];

            if (data.conversationId) {
                // UPDATE existing conversation
                const fetchQuery = `SELECT conversation FROM conversation_history WHERE ROWID = '${safeString(data.conversationId)}'`;

                zcql.executeZCQLQuery(fetchQuery).then((result) => {
                    let existingMessages = [];
                    if (result && result.length > 0) {
                        const row = result[0].conversation_history || result[0];
                        try {
                            existingMessages = JSON.parse(row.conversation);
                            if (!Array.isArray(existingMessages)) existingMessages = [];
                        } catch (e) {
                            existingMessages = [];
                        }
                    }

                    // ✅ Limit to last 20 messages to prevent corruption
                    const allMessages = [...existingMessages, ...newExchange];
                    const limitedMessages = allMessages.slice(-20);
                    const updatedConversation = JSON.stringify(limitedMessages);

                    const updateQuery = `
                        UPDATE conversation_history
                        SET conversation = '${safeString(updatedConversation)}',
                            response = '${safeString(data.response)}'
                        WHERE ROWID = '${safeString(data.conversationId)}'
                    `;

                    return zcql.executeZCQLQuery(updateQuery);
                }).then(() => {
                    console.log('[ai-chat] ✅ Conversation updated successfully');
                    resolve({ conversationId: data.conversationId });
                }).catch((err) => {
                    console.error('[ai-chat] ❌ Failed to update conversation:', err);
                    resolve({ conversationId: data.conversationId });
                });
            } else {
                // INSERT new conversation
                const conversation = JSON.stringify(newExchange);

                generateTitleWithLLM(data.question, data.response, data.llmToken).then((title) => {
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
                            '${safeString(title)}',
                            '${safeString(conversation)}',
                            '${safeString(data.question)}',
                            '${safeString(data.response)}',
                            '${data.language || 'en'}',
                            '${timestamp}'
                        )
                    `;

                    return zcql.executeZCQLQuery(query).then((result) => {
                        console.log('[ai-chat] ✅ Conversation saved successfully');
                        let insertedId = null;
                        if (result && result.length > 0) {
                            const row = result[0].conversation_history || result[0];
                            insertedId = row.ROWID || null;
                        }
                        resolve({ conversationId: insertedId, title });
                    });
                }).catch((err) => {
                    console.error('[ai-chat] ❌ Failed to save conversation:', err);
                    resolve({ conversationId: null, title: null });
                });
            }
        } catch (err) {
            console.error('[ai-chat] ❌ Save conversation error:', err);
            resolve({ conversationId: null });
        }
    });
}