// D:\Project\H2S\Intelligent_Conversational_AI_for_KSP\functions\query\index.js
'use strict';

const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight Requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    try {
        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = body ? JSON.parse(body) : {};

                // Enhanced entity extraction from query text
                if (!data.fir_number && data.query) {
                    data.fir_number = extractFirNumber(data.query);
                }

                if (!data.accused_name && data.query) {
                    data.accused_name = extractAccusedName(data.query);
                }

                if (!data.location && data.query) {
                    data.location = extractLocation(data.query);
                }

                if (!data.crime_type && data.query) {
                    data.crime_type = extractCrimeType(data.query);
                }

                // Validate intent
                if (!data.intent || data.intent.trim() === '') {
                    throw new Error('intent is required');
                }

                // Validate required parameters for each intent
                validateIntentParams(data);

                let result = [];

                // Execute query based on intent
                switch (data.intent) {

                    // === SEARCH QUERIES ===
                    case 'search_fir':
                        result = await searchFIR(zcql, data);
                        break;

                    case 'search_accused':
                        result = await searchAccused(zcql, data);
                        break;

                    case 'search_victim':
                        result = await searchVictim(zcql, data);
                        break;

                    case 'search_investigation':
                        result = await searchInvestigation(zcql, data);
                        break;

                    // === FIR DETAILS ===
                    case 'fir_accused':
                        result = await getFIRAccused(zcql, data.fir_number);
                        break;

                    case 'fir_victims':
                        result = await getFIRVictims(zcql, data.fir_number);
                        break;

                    case 'fir_investigation':
                        result = await getFIRInvestigation(zcql, data.fir_number);
                        break;

                    // === ACCUSED ANALYSIS ===
                    case 'criminal_history':
                        result = await criminalHistory(zcql, data.accused_name);
                        break;

                    case 'criminal_network':
                        result = await criminalNetwork(zcql, data.accused_name);
                        break;

                    case 'criminal_network_graph':
                        result = await criminalNetworkGraph(zcql, data.accused_name);
                        break;

                    case 'repeat_offenders':
                        result = await repeatOffenders(zcql);
                        break;

                    case 'risk_profile':
                        result = await riskProfile(zcql, data.accused_name);
                        break;

                    // === LOCATION/TREND ANALYSIS ===
                    case 'crime_hotspots':
                        result = await crimeHotspots(zcql, data);
                        break;

                    case 'crime_type_trends':
                        result = await crimeTypeTrends(zcql, data);
                        break;

                    case 'monthly_crime_trends':
                        result = await monthlyCrimeTrends(zcql, data);
                        break;

                    case 'district_crime_analysis':
                        result = await districtCrimeAnalysis(zcql, data);
                        break;

                    case 'emerging_crime_clusters':
                        result = await emergingCrimeClusters(zcql);
                        break;

                    // === DEMOGRAPHIC ANALYSIS (FIXED - using only existing columns) ===
                    case 'gender_crime_analysis':
                        result = await genderCrimeAnalysis(zcql);
                        break;

                    case 'demographic_dashboard':
                        result = await demographicDashboard(zcql);
                        break;

                    case 'repeat_offender_demographics':
                        result = await repeatOffenderDemographics(zcql);
                        break;

                    // === SOCIAL ANALYSIS (FIXED) ===
                    case 'social_risk_analysis':
                        result = await socialRiskAnalysis(zcql);
                        break;

                    default:
                        throw new Error(`Invalid Intent: ${data.intent}`);
                }

                // Send response
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });

                res.end(JSON.stringify({
                    success: true,
                    count: result.length,
                    results: result,
                    intent: data.intent,
                    query: data.query || null
                }));

            } catch (error) {
                console.error('Query Execution Error:', error);
                res.writeHead(400, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });

                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                }));
            }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });

        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
};

// ============================================================
// HELPER FUNCTIONS - ENTITY EXTRACTION
// ============================================================

function extractFirNumber(text) {
    if (!text) return null;

    // Multiple FIR number formats
    const patterns = [
        /FIR[-_\s]?(\d{4}[-_\s]?\d+)/i,
        /FIR\s*#\s*(\d+)/i,
        /case\s*(?:number|no)[:\s]*(\d+)/i,
        /(\d{4}[-/]\d+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Format consistently
            const num = match[1].replace(/[-_\s]/g, '');
            return `FIR-${num.substring(0, 4)}-${num.substring(4)}`;
        }
    }

    return null;
}

