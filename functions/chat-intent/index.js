'use strict';

module.exports = async (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    try {

        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {

            try {

                const data = body ? JSON.parse(body) : {};

                const message = data.message || '';

                const response = classifyIntent(message);

                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify(response));

            } catch (err) {

                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    success: false,
                    error: err.message
                }));
            }
        });

    } catch (err) {

        res.writeHead(500, {
            'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
            success: false,
            error: err.message
        }));
    }
};

function classifyIntent(message) {

    const firMatch =
        message.match(/FIR-\d{4}-\d+/i);

    if (
        message.toLowerCase().includes('criminal history')
    ) {

        const nameMatch =
            message.match(
                /criminal history of (.+)/i
            );

        return {
            intent: 'criminal_history',
            accused_name:
                nameMatch?.[1]?.trim() || null
        };
    }

    if (
        message.toLowerCase().includes('accused')
        && firMatch
    ) {

        return {
            intent: 'fir_accused',
            fir_number: firMatch[0]
        };
    }

    if (
        message.toLowerCase().includes('victim')
        && firMatch
    ) {

        return {
            intent: 'fir_victims',
            fir_number: firMatch[0]
        };
    }

    if (
        message.toLowerCase().includes('investigation')
        && firMatch
    ) {

        return {
            intent: 'fir_investigation',
            fir_number: firMatch[0]
        };
    }

    return {
        intent: 'search_fir'
    };
}