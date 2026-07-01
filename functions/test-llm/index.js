'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

function loadLocalEnv() {
    const envPath = path.join(__dirname, '.env');
<<<<<<< Updated upstream
    if (!fs.existsSync(envPath)) return;
=======

    if (!fs.existsSync(envPath)) {
        console.warn('No .env file found');
        return;
    }
>>>>>>> Stashed changes

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

<<<<<<< Updated upstream
=======
    const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

    if (!ACCESS_TOKEN) {
        console.error('ACCESS_TOKEN is not configured');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            intent: 'search_fir',
            error: 'ACCESS_TOKEN is not configured'
        }));
    }

>>>>>>> Stashed changes
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            console.log('Raw Request Body:', body);

            const data = JSON.parse(body);
<<<<<<< Updated upstream
            const userQuery = (data.question || data.message || '').trim();

            if (!userQuery) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Question is required' }));
            }

            const systemMessage = `You are a crime data query analyzer for Karnataka State Police. Convert the user query into a JSON object representing the intent and extracted parameters.

Supported intents:
- search_fir: Search FIR records (params: fir_number, accused_name, victim_name, location_name)
- search_accused: List accused persons (params: accused_name)
- search_victim: List victims (params: victim_name)
- search_investigation: List investigations
- fir_accused: Get accused for a FIR (requires: fir_number)
- fir_victims: Get victims for a FIR (requires: fir_number)
- fir_investigation: Get investigation for a FIR (requires: fir_number)
- criminal_history: Criminal history of an accused (requires: accused_name)
- criminal_network: Criminal connections of an accused (requires: accused_name)
- criminal_network_graph: Graph view of connections (requires: accused_name)
- crime_hotspots: Crime hotspots (params: location_name)
- crime_type_trends: Trends by crime type
- monthly_crime_trends: Monthly trends
- district_crime_analysis: Analysis by district
- risk_profile: Risk assessment of accused (requires: accused_name)
- repeat_offenders: List repeat offenders
- emerging_crime_clusters: Emerging patterns
- gender_crime_analysis: Gender-based stats
- education_crime_analysis: Education-level stats
- migration_crime_analysis: Migration-related stats
- economic_stress_analysis: Economic stress analysis
- social_risk_analysis: Social risk analysis
- financial_analysis: Financial investigation (requires: accused_name)

Rules:
- Return ONLY valid JSON. No backticks. No markdown. No explanation.
- FIR numbers follow pattern FIR-YYYY-NNNN
- Extract names, FIR numbers, locations from the query
- If query is about a person, use criminal_history with accused_name
- If query is about a specific FIR, use fir_* intent with fir_number

Examples:
User: Show criminal history of Ramesh
{"intent":"criminal_history","accused_name":"Ramesh"}

User: Show accused in FIR-2026-0001
{"intent":"fir_accused","fir_number":"FIR-2026-0001"}

User: Show crime hotspots in Bangalore
{"intent":"crime_hotspots","location_name":"Bangalore"}

User: Show monthly crime trends
{"intent":"monthly_crime_trends"}

User: Show me all FIRs
{"intent":"search_fir"}

User: Find FIRs related to Ravi Kumar
{"intent":"search_fir","accused_name":"Ravi Kumar"}

User: Show criminal network of Suresh
{"intent":"criminal_network","accused_name":"Suresh"}`;

            const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
            const ORG_ID = 60073436832;
            const PROJECT_ID =47024000000013051;

            if (!ACCESS_TOKEN) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'ACCESS_TOKEN is not configured' }));
            }

            const response = await axios.post(
                `https://api.catalyst.zoho.in/quickml/v1/project/${PROJECT_ID}/glm/chat`,
                {
                    model: 'crm-di-glm47b_30b_it',
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: userQuery }
                    ],
                    max_tokens: 500,
                    temperature: 0.1,
                    stream: false
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
                        'CATALYST-ORG': 60073436832
                    },
                    timeout: 30000