function extractAccusedName(text) {
    if (!text) return null;

    const patterns = [
        /(?:criminal|crime)\s*(?:history|record|profile)\s*(?:of|for)\s+([A-Za-z\s]+)/i,
        /(?:show|get|find)\s+(?:criminal|crime)\s*(?:history|record)\s*(?:of|for)\s+([A-Za-z\s]+)/i,
        /(?:accused|offender|criminal)\s+name\s*(?:is|:|\s+)\s*([A-Za-z\s]+)/i,
        /history of\s+([A-Za-z\s]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const name = match[1].trim();
            if (name.length > 1) return name;
        }
    }

    return null;
}

function extractLocation(text) {
    if (!text) return null;

    const patterns = [
        /(?:in|at|near)\s+([A-Za-z\s]+?)(?:\s+(?:district|city|area|zone|region)|$)/i,
        /(?:location|place|area)\s*(?:is|:|\s+)\s*([A-Za-z\s]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const location = match[1].trim();
            if (location.length > 1) return location;
        }
    }

    return null;
}

function extractCrimeType(text) {
    if (!text) return null;

    const crimeTypes = [
        'theft', 'burglary', 'robbery', 'assault', 'murder',
        'kidnapping', 'rape', 'fraud', 'cyber', 'drug',
        'dacoity', 'extortion', 'rioting', 'homicide'
    ];

    for (const type of crimeTypes) {
        if (text.toLowerCase().includes(type)) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }

    return null;
}

// ============================================================
// HELPER FUNCTIONS - VALIDATION
// ============================================================

function validateIntentParams(data) {
    const intent = data.intent;

    // Intents requiring accused_name
    const requiresAccused = [
        'criminal_history', 'criminal_network',
        'criminal_network_graph', 'risk_profile'
    ];

    if (requiresAccused.includes(intent) && !data.accused_name) {
        throw new Error(`${intent} requires accused_name parameter`);
    }

    // Intents requiring fir_number
    const requiresFIR = ['fir_accused', 'fir_victims', 'fir_investigation'];

    if (requiresFIR.includes(intent) && !data.fir_number) {
        throw new Error(`${intent} requires fir_number parameter`);
    }

    // Intents requiring location
    const requiresLocation = ['crime_hotspots'];

    // If location is required but not provided, we'll still execute (return all)
    // This is optional, so no error thrown
}

// ============================================================
// QUERY FUNCTIONS - SAFE (PARAMETERIZED)
// ============================================================

/**
 * Safely escape a string for ZCQL
 * Note: ZCQL doesn't support parameterized queries directly,
 * so we sanitize inputs manually
 */
function safeString(value) {
    if (!value) return null;
    return String(value).replace(/'/g, "''");
}

function safeNumber(value) {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
}

// ============================================================
// SEARCH FUNCTIONS
// ============================================================

async function searchFIR(zcql, params = {}) {
    let query = `
        SELECT 
            ROWID, 
            fir_number, 
            crime_type_rowid, 
            location_rowid, 
            date_registered, 
            status, 
            description, 
            investigating_officer,
            priorites
        FROM fir
    `;

    const conditions = [];
    const limit = params.limit || 20;

    if (params.fir_number) {
        conditions.push(`fir_number = '${safeString(params.fir_number)}'`);
    }

    if (params.status) {
        conditions.push(`status = '${safeString(params.status)}'`);
    }

    if (params.crime_type) {
        // Subquery to match crime type name
        conditions.push(`
            crime_type_rowid IN (
                SELECT ROWID FROM crime_type_master 
                WHERE LOWER(crime_name) LIKE '%${safeString(params.crime_type.toLowerCase())}%'
            )
        `);
    }

    if (params.location) {
        conditions.push(`
            location_rowid IN (
                SELECT ROWID FROM location 
                WHERE LOWER(city) LIKE '%${safeString(params.location.toLowerCase())}%'
                OR LOWER(district) LIKE '%${safeString(params.location.toLowerCase())}%'
            )
        `);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY date_registered DESC LIMIT ${safeNumber(limit) || 20}`;

    const result = await zcql.executeZCQLQuery(query);

    // Transform to flat structure for easier consumption
    return result.map(row => ({
        ...row.fir,
        rowid: row.fir.ROWID
    }));
}

async function searchAccused(zcql, params = {}) {
    let query = `
        SELECT 
            ROWID, 
            full_name, 
            gender, 
            dob, 
            occupation, 
            address, 
            phone_number,
            risk_score, 
            is_repeat_offender
        FROM accused
    `;

    const conditions = [];
    const limit = params.limit || 20;

    if (params.accused_name) {
        conditions.push(`LOWER(full_name) LIKE '%${safeString(params.accused_name.toLowerCase())}%'`);
    }

    if (params.is_repeat_offender !== undefined) {
        conditions.push(`is_repeat_offender = ${params.is_repeat_offender ? 'true' : 'false'}`);
    }

    if (params.gender) {
        conditions.push(`gender = '${safeString(params.gender)}'`);
    }

    if (params.min_risk_score !== undefined) {
        conditions.push(`risk_score >= ${safeNumber(params.min_risk_score)}`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY risk_score DESC LIMIT ${safeNumber(limit) || 20}`;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        ...row.accused,
        rowid: row.accused.ROWID
    }));
}

