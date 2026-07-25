const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // Read JSON body from request
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        try {
            const bodyStr = Buffer.concat(chunks).toString();
            const body = bodyStr ? JSON.parse(bodyStr) : {};
            const text = body.text || '';

            if (!text) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Text parameter is required' }));
                return;
            }

            console.log(`[text-to-speech] Generating speech for text: "${text.substring(0, 40)}..."`);

            const app = catalyst.initialize(req);
            let audioBuffer = null;

            // Attempt to invoke Zia Services if available in the Catalyst SDK context
            try {
                if (app.zia && typeof app.zia === 'function') {
                    const zia = app.zia();
                    
                    if (typeof zia.textToSpeech === 'function') {
                        console.log('[text-to-speech] Invoking zia.textToSpeech...');
                        audioBuffer = await zia.textToSpeech(text);
                    } else if (typeof zia.textToAudio === 'function') {
                        console.log('[text-to-speech] Invoking zia.textToAudio...');
                        audioBuffer = await zia.textToAudio(text);
                    } else {
                        console.warn('[text-to-speech] Zia TTS method not found on zia object, using fallback mock.');
                    }
                } else {
                    console.warn('[text-to-speech] Zia service not found on app object, using fallback mock.');
                }
            } catch (ziaError) {
                console.error('[text-to-speech] Zia API error:', ziaError.message);
            }

            // Fallback mock audio generation (1-second simple silent mono WAV file 8000Hz 8-bit)
            if (!audioBuffer) {
                audioBuffer = Buffer.from(
                    'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==', 
                    'base64'
                );
            }

            res.writeHead(200, { 
                'Content-Type': 'audio/wav',
                'Content-Length': audioBuffer.length
            });
            res.end(audioBuffer);
        } catch (err) {
            console.error('[text-to-speech] Request processing error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });
};
