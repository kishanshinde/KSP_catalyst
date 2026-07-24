'use strict';

const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    try {
        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', async () => {
            try {
                const data = body ? JSON.parse(body) : {};
                const action = data.action || 'get_full_network';
                const params = data.params || {};

                let result;

                switch (action) {
                    case 'get_full_network':
                        result = await getFullNetwork(zcql, params);
                        break;
                    case 'get_summary':
                        result = await getSummary(zcql, params);
                        break;
                    case 'get_network_metrics':
                        result = await getNetworkMetrics(zcql, params);
                        break;
                    case 'find_shortest_path':
                        result = await findShortestPath(zcql, params);
                        break;
                    case 'identify_key_actors':
                        result = await identifyKeyActors(zcql, params);
                        break;
                    case 'detect_communities':
                        result = await detectCommunities(zcql, params);
                        break;
                    default:
                        throw new Error(`Unknown action: ${action}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, ...result }));

            } catch (err) {
                console.error('[criminal-network-analysis] Error:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
};

// ============================================================
// SAFE ROW ACCESS HELPER
// ZCQL returns flat objects for simple queries (row.column)
// and nested objects for JOINs (row.tableName.column)
// ============================================================

function getRow(row, tableName) {
    if (!row) return {};
    if (row[tableName] && typeof row[tableName] === 'object') {
        return row[tableName];
    }
    // ZCQL wraps results in the SQL alias (e.g. fa, fv, fm) not the table name
    for (const val of Object.values(row)) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            return val;
        }
    }
    return row;
}

// ============================================================
// SAFE STRING HELPER
// ============================================================

function safeString(value) {
    if (!value) return '';
    return String(value).replace(/'/g, "''");
}

// ============================================================
// BUILD FULL NETWORK GRAPH
// ============================================================

async function getFullNetwork(zcql, params = {}) {
    const accusedRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, full_name, gender, dob, occupation, address, phone_number, aadhaar_masked, risk_score, is_repeat_offender FROM accused`
    );

    const victimRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, full_name, gender, dob, occupation, address, phone_number FROM victim`
    );

    const firRows = await zcql.executeZCQLQuery(
        `SELECT f.ROWID, f.fir_number, f.status, f.date_registered, f.priorites, f.description, f.investigating_officer,
                l.city, l.district, l.taluk, l.pincode, l.latitude, l.longitude, c.crime_name, c.parent_category, c.severity_score
         FROM fir f
         LEFT JOIN location l ON l.ROWID = f.location_rowid
         LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid`
    );

    const firAccusedRows = await zcql.executeZCQLQuery(
        `SELECT fa.fir_rowid, fa.accused_rowid, fa.role_in_crime FROM fir_accused fa`
    );

    const firVictimRows = await zcql.executeZCQLQuery(
        `SELECT fv.fir_rowid, fv.victim_rowid FROM fir_victim fv`
    );

    const moRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, mo_name, description FROM modus_operandi`
    );

    const firMORows = await zcql.executeZCQLQuery(
        `SELECT fm.fir_rowid, fm.mo_rowid FROM fir_modus_operandi fm`
    );

    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    console.log(`[CNA] accusedRows: ${accusedRows.length}, victimRows: ${victimRows.length}, firRows: ${firRows.length}`);
    console.log(`[CNA] firAccusedRows: ${firAccusedRows.length}, firVictimRows: ${firVictimRows.length}, moRows: ${moRows.length}, firMORows: ${firMORows.length}`);
    if (accusedRows.length > 0) console.log(`[CNA] accused sample:`, JSON.stringify(accusedRows[0]));
    if (firAccusedRows.length > 0) console.log(`[CNA] firAccused sample:`, JSON.stringify(firAccusedRows[0]));
    if (firRows.length > 0) console.log(`[CNA] fir sample:`, JSON.stringify(firRows[0]));

    // Accused nodes
    for (const row of accusedRows) {
        const a = getRow(row, 'accused');
        const node = {
            id: `accused_${a.ROWID}`,
            label: a.full_name,
            type: 'accused',
            risk_score: Number(a.risk_score || 0),
            is_repeat_offender: a.is_repeat_offender || false,
            gender: a.gender || 'Unknown',
            dob: a.dob || 'Unknown',
            occupation: a.occupation || 'Unknown',
            address: a.address || 'Unknown',
            phone_number: a.phone_number || 'Unknown',
            aadhaar_masked: a.aadhaar_masked || 'Unknown',
            communityId: null,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    }

    // Victim nodes
    for (const row of victimRows) {
        const v = getRow(row, 'victim');
        const node = {
            id: `victim_${v.ROWID}`,
            label: v.full_name,
            type: 'victim',
            gender: v.gender || 'Unknown',
            dob: v.dob || 'Unknown',
            occupation: v.occupation || 'Unknown',
            address: v.address || 'Unknown',
            phone_number: v.phone_number || 'Unknown',
            communityId: null,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    }

    // FIR nodes
    for (const row of firRows) {
        const f = row.f || row;
        const loc = row.l || {};
        const crime = row.c || {};
        const node = {
            id: `fir_${f.ROWID}`,
            label: f.fir_number,
            type: 'fir',
            status: f.status || 'Unknown',
            date_registered: f.date_registered || null,
            description: f.description || '',
            investigating_officer: f.investigating_officer || 'Unknown',
            crime_name: crime.crime_name || 'Unknown',
            parent_category: crime.parent_category || 'Unknown',
            severity_score: crime.severity_score || null,
            city: loc.city || 'Unknown',
            district: loc.district || 'Unknown',
            priority: f.priorites || 'Unknown',
            communityId: null,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    }

    // Location nodes (deduplicated by city)
    const locationMap = new Map();
    for (const row of firRows) {
        const loc = row.l || {};
        const city = loc.city;
        const district = loc.district;
        if (!city && !district) continue;
        const locKey = city || district;
        if (!locationMap.has(locKey)) {
            const locNode = {
                id: `location_${locKey}`,
                label: locKey,
                type: 'location',
                district: district || 'Unknown',
                taluk: loc.taluk || 'Unknown',
                pincode: loc.pincode || 'Unknown',
                latitude: loc.latitude || null,
                longitude: loc.longitude || null,
                fir_count: 0,
                communityId: null,
            };
            locationMap.set(locKey, locNode);
            nodes.push(locNode);
            nodeMap.set(locNode.id, locNode);
        }
        locationMap.get(locKey).fir_count++;
    }

    // MO nodes
    for (const row of moRows) {
        const m = getRow(row, 'modus_operandi');
        const node = {
            id: `mo_${m.ROWID}`,
            label: m.mo_name,
            type: 'mo',
            description: m.description || '',
            fir_count: 0,
            communityId: null,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    }

    // Edges: FIR ↔ Accused
    const edgeSet = new Set();
    for (const row of firAccusedRows) {
        const fa = getRow(row, 'fir_accused');
        const src = `accused_${fa.accused_rowid}`;
        const tgt = `fir_${fa.fir_rowid}`;
        if (nodeMap.has(src) && nodeMap.has(tgt)) {
            const ek = `${src}->${tgt}`;
            if (!edgeSet.has(ek)) {
                edges.push({
                    source: src,
                    target: tgt,
                    type: 'ACCUSED_OF',
                    label: fa.role_in_crime || 'Accused',
                });
                edgeSet.add(ek);
            }
        }
    }

    // Edges: FIR ↔ Victim
    for (const row of firVictimRows) {
        const fv = getRow(row, 'fir_victim');
        const src = `victim_${fv.victim_rowid}`;
        const tgt = `fir_${fv.fir_rowid}`;
        if (nodeMap.has(src) && nodeMap.has(tgt)) {
            const ek = `${src}->${tgt}`;
            if (!edgeSet.has(ek)) {
                edges.push({ source: src, target: tgt, type: 'VICTIM_OF', label: 'Victim' });
                edgeSet.add(ek);
            }
        }
    }

    // Edges: FIR ↔ Location
    for (const row of firRows) {
        const f = row.f || row;
        const loc = row.l || {};
        const firId = `fir_${f.ROWID}`;
        const locKey = loc.city || loc.district;
        const locId = `location_${locKey}`;
        if (locKey && nodeMap.has(firId) && nodeMap.has(locId)) {
            const ek = `${firId}->${locId}`;
            if (!edgeSet.has(ek)) {
                edges.push({ source: firId, target: locId, type: 'LOCATED_AT', label: 'Occurred at' });
                edgeSet.add(ek);
            }
        }
    }

    // Edges: FIR ↔ MO
    for (const row of firMORows) {
        const fm = getRow(row, 'fir_modus_operandi');
        const firId = `fir_${fm.fir_rowid}`;
        const moId = `mo_${fm.mo_rowid}`;
        if (nodeMap.has(firId) && nodeMap.has(moId)) {
            const ek = `${firId}->${moId}`;
            if (!edgeSet.has(ek)) {
                edges.push({ source: firId, target: moId, type: 'USES_MO', label: 'Uses MO' });
                edgeSet.add(ek);
                const moNode = nodeMap.get(moId);
                if (moNode) moNode.fir_count++;
            }
        }
    }

    // Derived Edges: CO_ACCUSED (accused who share FIRs)
    const accusedToFIRs = new Map();
    for (const row of firAccusedRows) {
        const fa = getRow(row, 'fir_accused');
        const accId = `accused_${fa.accused_rowid}`;
        const firId = `fir_${fa.fir_rowid}`;
        if (!accusedToFIRs.has(accId)) accusedToFIRs.set(accId, new Set());
        accusedToFIRs.get(accId).add(firId);
    }

    const coAccusedPairs = new Set();
    for (const [acc1, firs1] of accusedToFIRs) {
        for (const [acc2, firs2] of accusedToFIRs) {
            if (acc1 >= acc2) continue;
            const shared = [...firs1].filter(f => firs2.has(f));
            if (shared.length > 0) {
                const ek = `${acc1}<->${acc2}`;
                if (!coAccusedPairs.has(ek)) {
                    coAccusedPairs.add(ek);
                    edges.push({
                        source: acc1,
                        target: acc2,
                        type: 'CO_ACCUSED',
                        label: `Co-accused (${shared.length} shared FIR${shared.length > 1 ? 's' : ''})`,
                        shared_firs: shared.length,
                    });
                }
            }
        }
    }

    // Derived Edges: SHARED_LOCATION (accused in same city via FIR location)
    const accusedLocations = new Map();
    for (const row of firAccusedRows) {
        const fa = getRow(row, 'fir_accused');
        const accId = `accused_${fa.accused_rowid}`;
        const firId = `fir_${fa.fir_rowid}`;
        const firNode = nodeMap.get(firId);
        if (firNode && firNode.city && firNode.city !== 'Unknown') {
            if (!accusedLocations.has(accId)) accusedLocations.set(accId, new Set());
            accusedLocations.get(accId).add(firNode.city);
        }
    }

    const sharedLocationPairs = new Set();
    for (const [acc1, locs1] of accusedLocations) {
        for (const [acc2, locs2] of accusedLocations) {
            if (acc1 >= acc2) continue;
            const shared = [...locs1].filter(l => locs2.has(l));
            if (shared.length > 0) {
                const ek = `shared_loc_${acc1}<->${acc2}`;
                if (!sharedLocationPairs.has(ek)) {
                    sharedLocationPairs.add(ek);
                    edges.push({
                        source: acc1,
                        target: acc2,
                        type: 'SHARED_LOCATION',
                        label: `Same area (${shared.join(', ')})`,
                        shared_locations: shared,
                    });
                }
            }
        }
    }

    // Search / Focus logic
    console.log(`[CNA] Nodes: ${nodes.length}, Edges: ${edges.length}`);
    if (params.search_type && params.search_query) {
        const query = params.search_query.toLowerCase();
        let centerNode = null;

        if (params.search_type === 'name') {
            const matches = nodes.filter(n =>
                (n.type === 'accused' || n.type === 'victim') &&
                n.label.toLowerCase().includes(query)
            );
            if (matches.length > 0) {
                centerNode = matches[0];
                for (let i = 1; i < matches.length; i++) {
                    const other = matches[i];
                    for (const edge of edges) {
                        if (edge.source === other.id) edge.source = centerNode.id;
                        if (edge.target === other.id) edge.target = centerNode.id;
                    }
                    const idx = nodes.findIndex(n => n.id === other.id);
                    if (idx > -1) nodes.splice(idx, 1);
                }
            }
        } else if (params.search_type === 'fir_number') {
            centerNode = nodes.find(n =>
                n.type === 'fir' &&
                n.label.toLowerCase().includes(query)
            );
        } else if (params.search_type === 'location') {
            centerNode = nodes.find(n =>
                n.type === 'location' &&
                n.label.toLowerCase().includes(query)
            );
        }

        if (centerNode) {
            centerNode.type = 'central';

            let depth;
            if (params.depth) {
                depth = Number(params.depth);
            } else {
                depth = 2; // Default to depth 2 to reach Locations, Victims, and MOs via FIRs
            }

            const reachable = bfsReachable(centerNode.id, edges, depth);
            const filteredNodes = nodes.filter(n => reachable.has(n.id) || n.id === centerNode.id);
            const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
            const filteredEdges = edges.filter(e =>
                filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
            );
            return buildGraphResponse(filteredNodes, filteredEdges, params);
        }
    }

    // Legacy support: accused_name focus
    if (params.accused_name) {
        const name = params.accused_name.toLowerCase();
        const matches = nodes.filter(n => n.type === 'accused' && n.label.toLowerCase().includes(name));
        if (matches.length > 0) {
            const central = matches[0];
            central.type = 'central';
            
            for (let i = 1; i < matches.length; i++) {
                const other = matches[i];
                for (const edge of edges) {
                    if (edge.source === other.id) edge.source = central.id;
                    if (edge.target === other.id) edge.target = central.id;
                }
                const idx = nodes.findIndex(n => n.id === other.id);
                if (idx > -1) nodes.splice(idx, 1);
            }

            const depth = params.depth || 2; // Depth 2 to reach Locations, Victims, MOs
            const reachable = bfsReachable(central.id, edges, depth);
            const filteredNodes = nodes.filter(n => reachable.has(n.id) || n.id === central.id);
            const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
            const filteredEdges = edges.filter(e =>
                filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
            );
            return buildGraphResponse(filteredNodes, filteredEdges, params);
        }
    }

    return buildGraphResponse(nodes, edges, params);
}

// ============================================================
// GET SUMMARY (lightweight dashboard data)
// ============================================================

async function getSummary(zcql, params = {}) {
    const accusedRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, full_name, gender, occupation, risk_score, is_repeat_offender FROM accused`
    );

    const firRows = await zcql.executeZCQLQuery(
        `SELECT f.ROWID, f.fir_number, f.status, c.crime_name
         FROM fir f
         LEFT JOIN crime_type_master c ON c.ROWID = f.crime_type_rowid`
    );

    const firAccusedRows = await zcql.executeZCQLQuery(
        `SELECT fa.fir_rowid, fa.accused_rowid, fa.role_in_crime FROM fir_accused fa`
    );

    // Build accused lookup and degree count
    const accusedMap = new Map();
    const accusedDegree = new Map();

    for (const row of accusedRows) {
        const a = getRow(row, 'accused');
        const id = `accused_${a.ROWID}`;
        accusedMap.set(id, {
            id,
            label: a.full_name,
            type: 'accused',
            risk_score: Number(a.risk_score || 0),
            is_repeat_offender: a.is_repeat_offender || false,
            gender: a.gender || 'Unknown',
            occupation: a.occupation || 'Unknown',
        });
        accusedDegree.set(id, 0);
    }

    // Count FIRs per accused
    for (const row of firAccusedRows) {
        const fa = getRow(row, 'fir_accused');
        const accId = `accused_${fa.accused_rowid}`;
        if (accusedDegree.has(accId)) {
            accusedDegree.set(accId, accusedDegree.get(accId) + 1);
        }
    }

    // Top actors by degree (number of FIRs)
    const topActors = [...accusedMap.values()]
        .map(a => ({
            ...a,
            degree: accusedDegree.get(a.id) || 0,
            composite_score: computeCompositeScoreSimple(a, accusedDegree),
        }))
        .sort((a, b) => b.composite_score - a.composite_score)
        .slice(0, 10);

    // Crime type distribution
    const crimeTypes = {};
    for (const row of firRows) {
        const crime = row.c || {};
        const crimeName = crime.crime_name || 'Unknown';
        crimeTypes[crimeName] = (crimeTypes[crimeName] || 0) + 1;
    }
    const dominantCrimeType = Object.entries(crimeTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
        topActors,
        totalActors: accusedMap.size,
        totalFIRs: firRows.length,
        totalCrimeTypes: Object.keys(crimeTypes).length,
        dominantCrimeTypes: dominantCrimeType,
    };
}

function computeCompositeScoreSimple(node, degreeMap) {
    const deg = degreeMap.get(node.id) || 0;
    const maxDeg = Math.max(...degreeMap.values(), 1);
    const normDeg = deg / maxDeg;
    const risk = (node.risk_score || 0) / 100;
    return Number((0.4 * normDeg + 0.35 * risk + 0.25 * (node.is_repeat_offender ? 1 : 0)).toFixed(4));
}

// ============================================================
// BFS REACHABLE (for depth limiting)
// ============================================================

function bfsReachable(startId, edges, maxDepth) {
    const adj = new Map();
    for (const e of edges) {
        // Skip weak/broad edges that bloat the BFS
        if (e.type === 'SHARED_LOCATION') continue; 
        // Skip direct co-accused edges to prevent BFS from reaching their other FIRs
        if (e.type === 'CO_ACCUSED') continue;
        
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
    }

    const visited = new Map();
    const queue = [[startId, 0]];
    visited.set(startId, 0);

    while (queue.length > 0) {
        const [current, depth] = queue.shift();
        if (depth >= maxDepth) continue;
        for (const neighbor of (adj.get(current) || [])) {
            if (!visited.has(neighbor) || visited.get(neighbor) > depth + 1) {
                visited.set(neighbor, depth + 1);
                queue.push([neighbor, depth + 1]);
            }
        }
    }

    return new Set(visited.keys());
}

// ============================================================
// BUILD GRAPH RESPONSE WITH METRICS
// ============================================================

function buildGraphResponse(nodes, edges, params) {
    const adj = buildAdjacencyList(nodes, edges);

    // Degree centrality
    const degreeCentrality = {};
    const n = nodes.length;
    for (const node of nodes) {
        const deg = (adj.get(node.id) || []).length;
        degreeCentrality[node.id] = n > 1 ? deg / (n - 1) : 0;
    }

    // Community detection (label propagation)
    const communities = labelPropagation(nodes, adj);

    // Assign community IDs to nodes
    for (const node of nodes) {
        node.communityId = communities.assignment[node.id] || null;
    }

    // Betweenness centrality (simplified Brandes)
    const betweenness = computeBetweennessCentrality(nodes, adj);

    // Key actors (composite score)
    const keyActors = nodes
        .filter(n => n.type === 'accused' || n.type === 'central')
        .map(n => ({
            ...n,
            degree_centrality: degreeCentrality[n.id] || 0,
            betweenness_centrality: betweenness[n.id] || 0,
            composite_score: computeCompositeScore(n, degreeCentrality, betweenness),
            role: classifyActorRole(n, degreeCentrality, betweenness),
        }))
        .sort((a, b) => b.composite_score - a.composite_score);

    // Stats
    const density = n > 1 ? (2 * edges.length) / (n * (n - 1)) : 0;
    const components = findConnectedComponents(nodes, adj);

    return {
        nodes,
        edges,
        metrics: {
            totalNodes: n,
            totalEdges: edges.length,
            density: Number(density.toFixed(4)),
            totalComponents: components.length,
            componentSizes: components.map(c => c.length).sort((a, b) => b - a),
            topActors: keyActors.slice(0, 10),
        },
        communities: communities.groups,
    };
}

// ============================================================
// ADJACENCY LIST BUILDER
// ============================================================

function buildAdjacencyList(nodes, edges) {
    const adj = new Map();
    for (const node of nodes) {
        adj.set(node.id, []);
    }
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        if (!adj.has(edge.target)) adj.set(edge.target, []);
        adj.get(edge.source).push(edge.target);
        adj.get(edge.target).push(edge.source);
    }
    return adj;
}

// ============================================================
// LABEL PROPAGATION COMMUNITY DETECTION
// ============================================================

function labelPropagation(nodes, adj) {
    const assignment = {};
    for (let i = 0; i < nodes.length; i++) {
        assignment[nodes[i].id] = i;
    }

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 50) {
        changed = false;
        iterations++;
        for (const node of nodes) {
            const neighbors = adj.get(node.id) || [];
            if (neighbors.length === 0) continue;

            const counts = {};
            for (const n of neighbors) {
                const c = assignment[n];
                counts[c] = (counts[c] || 0) + 1;
            }

            let maxCount = 0;
            let maxLabel = assignment[node.id];
            for (const [label, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    maxLabel = Number(label);
                }
            }

            if (maxLabel !== assignment[node.id]) {
                assignment[node.id] = maxLabel;
                changed = true;
            }
        }
    }

    const groups = {};
    for (const node of nodes) {
        const c = assignment[node.id];
        if (!groups[c]) groups[c] = [];
        groups[c].push(node);
    }

    return { assignment, groups };
}

// ============================================================
// BETWEENNESS CENTRALITY (Simplified Brandes)
// ============================================================

function computeBetweennessCentrality(nodes, adj) {
    const betweenness = {};
    for (const node of nodes) {
        betweenness[node.id] = 0;
    }

    const nodeIds = nodes.map(n => n.id);

    for (const source of nodeIds) {
        const stack = [];
        const predecessors = {};
        const sigma = {};
        const delta = {};
        const dist = {};

        for (const id of nodeIds) {
            predecessors[id] = [];
            sigma[id] = 0;
            delta[id] = 0;
            dist[id] = -1;
        }

        dist[source] = 0;
        sigma[source] = 1;
        const queue = [source];

        while (queue.length > 0) {
            const v = queue.shift();
            stack.push(v);
            for (const w of (adj.get(v) || [])) {
                if (dist[w] < 0) {
                    dist[w] = dist[v] + 1;
                    queue.push(w);
                }
                if (dist[w] === dist[v] + 1) {
                    sigma[w] += sigma[v];
                    predecessors[w].push(v);
                }
            }
        }

        while (stack.length > 0) {
            const w = stack.pop();
            for (const v of predecessors[w]) {
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
            }
            if (w !== source) {
                betweenness[w] += delta[w];
            }
        }
    }

    // Normalize
    const n = nodes.length;
    const norm = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1;
    for (const id of nodeIds) {
        betweenness[id] = Number((betweenness[id] * norm).toFixed(4));
    }

    return betweenness;
}

// ============================================================
// COMPOSITE SCORE & ROLE CLASSIFICATION
// ============================================================

function computeCompositeScore(node, degree, betweenness) {
    const deg = degree[node.id] || 0;
    const bet = betweenness[node.id] || 0;
    const risk = (node.risk_score || 0) / 100;
    return Number((0.3 * bet + 0.3 * deg + 0.25 * risk + 0.15 * (node.is_repeat_offender ? 1 : 0)).toFixed(4));
}

function classifyActorRole(node, degree, betweenness) {
    const deg = degree[node.id] || 0;
    const bet = betweenness[node.id] || 0;

    if (bet > 0.2 && deg > 0.15) return 'LEADER';
    if (bet > 0.2) return 'BROKER';
    if (deg > 0.2) return 'HUB';
    if (node.is_repeat_offender) return 'HABITUAL';
    return 'MEMBER';
}

// ============================================================
// CONNECTED COMPONENTS (BFS)
// ============================================================

function findConnectedComponents(nodes, adj) {
    const visited = new Set();
    const components = [];

    for (const node of nodes) {
        if (visited.has(node.id)) continue;
        const component = [];
        const queue = [node.id];
        visited.add(node.id);

        while (queue.length > 0) {
            const current = queue.shift();
            component.push(current);
            for (const neighbor of (adj.get(current) || [])) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        components.push(component);
    }

    return components;
}

// ============================================================
// GET NETWORK METRICS (for existing graph data)
// ============================================================

async function getNetworkMetrics(zcql, params) {
    const graphResult = await getFullNetwork(zcql, params);
    return {
        nodes: graphResult.nodes,
        edges: graphResult.edges,
        metrics: graphResult.metrics,
        communities: graphResult.communities,
    };
}

// ============================================================
// FIND SHORTEST PATH (BFS)
// ============================================================

async function findShortestPath(zcql, params) {
    const sourceName = params.accused_name || params.source;
    const targetName = params.target_name || params.target;

    if (!sourceName || !targetName) {
        throw new Error('Both source and target accused names are required');
    }

    const graphResult = await getFullNetwork(zcql, { depth: 5 });

    const sourceNode = graphResult.nodes.find(n =>
        n.type !== 'location' && n.type !== 'mo' &&
        n.label.toLowerCase().includes(sourceName.toLowerCase())
    );
    const targetNode = graphResult.nodes.find(n =>
        n.type !== 'location' && n.type !== 'mo' &&
        n.label.toLowerCase().includes(targetName.toLowerCase()) &&
        n.id !== sourceNode?.id
    );

    if (!sourceNode || !targetNode) {
        return { found: false, message: 'One or both persons not found in the network' };
    }

    const adj = buildAdjacencyList(graphResult.nodes, graphResult.edges);
    const pathIds = bfsFindPath(sourceNode.id, targetNode.id, adj);

    if (!pathIds) {
        return {
            found: false,
            source: sourceNode,
            target: targetNode,
            message: `No connection found between ${sourceNode.label} and ${targetNode.label}`,
        };
    }

    const pathNodes = pathIds.map(id => graphResult.nodes.find(n => n.id === id)).filter(Boolean);
    const pathEdges = [];
    for (let i = 0; i < pathIds.length - 1; i++) {
        const edge = graphResult.edges.find(e =>
            (e.source === pathIds[i] && e.target === pathIds[i + 1]) ||
            (e.target === pathIds[i] && e.source === pathIds[i + 1])
        );
        if (edge) pathEdges.push(edge);
    }

    const narrative = buildPathNarrative(pathNodes, pathEdges);

    return {
        found: true,
        source: sourceNode,
        target: targetNode,
        path: pathNodes,
        pathEdges,
        hops: pathIds.length - 1,
        narrative,
    };
}

function bfsFindPath(sourceId, targetId, adj) {
    const visited = new Set();
    const parent = new Map();
    const queue = [sourceId];
    visited.add(sourceId);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current === targetId) {
            const path = [];
            let node = targetId;
            while (node) {
                path.unshift(node);
                node = parent.get(node);
            }
            return path;
        }
        for (const neighbor of (adj.get(current) || [])) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                parent.set(neighbor, current);
                queue.push(neighbor);
            }
        }
    }
    return null;
}

function buildPathNarrative(pathNodes, pathEdges) {
    if (pathNodes.length < 2) return 'Same person.';

    const parts = [];
    for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        parts.push(node.label);
        if (i < pathEdges.length) {
            const edge = pathEdges[i];
            parts.push(`—[${edge.label || edge.type}]→`);
        }
    }
    return parts.join(' ');
}

// ============================================================
// IDENTIFY KEY ACTORS
// ============================================================

async function identifyKeyActors(zcql, params) {
    const graphResult = await getFullNetwork(zcql, params);

    const actors = graphResult.nodes
        .filter(n => n.type === 'accused' || n.type === 'central')
        .map(n => {
            const metrics = graphResult.metrics;
            return {
                ...n,
                degree_centrality: metrics.topActors.find(a => a.id === n.id)?.degree_centrality || 0,
                betweenness_centrality: metrics.topActors.find(a => a.id === n.id)?.betweenness_centrality || 0,
                composite_score: metrics.topActors.find(a => a.id === n.id)?.composite_score || 0,
                role: metrics.topActors.find(a => a.id === n.id)?.role || 'MEMBER',
            };
        })
        .sort((a, b) => b.composite_score - a.composite_score);

    const roleCounts = {};
    for (const actor of actors) {
        roleCounts[actor.role] = (roleCounts[actor.role] || 0) + 1;
    }

    return {
        actors,
        roleCounts,
        totalActors: actors.length,
        topActors: actors.slice(0, 10),
    };
}

// ============================================================
// DETECT COMMUNITIES
// ============================================================

async function detectCommunities(zcql, params) {
    const graphResult = await getFullNetwork(zcql, params);

    const communityDetails = {};
    for (const [commId, commNodes] of Object.entries(graphResult.communities)) {
        const accused = commNodes.filter(n => n.type === 'accused' || n.type === 'central');
        const victims = commNodes.filter(n => n.type === 'victim');
        const firs = commNodes.filter(n => n.type === 'fir');

        const avgRisk = accused.length > 0
            ? accused.reduce((sum, n) => sum + (n.risk_score || 0), 0) / accused.length
            : 0;

        const crimeTypes = {};
        for (const f of firs) {
            if (f.crime_name) crimeTypes[f.crime_name] = (crimeTypes[f.crime_name] || 0) + 1;
        }

        communityDetails[commId] = {
            id: commId,
            size: commNodes.length,
            accused_count: accused.length,
            victim_count: victims.length,
            fir_count: firs.length,
            avg_risk_score: Number(avgRisk.toFixed(2)),
            dominant_crime: Object.entries(crimeTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
            members: commNodes.map(n => ({ id: n.id, label: n.label, type: n.type })),
        };
    }

    return {
        communities: communityDetails,
        totalCommunities: Object.keys(communityDetails).length,
        largestCommunity: Object.values(communityDetails).sort((a, b) => b.size - a.size)[0] || null,
    };
}