async function searchVictim(zcql, params = {}) {
    let query = `
        SELECT 
            ROWID, 
            full_name, 
            gender, 
            dob, 
            occupation, 
            address, 
            phone_number
        FROM victim
    `;

    const conditions = [];
    const limit = params.limit || 20;

    if (params.victim_name) {
        conditions.push(`LOWER(full_name) LIKE '%${safeString(params.victim_name.toLowerCase())}%'`);
    }

    if (params.gender) {
        conditions.push(`gender = '${safeString(params.gender)}'`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` LIMIT ${safeNumber(limit) || 20}`;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        ...row.victim,
        rowid: row.victim.ROWID
    }));
}

async function searchInvestigation(zcql, params = {}) {
    let query = `
        SELECT 
            i.ROWID,
            i.fir_rowid,
            i.officer_rowid,
            i.status,
            i.start_date,
            i.end_date,
            f.fir_number
        FROM investigation i
        JOIN fir f ON f.ROWID = i.fir_rowid
    `;

    const conditions = [];
    const limit = params.limit || 20;

    if (params.status) {
        conditions.push(`i.status = '${safeString(params.status)}'`);
    }

    if (params.fir_number) {
        conditions.push(`f.fir_number = '${safeString(params.fir_number)}'`);
    }

    if (params.officer_name) {
        conditions.push(`
            i.officer_rowid IN (
                SELECT ROWID FROM users 
                WHERE LOWER(full_name) LIKE '%${safeString(params.officer_name.toLowerCase())}%'
            )
        `);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY i.start_date DESC LIMIT ${safeNumber(limit) || 20}`;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        ...row.i,
        rowid: row.i.ROWID,
        fir_number: row.f.fir_number
    }));
}

// ============================================================
// FIR DETAIL FUNCTIONS
// ============================================================

async function getFIRAccused(zcql, firNumber) {
    const safeFir = safeString(firNumber);

    const query = `
        SELECT
            f.fir_number,
            a.full_name,
            a.gender,
            a.phone_number,
            a.is_repeat_offender,
            a.risk_score,
            fa.role_in_crime
        FROM fir f
        JOIN fir_accused fa ON f.ROWID = fa.fir_rowid
        JOIN accused a ON a.ROWID = fa.accused_rowid
        WHERE f.fir_number = '${safeFir}'
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        fir_number: row.f.fir_number,
        full_name: row.a.full_name,
        gender: row.a.gender,
        phone_number: row.a.phone_number,
        is_repeat_offender: row.a.is_repeat_offender,
        risk_score: row.a.risk_score,
        role_in_crime: row.fa.role_in_crime
    }));
}

async function getFIRVictims(zcql, firNumber) {
    const safeFir = safeString(firNumber);

    const query = `
        SELECT
            f.fir_number,
            v.full_name,
            v.gender,
            v.phone_number,
            v.occupation
        FROM fir f
        JOIN fir_victim fv ON f.ROWID = fv.fir_rowid
        JOIN victim v ON v.ROWID = fv.victim_rowid
        WHERE f.fir_number = '${safeFir}'
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        fir_number: row.f.fir_number,
        full_name: row.v.full_name,
        gender: row.v.gender,
        phone_number: row.v.phone_number,
        occupation: row.v.occupation
    }));
}

async function getFIRInvestigation(zcql, firNumber) {
    const safeFir = safeString(firNumber);

    const query = `
        SELECT
            f.fir_number,
            i.status,
            i.start_date,
            i.end_date,
            u.full_name AS investigating_officer
        FROM fir f
        JOIN investigation i ON f.ROWID = i.fir_rowid
        LEFT JOIN users u ON u.ROWID = i.officer_rowid
        WHERE f.fir_number = '${safeFir}'
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        fir_number: row.f.fir_number,
        status: row.i.status,
        start_date: row.i.start_date,
        end_date: row.i.end_date,
        investigating_officer: row.u?.full_name || 'Not Assigned'
    }));
}