=======

            // Check all possible message fields
            const userQuery = data.question || data.message || data.user || data.query || data.text || '';

            console.log('Extracted User Query:', userQuery);

            if (!userQuery || userQuery.trim() === '') {
                console.error('Empty query received');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    intent: 'search_fir',
                    error: 'No query provided. Please send question, message, or user field.'
                }));
            }

            // ✅ CORRECT: Use messages array format
            const systemPrompt = `You are a precise JSON classifier for crime data queries. Always return valid JSON only.

Supported intents and their required parameters:

1. search_fir - Search for FIRs
   Optional: fir_number, status, location, crime_type
   Example: {"intent":"search_fir","crime_type":"burglary"}

2. search_accused - Search for accused persons
   Optional: accused_name, is_repeat_offender, gender
   Example: {"intent":"search_accused","is_repeat_offender":true}

3. criminal_history - Get criminal history of a person
   REQUIRED: accused_name
   Example: {"intent":"criminal_history","accused_name":"Ravi Kumar"}

4. criminal_network - Get network of associates
   REQUIRED: accused_name
   Example: {"intent":"criminal_network","accused_name":"Ravi Kumar"}

5. crime_hotspots - Get crime hotspots
   Optional: location, crime_type
   Example: {"intent":"crime_hotspots","location":"Bangalore"}

6. repeat_offenders - List all repeat offenders

7. risk_profile - Get risk profile of an accused
   REQUIRED: accused_name
   Example: {"intent":"risk_profile","accused_name":"Ravi Kumar"}

8. fir_accused - Get accused in a specific FIR
   REQUIRED: fir_number
   Example: {"intent":"fir_accused","fir_number":"FIR-2024-0001"}

9. fir_victims - Get victims in a specific FIR
   REQUIRED: fir_number

10. monthly_crime_trends - Get monthly crime trends

11. district_crime_analysis - Get crime analysis by district

12. emerging_crime_clusters - Get emerging crime patterns

13. gender_crime_analysis - Get gender-based crime analysis

14. demographic_dashboard - Get demographic overview

15. social_risk_analysis - Get social risk analysis

16. fir_investigation - Get investigation details for a FIR
    REQUIRED: fir_number

Examples:
User: "What's the criminal history of Ravi Kumar?"
{"intent":"criminal_history","accused_name":"Ravi Kumar"}

User: "Show all FIRs in Bangalore"
{"intent":"search_fir","location":"Bangalore"}

User: "List repeat offenders"
{"intent":"repeat_offenders"}

User: "Show accused in FIR-2024-0001"
{"intent":"fir_accused","fir_number":"FIR-2024-0001"}

IMPORTANT: 
- Return ONLY valid JSON. No markdown, no backticks, no explanations.
- Extract names, FIR numbers, locations from the query.
- If unsure, use "search_fir".`;

            const userPrompt = `User Query: "${userQuery}"\n\nReturn JSON only:`;

            // ✅ CORRECT: Use messages array
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
                max_tokens: 500,
                temperature: 0.3,
                stream: false,
                chat_template_kwargs: {
                    enable_thinking: false
>>>>>>> Stashed changes
                }
            );

<<<<<<< Updated upstream
            const content = response.data?.choices?.[0]?.message?.content
                || response.data?.output?.text
                || response.data?.text
                || JSON.stringify(response.data);
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    error: 'LLM response did not contain valid JSON',
                    raw: content
=======
            console.log('Sending to LLM with payload:', payload);

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

                console.log('LLM Response Status:', response.statusCode);

                response.on('data', chunk => {
                    llmData += chunk;
                });

                response.on('end', () => {
                    try {
                        console.log('LLM Raw Response:', llmData);

                        if (response.statusCode !== 200) {
                            console.error('LLM API Error:', response.statusCode, llmData);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({
                                intent: 'search_fir',
                                error: `LLM API returned ${response.statusCode}`,
                                raw: llmData
                            }));
                        }

                        const parsed = JSON.parse(llmData);

                        // Extract response from choices array
                        let rawText = '';
                        if (parsed.choices && parsed.choices.length > 0) {
                            rawText = parsed.choices[0].message?.content || '';
                        } else if (parsed.output?.text) {
                            rawText = parsed.output.text;
                        } else if (parsed.text) {
                            rawText = parsed.text;
                        } else {
                            rawText = llmData;
                        }

                        console.log('LLM Output Text:', rawText);

                        let intentJson = { intent: 'search_fir' };
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

                        if (jsonMatch) {
                            try {
                                intentJson = JSON.parse(jsonMatch[0]);
                                console.log('Parsed Intent:', intentJson);
                            } catch (parseErr) {
                                console.error('Failed to parse JSON from LLM response:', parseErr);
                            }
                        } else {
                            console.warn('No JSON found in LLM response, using fallback');
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(intentJson));

                    } catch (parseErr) {
                        console.error('Error processing LLM response:', parseErr);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            intent: 'search_fir',
                            error: 'Failed to parse LLM response',
                            raw_response: llmData
                        }));
                    }
                });
            });

            request.on('error', error => {
                console.error('Request Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    intent: 'search_fir',
                    error: error.message
>>>>>>> Stashed changes
                }));
            }

            const intentJson = JSON.parse(jsonMatch[0]);

            if (!intentJson.intent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    error: 'LLM response missing intent field',
                    raw: intentJson
                }));
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(intentJson));

        } catch (err) {
<<<<<<< Updated upstream
            const status = err.response?.status || 500;
            const errorData = err.response?.data || {};

            res.writeHead(status, { 'Content-Type': 'application/json' });
=======
            console.error('Parse Error:', err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
>>>>>>> Stashed changes
            res.end(JSON.stringify({
                error: `LLM request failed: ${err.message}`,
                details: errorData
            }));
        }
    });
};