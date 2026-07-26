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
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
    }

    try {
        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        const query = `
            SELECT
                loc.ROWID, loc.district, loc.taluk, loc.city, loc.pincode, loc.latitude, loc.longitude,
                f.ROWID AS fir_rowid, f.fir_number, f.status, f.priorites, f.date_registered
            FROM location AS loc
            LEFT JOIN fir AS f ON f.location_rowid = loc.ROWID
        `;

        const rows = await zcql.executeZCQLQuery(query);

        const locationsByRowId = new Map();

        for (const row of rows) {
            const loc = row.loc;
            const fir = row.f;

            const lat = loc.latitude != null ? parseFloat(loc.latitude) : null;
            const lng = loc.longitude != null ? parseFloat(loc.longitude) : null;
            if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
                continue;
            }

            if (!locationsByRowId.has(loc.ROWID)) {
                locationsByRowId.set(loc.ROWID, {
                    id: loc.ROWID,
                    district: loc.district || null,
                    taluk: loc.taluk || null,
                    city: loc.city || null,
                    pincode: loc.pincode || null,
                    lat,
                    lng,
                    caseCount: 0,
                    cases: []
                });
            }

            const entry = locationsByRowId.get(loc.ROWID);

            // LEFT JOIN with no matching FIR still returns a row with null `f`
            if (fir && fir.ROWID) {
                entry.caseCount += 1;
                entry.cases.push({
                    firNumber: fir.fir_number,
                    status: fir.status,
                    statusColor: statusColors[fir.status] || '#6B7280',
                    priority: fir.priorites,
                    priorityColor: priorityColors[fir.priorites] || '#6B7280',
                    dateRegistered: formatDate(fir.date_registered)
                });
            }
        }

        const locations = Array.from(locationsByRowId.values());
        const totalCases = locations.reduce((sum, l) => sum + l.caseCount, 0);

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
            success: true,
            totalLocations: locations.length,
            totalCases,
            locations
        }));
    } catch (error) {
        console.error('[CrimeheatMap] Error:', error);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({
            success: false,
            message: error.message
        }));
    }
};