// ============================================================
// CRIMINAL HISTORY & NETWORK FUNCTIONS (OPTIMIZED)
// ============================================================

async function criminalHistory(zcql, accusedName) {
    const safeName = safeString(accusedName);

    // Single optimized query
    const query = `
        SELECT
            a.full_name,
            a.gender,
            a.occupation,
            a.is_repeat_offender,
            a.risk_score,
            fa.role_in_crime,
            f.fir_number,
            f.status,
            f.date_registered,
            c.crime_name
        FROM accused a
        JOIN fir_accused fa ON a.ROWID = fa.accused_rowid
        JOIN fir f ON f.ROWID = fa.fir_rowid
        LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
        WHERE LOWER(a.full_name) LIKE '%${safeName.toLowerCase()}%'
        ORDER BY f.date_registered DESC
    `;

    const result = await zcql.executeZCQLQuery(query);

    if (!result.length) {
        return [];
    }

    // Group by accused (handles multiple FIRs)
    const grouped = {};

    for (const row of result) {
        const name = row.a.full_name;
        if (!grouped[name]) {
            grouped[name] = {
                full_name: name,
                gender: row.a.gender,
                occupation: row.a.occupation,
                is_repeat_offender: row.a.is_repeat_offender,
                risk_score: row.a.risk_score,
                total_cases: 0,
                cases: []
            };
        }

        grouped[name].total_cases++;
        grouped[name].cases.push({
            fir_number: row.f.fir_number,
            status: row.f.status,
            date_registered: row.f.date_registered,
            crime_type: row.c?.crime_name || 'Unknown',
            role_in_crime: row.fa.role_in_crime
        });
    }

    return Object.values(grouped);
}

async function criminalNetwork(zcql, accusedName) {
    const safeName = safeString(accusedName);

    // First, get the accused
    const accusedQuery = `
        SELECT ROWID, full_name, is_repeat_offender, risk_score
        FROM accused
        WHERE LOWER(full_name) LIKE '%${safeName.toLowerCase()}%'
    `;

    const accusedResult = await zcql.executeZCQLQuery(accusedQuery);

    if (!accusedResult.length) {
        return [];
    }

    const network = [];

    for (const accRow of accusedResult) {
        const accusedId = accRow.accused.ROWID;
        const accused = accRow.accused;

        // Single query for all FIRs and associates
        const networkQuery = `
            SELECT 
                f.fir_number,
                f.status,
                l.city,
                l.district,
                a2.full_name AS associate_name,
                a2.ROWID AS associate_id,
                a2.is_repeat_offender AS associate_repeat,
                fa2.role_in_crime AS associate_role,
                v.full_name AS victim_name
            FROM fir_accused fa1
            JOIN fir f ON f.ROWID = fa1.fir_rowid
            LEFT JOIN location l ON l.ROWID = f.location_rowid
            LEFT JOIN fir_accused fa2 ON fa2.fir_rowid = f.ROWID AND fa2.accused_rowid != '${accusedId}'
            LEFT JOIN accused a2 ON a2.ROWID = fa2.accused_rowid
            LEFT JOIN fir_victim fv ON fv.fir_rowid = f.ROWID
            LEFT JOIN victim v ON v.ROWID = fv.victim_rowid
            WHERE fa1.accused_rowid = '${accusedId}'
            ORDER BY f.date_registered DESC
        `;

        const networkResult = await zcql.executeZCQLQuery(networkQuery);

        // Process results
        const firMap = {};
        const associateSet = new Set();
        const victimSet = new Set();

        for (const row of networkResult) {
            const firNum = row.f?.fir_number || 'Unknown';

            if (!firMap[firNum]) {
                firMap[firNum] = {
                    fir_number: firNum,
                    status: row.f?.status || 'Unknown',
                    location: row.l?.city || row.l?.district || 'Unknown',
                    associates: [],
                    victims: []
                };
            }

            if (row.a2?.full_name && row.a2.full_name !== accused.full_name) {
                const assocKey = row.a2.full_name;
                if (!associateSet.has(assocKey)) {
                    associateSet.add(assocKey);
                    firMap[firNum].associates.push({
                        name: row.a2.full_name,
                        id: row.a2.ROWID,
                        is_repeat_offender: row.a2.is_repeat_offender,
                        role: row.fa2?.role_in_crime || 'Unknown'
                    });
                }
            }

            if (row.v?.full_name) {
                const victimKey = row.v.full_name;
                if (!victimSet.has(victimKey)) {
                    victimSet.add(victimKey);
                    firMap[firNum].victims.push(row.v.full_name);
                }
            }
        }

        const firs = Object.values(firMap);
        const totalFirs = firs.length;
        const allAssociates = Array.from(associateSet);

        network.push({
            central_accused: accused.full_name,
            central_id: accusedId,
            is_repeat_offender: accused.is_repeat_offender || totalFirs > 1,
            total_firs: totalFirs,
            risk_score: accused.risk_score,
            organized_group: allAssociates.length >= 2,
            associate_count: allAssociates.length,
            associates: allAssociates,
            firs: firs
        });
    }

    return network;
}

