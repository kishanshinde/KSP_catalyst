'use strict';

const https = require('https');

module.exports = async (req, res) => {

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const ACCESS_TOKEN = "1000.7d757e120d7340e3fcbd57ace7bc34f2.f42d2badf91a04c9c6c287aa1a1f04de";

    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const userQuery = data.question || data.message || '';

            const prompt = `
    Convert the user query into JSON.

    Supported intents:

    search_fir
    search_accused
    search_victim
    search_investigation
    criminal_history
    criminal_network
    criminal_network_graph
    crime_hotspots
    crime_type_trends
    monthly_crime_trends
    district_crime_analysis
    risk_profile
    repeat_offenders
    fir_accused
    fir_victims
    fir_investigation
    financial_analysis

    User Query:
    "${userQuery}"

    Return only JSON. No markdown. No backticks. No explanation.
    `;

            const system_prompt = `
    Return valid JSON only.

    Examples:

    User: Show criminal history of Ramesh
    {"intent":"criminal_history","accused_name":"Ramesh"}

    User: Show accused in FIR-2026-0001
    {"intent":"fir_accused","fir_number":"FIR-2026-0001"}

    User: Show crime hotspots in Bangalore
    {"intent":"crime_hotspots"}

    User: Show monthly crime trends
    {"intent":"monthly_crime_trends"}
    `;

            const payload = JSON.stringify({
                model: "crm-di-qwen_text_14b-fp8-it",
                prompt: prompt,
                system_prompt: system_prompt,
                temperature: 0.1,
                max_tokens: 300
            });

            const options = {
                hostname: 'api.catalyst.zoho.in',
                path: '/quickml/v2/project/47024000000013051/llm/chat',
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
                        // Catalyst LLM returns { output: { text: "..." } }
                        const parsed = JSON.parse(llmData);
                        const rawText = parsed?.output?.text || parsed?.text || llmData;

                        // Extract JSON from the response (handle markdown-wrapped or nested)
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                        const intentJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { intent: 'search_fir' };

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(intentJson));
                    } catch (parseErr) {
                        // If LLM output isn't parseable, return raw with fallback intent
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            intent: 'search_fir',
                            raw_response: llmData
                        }));
                    }
                });
            });

            request.on('error', error => {
                res.end(JSON.stringify({
                    intent: 'search_fir',
                    error: error.message
                }));
            });

            request.write(payload);
            request.end();

        } catch (err) {
            res.writeHead(400);
            res.end(JSON.stringify({
                intent: 'search_fir',
                error: 'Invalid request: ' + err.message
            }));
        }
    });
};
