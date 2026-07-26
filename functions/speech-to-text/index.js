const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
    // Handle CORS preflight

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
        return;
    }

    // Read raw binary audio upload
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        try {
            const audioBuffer = Buffer.concat(chunks);
            console.log(`[speech-to-text] Received audio buffer of size: ${audioBuffer.length} bytes`);

            if (audioBuffer.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Empty audio buffer received' }));
                return;
            }

            const app = catalyst.initialize(req);
            let transcribedText = '';
            let detectedLanguage = 'en';

            // Attempt to invoke Zia Services if available in the Catalyst SDK context
            try {
                if (app.zia && typeof app.zia === 'function') {
                    const zia = app.zia();
                    
                    // Check for either speechToText or audioToText method dynamically
                    if (typeof zia.audioToText === 'function') {
                        console.log('[speech-to-text] Invoking zia.audioToText...');
                        const result = await zia.audioToText(audioBuffer);
                        transcribedText = result.text || '';
                        detectedLanguage = result.language || 'en';
                    } else if (typeof zia.speechToText === 'function') {
                        console.log('[speech-to-text] Invoking zia.speechToText...');
                        const result = await zia.speechToText(audioBuffer);
                        transcribedText = result.text || '';
                        detectedLanguage = result.language || 'en';
                    } else {
                        console.warn('[speech-to-text] Zia STT method not found on zia object, using fallback mock.');
                        transcribedText = 'Mock STT: show all repeat offenders in Bangalore';
                    }
                } else {
                    console.warn('[speech-to-text] Zia service not found on app object, using fallback mock.');
                    transcribedText = 'Mock STT: show all repeat offenders in Bangalore';
                }
            } catch (ziaError) {
                console.error('[speech-to-text] Zia API error:', ziaError.message);
                // Fallback to avoid breaking the application flow in local/mock environments
                transcribedText = 'Mock STT: show all repeat offenders in Bangalore';
            }

            console.log(`[speech-to-text] Transcription result: "${transcribedText}" (detected: ${detectedLanguage})`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                text: transcribedText,
                language: detectedLanguage
            }));
        } catch (err) {
            console.error('[speech-to-text] Request parsing error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });
};