async function criminalNetworkGraph(zcql, accusedName) {
    const safeName = safeString(accusedName);

    // Get accused
    const accusedQuery = `
        SELECT ROWID, full_name
        FROM accused
        WHERE LOWER(full_name) LIKE '%${safeName.toLowerCase()}%'
    `;

    const accusedResult = await zcql.executeZCQLQuery(accusedQuery);

    if (!accusedResult.length) {
        return { nodes: [], edges: [] };
    }

    const nodes = [];
    const edges = [];
    const addedNodes = new Set();
    const addedEdges = new Set();

    for (const accRow of accusedResult) {
        const centralId = accRow.accused.ROWID;
        const centralName = accRow.accused.full_name;

        // Add central node
        if (!addedNodes.has(centralId)) {
            nodes.push({ id: centralId, label: centralName, type: 'accused' });
            addedNodes.add(centralId);
        }

        // Get all FIRs and connections in one query
        const graphQuery = `
            SELECT 
                f.ROWID AS fir_id,
                f.fir_number,
                fa2.accused_rowid AS associate_id,
                a2.full_name AS associate_name,
                fa2.role_in_crime
            FROM fir_accused fa1
            JOIN fir f ON f.ROWID = fa1.fir_rowid
            LEFT JOIN fir_accused fa2 ON fa2.fir_rowid = f.ROWID AND fa2.accused_rowid != '${centralId}'
            LEFT JOIN accused a2 ON a2.ROWID = fa2.accused_rowid
            WHERE fa1.accused_rowid = '${centralId}'
        `;

        const result = await zcql.executeZCQLQuery(graphQuery);

        const firSet = new Set();

        for (const row of result) {
            const firId = row.f?.ROWID;
            const firNumber = row.f?.fir_number || firId;

            if (firId && !firSet.has(firId)) {
                firSet.add(firId);
                if (!addedNodes.has(firId)) {
                    nodes.push({ id: firId, label: firNumber, type: 'fir' });
                    addedNodes.add(firId);
                }

                const edgeKey = `${centralId}-${firId}`;
                if (!addedEdges.has(edgeKey)) {
                    edges.push({ source: centralId, target: firId, label: 'INVOLVED_IN' });
                    addedEdges.add(edgeKey);
                }
            }

            // Add associates
            if (row.fa2?.accused_rowid) {
                const assocId = row.fa2.accused_rowid;
                if (assocId !== centralId && !addedNodes.has(assocId)) {
                    nodes.push({
                        id: assocId,
                        label: row.a2?.full_name || 'Unknown',
                        type: 'accused'
                    });
                    addedNodes.add(assocId);
                }

                if (firId) {
                    const assocEdgeKey = `${assocId}-${firId}`;
                    if (!addedEdges.has(assocEdgeKey)) {
                        edges.push({
                            source: assocId,
                            target: firId,
                            label: row.fa2?.role_in_crime || 'INVOLVED_IN'
                        });
                        addedEdges.add(assocEdgeKey);
                    }
                }
            }
        }
    }

    return { nodes, edges };
}

