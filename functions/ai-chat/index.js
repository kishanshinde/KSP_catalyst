'use strict';

const { GoogleGenerativeAI } =
require("@google/generative-ai");

const genAI =
new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY

module.exports = async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    let body = "";

    req.on("data", chunk => {
        body += chunk.toString();
    });

    req.on("end", async () => {

        try {

            const data = JSON.parse(body);
			console.log("REQUEST BODY:", body);
            const model =
                genAI.getGenerativeModel({
                    model: "gemini-2.5-flash"
                });
			const prompt = `
You are a Crime Intelligence Assistant.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT use backticks.
Do NOT explain anything.

Supported intents:

search_fir

fir_accused

fir_victims

fir_investigation

criminal_history

Examples:

User: Show FIRs

{
  "intent":"search_fir"
}

User: Show accused in FIR-2026-0001

{
  "intent":"fir_accused",
  "fir_number":"FIR-2026-0001"
}

User: Show victims in FIR-2026-0001

{
  "intent":"fir_victims",
  "fir_number":"FIR-2026-0001"
}

User: Show investigation in FIR-2026-0001

{
  "intent":"fir_investigation",
  "fir_number":"FIR-2026-0001"
}

User: Show criminal history of Ravi Kumar

{
  "intent":"criminal_history",
  "accused_name":"Ravi Kumar"
}

User Query:
${data.question}
`;

            const result =
await model.generateContent(prompt);

            const response =
    result.response.text().trim();
			const parsed =
    JSON.parse(response);
            res.writeHead(200, {
                "Content-Type":
                "application/json"
            });
			console.log("GEMINI RESPONSE:", response);
            res.end(JSON.stringify(parsed));

        } catch (err) {

            res.writeHead(500);

            res.end(JSON.stringify({
                error: err.message
            }));
        }

    });
};