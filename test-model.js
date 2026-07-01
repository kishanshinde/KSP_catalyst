// D:\Project\KSP\KSP_catalyst\test-model.js
'use strict';

const https = require('https');

// ============================================================
// ⚠️ REPLACE WITH YOUR ACTUAL TOKEN
// ============================================================
const ACCESS_TOKEN = '1000.adfbaddb280fcab1f573f16d59bec769.4df2a86b168c1d1a366ecbce34270d04'  // ← PUT YOUR TOKEN HERE
// ============================================================
// Test Configuration
// ============================================================
const PROJECT_ID = '47024000000013051';
const ORG_ID = '60073436832';

// ============================================================
// Test Query
// ============================================================
const userQuery = "What's the criminal history of Ravi Kumar?";

// ============================================================
// Build Request
// ============================================================
const payload = JSON.stringify({
    model: "crm-di-glm47b_30b_it",
    messages: [
        {
            role: "system",
            content: "You are a precise JSON classifier. Return ONLY valid JSON. No markdown, no backticks."
        },
        {
            role: "user",
            content: `Classify this query: "${userQuery}"\n\nReturn JSON with intent and extracted entities.`
        }
    ],
    max_tokens: 300,
    temperature: 0.3,
    stream: false,
    chat_template_kwargs: {
        enable_thinking: false
    }
});

// ============================================================
// Make Request
// ============================================================
const options = {
    hostname: 'api.catalyst.zoho.in',
    path: `/quickml/v1/project/${PROJECT_ID}/glm/chat`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
        'CATALYST-ORG': ORG_ID,
        'Content-Length': Buffer.byteLength(payload)
    }
};

console.log('🚀 Testing LLM Model Connectivity...');
console.log('📝 Query:', userQuery);
console.log('🔑 Token:', ACCESS_TOKEN.substring(0, 15) + '...');
console.log('📦 Payload:', payload);
console.log('');

const request = https.request(options, (response) => {
    let data = '';

    console.log('📡 Response Status:', response.statusCode);
    console.log('📡 Response Headers:', response.headers);
    console.log('');

    response.on('data', (chunk) => {
        data += chunk;
    });

    response.on('end', () => {
        console.log('📄 Raw Response:', data);
        console.log('');

        if (response.statusCode === 200) {
            try {
                const parsed = JSON.parse(data);
                console.log('✅ SUCCESS!');
                console.log('📊 Full Response:', JSON.stringify(parsed, null, 2));
                console.log('');

                // Extract the actual response text
                let responseText = '';
                if (parsed.choices && parsed.choices.length > 0) {
                    responseText = parsed.choices[0].message?.content || '';
                } else if (parsed.output?.text) {
                    responseText = parsed.output.text;
                } else if (parsed.response) {
                    responseText = parsed.response;
                }

                console.log('💬 Model Response:', responseText);

                // Try to parse JSON from response
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const intentJson = JSON.parse(jsonMatch[0]);
                        console.log('🎯 Parsed Intent:', JSON.stringify(intentJson, null, 2));
                    } catch (e) {
                        console.log('⚠️ Could not parse JSON from response');
                    }
                }

            } catch (err) {
                console.log('❌ Error parsing response:', err.message);
            }
        } else if (response.statusCode === 401) {
            console.log('❌ AUTHENTICATION FAILED!');
            console.log('   Your ACCESS_TOKEN is invalid or expired.');
            console.log('   Please regenerate your token from Catalyst Console.');
        } else if (response.statusCode === 403) {
            console.log('❌ ACCESS DENIED!');
            console.log('   Your token does not have permission to access this API.');
        } else if (response.statusCode === 404) {
            console.log('❌ API NOT FOUND!');
            console.log('   Check your PROJECT_ID and API path.');
        } else if (response.statusCode === 429) {
            console.log('❌ RATE LIMITED!');
            console.log('   Too many requests. Please wait and try again.');
        } else if (response.statusCode >= 500) {
            console.log('❌ SERVER ERROR!');
            console.log('   Catalyst server is experiencing issues. Try again later.');
        } else {
            console.log(`⚠️ Unexpected Status Code: ${response.statusCode}`);
        }
    });
});

request.on('error', (err) => {
    console.log('❌ REQUEST ERROR:', err.message);
    console.log('   Check your internet connection and try again.');
});

request.write(payload);
request.end();