async function repeatOffenders(zcql) {
    const query = `
        SELECT 
            full_name, 
            gender,
            risk_score, 
            is_repeat_offender,
            (
                SELECT COUNT(*) 
                FROM fir_accused fa 
                WHERE fa.accused_rowid = a.ROWID
            ) AS total_cases
        FROM accused a
        WHERE is_repeat_offender = true
        ORDER BY risk_score DESC
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        full_name: row.a.full_name,
        gender: row.a.gender,
        risk_score: row.a.risk_score,
        is_repeat_offender: row.a.is_repeat_offender,
        total_cases: parseInt(row.a.total_cases || 0)
    }));
}

// ============================================================
// RISK PROFILE (FIXED - using only existing columns)
// ============================================================

async function riskProfile(zcql, accusedName) {
    const safeName = safeString(accusedName);

    // Get accused details (only existing columns)
    const accusedQuery = `
        SELECT 
            ROWID,
            full_name,
            gender,
            occupation,
            address,
            risk_score,
            is_repeat_offender
        FROM accused
        WHERE LOWER(full_name) LIKE '%${safeName.toLowerCase()}%'
    `;

    const accusedResult = await zcql.executeZCQLQuery(accusedQuery);

    if (!accusedResult.length) {
        return [{ error: 'Accused not found' }];
    }

    const accused = accusedResult[0].accused;

    // Get FIR details in one query
    const firQuery = `
        SELECT 
            f.ROWID AS fir_id,
            f.fir_number,
            f.status,
            f.date_registered,
            l.city,
            l.district,
            a2.full_name AS associate_name,
            a2.ROWID AS associate_id
        FROM fir_accused fa1
        JOIN fir f ON f.ROWID = fa1.fir_rowid
        LEFT JOIN location l ON l.ROWID = f.location_rowid
        LEFT JOIN fir_accused fa2 ON fa2.fir_rowid = f.ROWID AND fa2.accused_rowid != '${accused.ROWID}'
        LEFT JOIN accused a2 ON a2.ROWID = fa2.accused_rowid
        WHERE fa1.accused_rowid = '${accused.ROWID}'
        ORDER BY f.date_registered DESC
    `;

    const firResult = await zcql.executeZCQLQuery(firQuery);

    const totalFirs = firResult.length;
    const associates = new Set();
    const locations = new Set();
    const firNumbers = [];

    for (const row of firResult) {
        if (row.f?.fir_number) {
            firNumbers.push(row.f.fir_number);
        }
        if (row.a2?.full_name && row.a2.full_name !== accused.full_name) {
            associates.add(row.a2.full_name);
        }
        if (row.l?.city) {
            locations.add(row.l.city);
        } else if (row.l?.district) {
            locations.add(row.l.district);
        }
    }

    const associateCount = associates.size;
    const organizedGroup = associateCount >= 2;

    let threatLevel = 'LOW';
    if (Number(accused.risk_score) >= 80) {
        threatLevel = 'HIGH';
    } else if (Number(accused.risk_score) >= 60) {
        threatLevel = 'MEDIUM';
    }

    return [{
        name: accused.full_name,
        gender: accused.gender,
        occupation: accused.occupation,
        address: accused.address,
        risk_score: accused.risk_score,
        repeat_offender: accused.is_repeat_offender,
        total_firs: totalFirs,
        fir_numbers: firNumbers,
        known_associates: Array.from(associates),
        associate_count: associateCount,
        organized_group_member: organizedGroup,
        hotspot_locations: Array.from(locations),
        threat_level: threatLevel
    }];
}

// ============================================================
// LOCATION & TREND ANALYSIS
// ============================================================

async function crimeHotspots(zcql, params = {}) {
    let query = `
        SELECT 
            l.city,
            l.district,
            COUNT(f.ROWID) AS crime_count
        FROM fir f
        JOIN location l ON l.ROWID = f.location_rowid
    `;

    const conditions = [];

    if (params.location) {
        conditions.push(`
            LOWER(l.city) LIKE '%${safeString(params.location.toLowerCase())}%'
            OR LOWER(l.district) LIKE '%${safeString(params.location.toLowerCase())}%'
        `);
    }

    if (params.crime_type) {
        conditions.push(`
            f.crime_type_rowid IN (
                SELECT ROWID FROM crime_type_master 
                WHERE LOWER(crime_name) LIKE '%${safeString(params.crime_type.toLowerCase())}%'
            )
        `);
    }

    if (params.from_date) {
        conditions.push(`f.date_registered >= '${safeString(params.from_date)}'`);
    }

    if (params.to_date) {
        conditions.push(`f.date_registered <= '${safeString(params.to_date)}'`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
        GROUP BY l.city, l.district
        ORDER BY crime_count DESC
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => {
        const count = parseInt(row.l?.crime_count || 0);
        return {
            city: row.l.city,
            district: row.l.district,
            crime_count: count,
            hotspot_level: count >= 10 ? 'HIGH' : count >= 5 ? 'MEDIUM' : 'LOW'
        };
    });
}

async function crimeTypeTrends(zcql, params = {}) {
    let query = `
        SELECT 
            c.crime_name,
            c.parent_category,
            COUNT(f.ROWID) AS crime_count
        FROM fir f
        JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
    `;

    const conditions = [];

    if (params.from_date) {
        conditions.push(`f.date_registered >= '${safeString(params.from_date)}'`);
    }

    if (params.to_date) {
        conditions.push(`f.date_registered <= '${safeString(params.to_date)}'`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
        GROUP BY c.crime_name, c.parent_category
        ORDER BY crime_count DESC
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        crime_type: row.c.crime_name,
        category: row.c.parent_category,
        count: parseInt(row.c?.crime_count || 0)
    }));
}

async function monthlyCrimeTrends(zcql, params = {}) {
    let query = `
        SELECT date_registered
        FROM fir
    `;

    const conditions = [];

    if (params.from_date) {
        conditions.push(`date_registered >= '${safeString(params.from_date)}'`);
    }

    if (params.to_date) {
        conditions.push(`date_registered <= '${safeString(params.to_date)}'`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await zcql.executeZCQLQuery(query);

    const monthCounts = {};

    for (const row of result) {
        const date = row.fir.date_registered;
        if (date) {
            const month = date.substring(0, 7);
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
    }

    const trends = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, crime_count: count }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trends
    for (let i = 0; i < trends.length; i++) {
        if (i === 0) {
            trends[i].trend = 'BASELINE';
            trends[i].change = '0';
        } else {
            const diff = trends[i].crime_count - trends[i - 1].crime_count;
            trends[i].trend = diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE';
            trends[i].change = diff > 0 ? `+${diff}` : `${diff}`;
        }
    }

    return trends;
}

async function districtCrimeAnalysis(zcql, params = {}) {
    let query = `
        SELECT 
            l.district,
            COUNT(f.ROWID) AS crime_count
        FROM fir f
        JOIN location l ON l.ROWID = f.location_rowid
    `;

    const conditions = [];

    if (params.from_date) {
        conditions.push(`f.date_registered >= '${safeString(params.from_date)}'`);
    }

    if (params.to_date) {
        conditions.push(`f.date_registered <= '${safeString(params.to_date)}'`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
        GROUP BY l.district
        ORDER BY crime_count DESC
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        district: row.l.district,
        crime_count: parseInt(row.l?.crime_count || 0)
    }));
}

async function emergingCrimeClusters(zcql) {
    const query = `
        SELECT 
            c.crime_name,
            f.date_registered
        FROM fir f
        JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid
        ORDER BY f.date_registered
    `;

    const result = await zcql.executeZCQLQuery(query);

    const crimeMonthlyData = {};

    for (const row of result) {
        const crimeType = row.c.crime_name;
        const date = row.f.date_registered;

        if (date) {
            const month = date.substring(0, 7);
            if (!crimeMonthlyData[crimeType]) {
                crimeMonthlyData[crimeType] = {};
            }
            crimeMonthlyData[crimeType][month] = (crimeMonthlyData[crimeType][month] || 0) + 1;
        }
    }

    const clusters = [];

    for (const crimeType in crimeMonthlyData) {
        const months = Object.keys(crimeMonthlyData[crimeType]).sort();

        if (months.length < 2) continue;

        const firstMonth = months[0];
        const lastMonth = months[months.length - 1];
        const firstCount = crimeMonthlyData[crimeType][firstMonth];
        const lastCount = crimeMonthlyData[crimeType][lastMonth];

        let trend = 'STABLE';
        if (lastCount > firstCount) trend = 'RISING';
        else if (lastCount < firstCount) trend = 'DECLINING';

        const growthPercent = firstCount === 0 ? 100 :
            Number(((lastCount - firstCount) / firstCount * 100).toFixed(2));

        clusters.push({
            crime_type: crimeType,
            first_month: firstMonth,
            first_month_count: firstCount,
            latest_month: lastMonth,
            latest_month_count: lastCount,
            trend,
            growth_percent: growthPercent
        });
    }

    return clusters.sort((a, b) => b.growth_percent - a.growth_percent);
}

// ============================================================
// DEMOGRAPHIC ANALYSIS (FIXED - only existing columns)
// ============================================================

async function genderCrimeAnalysis(zcql) {
    const query = `
        SELECT gender, COUNT(ROWID) AS count
        FROM accused
        GROUP BY gender
        ORDER BY count DESC
    `;

    const result = await zcql.executeZCQLQuery(query);

    return result.map(row => ({
        gender: row.accused.gender || 'Unknown',
        count: parseInt(row.accused.count || 0)
    }));
}

async function demographicDashboard(zcql) {
    const query = `
        SELECT 
            gender,
            occupation,
            risk_score,
            is_repeat_offender
        FROM accused
    `;

    const result = await zcql.executeZCQLQuery(query);

    const total = result.length;
    let repeatOffenders = 0;
    let totalRiskScore = 0;
    const genderCounts = {};
    const occupationCounts = {};

    for (const row of result) {
        const accused = row.accused;

        if (accused.is_repeat_offender) {
            repeatOffenders++;
        }

        totalRiskScore += Number(accused.risk_score || 0);

        const gender = accused.gender || 'Unknown';
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;

        const occupation = accused.occupation || 'Unknown';
        occupationCounts[occupation] = (occupationCounts[occupation] || 0) + 1;
    }

    const topGender = Object.entries(genderCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    const topOccupation = Object.entries(occupationCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    return [{
        total_accused: total,
        repeat_offenders: repeatOffenders,
        average_risk_score: total === 0 ? 0 : Number((totalRiskScore / total).toFixed(2)),
        most_common_gender: topGender,
        most_common_occupation: topOccupation
    }];
}

async function repeatOffenderDemographics(zcql) {
    const query = `
        SELECT 
            gender,
            occupation,
            risk_score,
            is_repeat_offender
        FROM accused
        WHERE is_repeat_offender = true
    `;

    const result = await zcql.executeZCQLQuery(query);

    const total = result.length;
    let totalRiskScore = 0;
    const genderCounts = {};
    const occupationCounts = {};

    for (const row of result) {
        const accused = row.accused;
        totalRiskScore += Number(accused.risk_score || 0);

        const gender = accused.gender || 'Unknown';
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;

        const occupation = accused.occupation || 'Unknown';
        occupationCounts[occupation] = (occupationCounts[occupation] || 0) + 1;
    }

    const topGender = Object.entries(genderCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    const topOccupation = Object.entries(occupationCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    return [{
        repeat_offender_count: total,
        average_risk_score: total === 0 ? 0 : Number((totalRiskScore / total).toFixed(2)),
        most_common_gender: topGender,
        most_common_occupation: topOccupation
    }];
}

// ============================================================
// SOCIAL RISK ANALYSIS (FIXED - using only existing columns)
// ============================================================

async function socialRiskAnalysis(zcql) {
    const query = `
        SELECT 
            address,
            risk_score,
            is_repeat_offender
        FROM accused
    `;

    const result = await zcql.executeZCQLQuery(query);

    const cityStats = {};

    for (const row of result) {
        const accused = row.accused;
        const city = accused.address || 'Unknown';

        if (!cityStats[city]) {
            cityStats[city] = {
                city,
                total_accused: 0,
                repeat_offenders: 0,
                total_risk_score: 0
            };
        }

        cityStats[city].total_accused++;
        if (accused.is_repeat_offender) {
            cityStats[city].repeat_offenders++;
        }
        cityStats[city].total_risk_score += Number(accused.risk_score || 0);
    }

    return Object.values(cityStats)
        .map(data => ({
            city: data.city,
            total_accused: data.total_accused,
            repeat_offenders: data.repeat_offenders,
            average_risk_score: data.total_accused === 0 ? 0 :
                Number((data.total_risk_score / data.total_accused).toFixed(2))
        }))
        .sort((a, b) => b.average_risk_score - a.average_risk_score);
}