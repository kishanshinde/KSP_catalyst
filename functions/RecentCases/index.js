'use strict';

const catalyst = require('zcatalyst-sdk-node');

const priorityColors = {
    Critical: '#DC2626',
    High: '#F97316',
    Medium: '#EAB308',
    Low: '#22C55E'
};

const statusColors = {
    Open: '#10B981',
    Registered: '#3B82F6',
    'Under Investigation': '#F59E0B',
    'Charge Sheet Filed': '#8B5CF6',
    Closed: '#6B7280'
};

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

module.exports = async (req, res) => {
    try {
        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        const query = `
            SELECT
                fir.fir_number,
                fir.description,
                fir.status,
                fir.date_registered,
                fir.priorites
            FROM fir
            ORDER BY fir.date_registered DESC
            LIMIT 10
        `;

        const result = await zcql.executeZCQLQuery(query);

        const recentCases = result.map(row => {
            const fir = row.fir;

            return {
                firNumber: fir.fir_number,
                description: fir.description,
                status: fir.status,
                statusColor: statusColors[fir.status] || '#6B7280',
                dateRegistered: formatDate(fir.date_registered),
                priority: fir.priorites,
                priorityColor: priorityColors[fir.priorites] || '#6B7280'
            };
        });

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
            success: true,
            total: recentCases.length,
            recentCases
        }));
    } catch (error) {
        console.error(error);

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({
            success: false,
            message: error.message
        }));
    }
};