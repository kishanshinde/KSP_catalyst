'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
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
                }
            );

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
            const status = err.response?.status || 500;
            const errorData = err.response?.data || {};

            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: `LLM request failed: ${err.message}`,
                details: errorData
            }));
        }
    });
};
