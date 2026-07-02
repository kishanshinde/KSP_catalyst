'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');

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

module.exports = async (req, res) => {

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

    if (!ACCESS_TOKEN) {
        console.error('ACCESS_TOKEN is not configured');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: false,
            error: 'ACCESS_TOKEN is not configured'
        }));
    }

    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            console.log('AI-Response Raw Request:', body);

            const data = JSON.parse(body);
            const userQuestion = data.question || data.query || data.user || '';
            const rawData = data.data || data.results || [];

            console.log('User Question:', userQuestion);
            console.log('Raw Data Count:', rawData.length);

            if (!userQuestion || userQuestion.trim() === '') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: 'No question provided'
                }));
            }

            // Format the data for the LLM prompt
            let formattedData = '';
            if (rawData && rawData.length > 0) {
                formattedData = JSON.stringify(rawData, null, 2);
            } else {
                formattedData = 'No data found.';
            }

            // Build the prompt for LLM
            const systemPrompt = `You are a Crime Intelligence Assistant for Karnataka State Police (KSP). 
Your job is to convert raw crime data into clear, professional, and user-friendly responses.

Guidelines:
1. Always be professional and factual
2. Format data in a readable way
3. If the user asks for "history" or "record", provide a chronological summary
4. If the user asks for "latest" or "recent", highlight the most recent cases
5. If no data is found, politely say so
6. Use proper formatting: bullet points, dates, and case numbers
7. Include confidence levels when appropriate

Response Format:
- Start with a clear summary
- Use bullet points for cases
- Highlight important details (dates, FIR numbers, status)
- End with actionable next steps if applicable`;

            const userPrompt = `User Question: "${userQuestion}"

Raw Data from Database:
${formattedData}

Instructions:
1. Analyze the raw data
2. Answer the user's question in a clear, professional way
3. If data exists, present it in a readable format
4. If no data exists, say "No records found for this query"
5. Format the response with proper spacing and structure

Response:`;

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
                max_tokens: 1000,
                temperature: 0.5,
                stream: false,
                chat_template_kwargs: {
                    enable_thinking: false
                }
            });

            console.log('Sending to LLM for response generation...');

            const options = {
                hostname: 'api.catalyst.zoho.in',
                path: '/quickml/v1/project/47024000000013051/glm/chat',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
                    'CATALYST-ORG': '60073436832',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };

            const request = https.request(options, response => {
                let llmData = '';

                response.on('data', chunk => {
                    llmData += chunk;
                });

                response.on('end', () => {
                    try {
                        console.log('LLM Response Status:', response.statusCode);

                        if (response.statusCode !== 200) {
                            console.error('LLM API Error:', response.statusCode, llmData);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({
                                success: true,
                                response: "Unable to generate a response at this time. Please try again.",
                                raw_data: rawData
                            }));
                        }

                        const parsed = JSON.parse(llmData);
                        let responseText = '';

                        if (parsed.choices && parsed.choices.length > 0) {
                            responseText = parsed.choices[0].message?.content || '';
                        } else if (parsed.output?.text) {
                            responseText = parsed.output.text;
                        } else if (parsed.response) {
                            responseText = parsed.response;
                        } else {
                            responseText = llmData;
                        }

                        console.log('Generated Response:', responseText);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            response: responseText,
                            raw_data: rawData,
                            data_count: rawData.length
                        }));

                    } catch (parseErr) {
                        console.error('Error processing LLM response:', parseErr);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            response: "I found some data but couldn't format it properly. Here's what I found:",
                            raw_data: rawData,
                            data_count: rawData.length
                        }));
                    }
                });
            });

            request.on('error', error => {
                console.error('Request Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            });

            request.write(payload);
            request.end();

        } catch (err) {
            console.error('Parse Error:', err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Invalid request: ' + err.message
            }));
        }
    });
};