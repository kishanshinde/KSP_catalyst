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
				if (!data.fir_number && data.query) {
    data.fir_number = extractFirNumber(data.query);
}

if (
    !data.accused_name &&
    data.query &&
    data.intent === "criminal_history"
) {
    data.accused_name = extractAccusedName(data.query);
}
				if (!data.intent) {
    				throw new Error('intent is required');
				}

				if (
    				data.intent === 'criminal_history' &&
    				!data.accused_name
				) {
    				throw new Error('accused_name is required');
				}

                if (
                    data.intent === 'criminal_network' &&
                    !data.accused_name
                ) {
                    throw new Error('accused_name is required');
                }

                if (
                    data.intent === 'criminal_network_graph' &&
                    !data.accused_name
                ) {
                    throw new Error('accused_name is required');
                }

                if (
                    data.intent === 'risk_profile' &&
                    !data.accused_name
                ) {
                    throw new Error('accused_name is required');
                }

				if (
    				(
        				data.intent === 'fir_accused' ||
        				data.intent === 'fir_victims' ||
        				data.intent === 'fir_investigation'
    				) &&
    				!data.fir_number
				) {
    				throw new Error('fir_number is required');
			}

			let result = [];

				switch (data.intent) {

                    case 'search_fir':
                        result = await searchFIR(zcql);
                        break;

                    case 'search_accused':
                        result = await searchAccused(zcql);
                        break;

                    case 'search_victim':
                        result = await searchVictim(zcql);
                        break;

                    case 'search_investigation':
                        result = await searchInvestigation(zcql);
                        break;

                    case 'criminal_history':
                        result = await criminalHistoryV2(
                            zcql,
                            data.accused_name
                        );
                        break;

					case 'fir_accused':
    					result = await getFIRAccused(
        					zcql,
        					data.fir_number
    					);
						console.log(JSON.stringify(result, null, 2));
    					break;

					case 'fir_victims':
    					result = await getFIRVictims(
        					zcql,
        					data.fir_number
    					);
    					break;

					case 'fir_investigation':
    					result = await getFIRInvestigation(
        					zcql,
        					data.fir_number
    					);
    					break;

                    case 'criminal_network':
                        result = await criminalNetwork(
                            zcql,
                            data.accused_name
                        );
                        break;

                    case 'repeat_offenders':
                        result = await repeatOffenders(zcql);
                        break;

                    case 'criminal_network_graph':
                        result = await criminalNetworkGraph(
                            zcql,
                            data.accused_name
                        );
                        break;

                    case 'crime_hotspots':
                        result = await crimeHotspots(zcql);
                        break;

                    case 'crime_type_trends':
                        result = await crimeTypeTrends(zcql);
                        break;

                    case 'monthly_crime_trends':
                        result = await monthlyCrimeTrends(zcql);
                        break;

                    case 'district_crime_analysis':
                        result = await districtCrimeAnalysis(zcql);
                        break;

                    case 'emerging_crime_clusters':
                        result = await emergingCrimeClusters(zcql);
                        break;

                    case 'gender_crime_analysis':
                        result = await genderCrimeAnalysis(zcql);
                        break;

                    case 'education_crime_analysis':
                        result = await educationCrimeAnalysis(zcql);
                        break;

                    case 'migration_crime_analysis':
                        result = await migrationCrimeAnalysis(zcql);
                        break;

                    case 'economic_stress_analysis':
                        result = await economicStressAnalysis(zcql);
                        break;

                    case 'demographic_dashboard':
                        result = await demographicDashboard(zcql);
                        break;

                    case 'repeat_offender_demographics':
                        result = await repeatOffenderDemographics(zcql);
                        break;

                    case 'risk_profile':
                        result = await riskProfile(
                            zcql,
                            data.accused_name
                        );
                        break;

                    case 'social_risk_analysis':
                        result = await socialRiskAnalysis(zcql);
                        break;

                    default:
                        throw new Error('Invalid Intent');
                }

                res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
});

                res.end(JSON.stringify({
                    success: true,
                    count: result.length,
                    results: result
                }));

            } catch (error) {

                res.writeHead(400, {
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
        });

    } catch (error) {

        res.writeHead(500, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
});;

        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
};
function extractFirNumber(text) {

    if (!text) return null;

    const match = text.match(/FIR-\d{4}-\d+/i);

    return match ? match[0] : null;
}

function extractAccusedName(text) {

    if (!text) return null;

    const match = text.match(/criminal history of (.+)/i);

    return match ? match[1].trim() : null;
}
async function searchFIR(zcql) {

    return await zcql.executeZCQLQuery(`
        SELECT ROWID,fir_number
        FROM fir
        LIMIT 20
    `);
}

async function searchAccused(zcql) {

    return await zcql.executeZCQLQuery(`
        SELECT *
        FROM accused
        LIMIT 20
    `);
}

async function searchVictim(zcql) {

    return await zcql.executeZCQLQuery(`
        SELECT *
        FROM victim
        LIMIT 20
    `);
}

async function searchInvestigation(zcql) {

    return await zcql.executeZCQLQuery(`
        SELECT *
        FROM investigation
        LIMIT 20
    `);
}

async function criminalHistoryV2(zcql, accusedName) {

    const query = `
        SELECT
            a.full_name,
            a.is_repeat_offender,
            a.risk_score,
            fa.role_in_crime,
            f.fir_number,
            f.status
        FROM accused a
        JOIN fir_accused fa
        ON a.ROWID = fa.accused_rowid
        JOIN fir f
        ON f.ROWID = fa.fir_rowid
        WHERE a.full_name = '${accusedName}'
    `;

    return await zcql.executeZCQLQuery(query);
}

async function getFIRAccused(zcql, firNumber) {

    return await zcql.executeZCQLQuery(`
        SELECT
            f.fir_number,
            a.full_name,
            a.phone_number,
            a.is_repeat_offender,
            fa.role_in_crime
        FROM fir f
        JOIN fir_accused fa
        ON f.ROWID = fa.fir_rowid
        JOIN accused a
        ON a.ROWID = fa.accused_rowid
        WHERE f.fir_number = '${firNumber}'
    `);
}

async function getFIRVictims(zcql, firNumber) {

    return await zcql.executeZCQLQuery(`
        SELECT
            f.fir_number,
            v.full_name,
            v.gender,
            v.phone_number
        FROM fir f
        JOIN fir_victim fv
        ON f.ROWID = fv.fir_rowid
        JOIN victim v
        ON v.ROWID = fv.victim_rowid
        WHERE f.fir_number = '${firNumber}'
    `);
}

async function getFIRInvestigation(zcql, firNumber) {

    return await zcql.executeZCQLQuery(`
        SELECT
            f.fir_number,
            i.status,
            i.start_date,
            i.end_date
        FROM fir f
        JOIN investigation i
        ON f.ROWID = i.fir_rowid
        WHERE f.fir_number = '${firNumber}'
    `);
}

async function criminalNetwork(zcql, accusedName) {

    const accusedResult = await zcql.executeZCQLQuery(`
        SELECT
            ROWID,
            full_name,
            is_repeat_offender,
            risk_score
        FROM accused
        WHERE full_name = '${accusedName}'
    `);

    if (!accusedResult.length) {
        return [];
    }

    const network = [];

    for (const accusedRow of accusedResult) {

        const accusedId = accusedRow.accused.ROWID;

        const firs = await zcql.executeZCQLQuery(`
            SELECT fir_rowid
            FROM fir_accused
            WHERE accused_rowid = '${accusedId}'
        `);

        const totalFirs = firs.length;

        for (const firRow of firs) {

            const firId = firRow.fir_accused.fir_rowid;

            const associates = await zcql.executeZCQLQuery(`
                SELECT
                    a.full_name,
                    a.ROWID,
                    fa.role_in_crime
                FROM fir_accused fa
                JOIN accused a
                ON a.ROWID = fa.accused_rowid
                WHERE fa.fir_rowid = '${firId}'
            `);

            const firDetails = await zcql.executeZCQLQuery(`
                SELECT
                    f.fir_number,
                    l.city
                FROM fir f
                JOIN location l
                ON l.ROWID = f.location_rowid
                WHERE f.ROWID = '${firId}'
            `);

            const victims = await zcql.executeZCQLQuery(`
                SELECT
                    v.full_name
                FROM fir_victim fv
                JOIN victim v
                ON v.ROWID = fv.victim_rowid
                WHERE fv.fir_rowid = '${firId}'
            `);

            const associateList = associates
                .filter(x => x.a.ROWID !== accusedId)
                .map(x => ({
                    associate_name: x.a.full_name,
                    associate_id: x.a.ROWID,
                    role_in_crime: x.fa.role_in_crime
                }));

            network.push({
                central_accused: accusedRow.accused.full_name,
                central_id: accusedId,

                repeat_offender:
                    accusedRow.accused.is_repeat_offender ||
                    totalFirs > 1,

                total_firs: totalFirs,

                risk_score: accusedRow.accused.risk_score,

                organized_group:
                    associateList.length >= 2,

                associate_count:
                    associateList.length,

                fir_rowid: firId,

                fir_number: firDetails.length
                    ? firDetails[0].f.fir_number
                    : null,

                location: firDetails.length
                    ? firDetails[0].l.city
                    : null,

                victims: victims.map(
                    v => v.v.full_name
                ),

                associates: associateList
            });
        }
    }

    return network;
}

async function repeatOffenders(zcql) {

    return await zcql.executeZCQLQuery(`
        SELECT
            full_name,
            risk_score,
            is_repeat_offender
        FROM accused
        WHERE is_repeat_offender = true
    `);
}

async function criminalNetworkGraph(zcql, accusedName) {

    const accusedResult = await zcql.executeZCQLQuery(`
        SELECT ROWID, full_name
        FROM accused
        WHERE full_name = '${accusedName}'
    `);

    if (!accusedResult.length) {
        return {
            nodes: [],
            edges: []
        };
    }

    const nodes = [];
    const edges = [];

    const addedNodes = new Set();
    const addedEdges = new Set();

    for (const accusedRow of accusedResult) {

        const centralId = accusedRow.accused.ROWID;
        const centralName = accusedRow.accused.full_name;

        if (!addedNodes.has(centralId)) {
            nodes.push({
                id: centralId,
                label: centralName,
                type: "accused"
            });
            addedNodes.add(centralId);
        }

        const firs = await zcql.executeZCQLQuery(`
            SELECT fir_rowid
            FROM fir_accused
            WHERE accused_rowid = '${centralId}'
        `);

        for (const firRow of firs) {

            const firId = firRow.fir_accused.fir_rowid;

            const firDetails = await zcql.executeZCQLQuery(`
                SELECT fir_number
                FROM fir
                WHERE ROWID = '${firId}'
            `);

            const firNumber =
                firDetails.length
                    ? firDetails[0].fir.fir_number
                    : firId;

            if (!addedNodes.has(firId)) {
                nodes.push({
                    id: firId,
                    label: firNumber,
                    type: "fir"
                });
                addedNodes.add(firId);
            }

            const edgeKey = `${centralId}-${firId}`;

            if (!addedEdges.has(edgeKey)) {
                edges.push({
                    source: centralId,
                    target: firId,
                    label: "INVOLVED_IN"
                });

                addedEdges.add(edgeKey);
            }

            const associates = await zcql.executeZCQLQuery(`
                SELECT
                    a.full_name,
                    a.ROWID,
                    fa.role_in_crime
                FROM fir_accused fa
                JOIN accused a
                ON a.ROWID = fa.accused_rowid
                WHERE fa.fir_rowid = '${firId}'
            `);

            for (const associate of associates) {

                const associateId = associate.a.ROWID;

                if (associateId === centralId) {
                    continue;
                }

                if (!addedNodes.has(associateId)) {

                    nodes.push({
                        id: associateId,
                        label: associate.a.full_name,
                        type: "accused"
                    });

                    addedNodes.add(associateId);
                }

                const associateEdge =
                    `${associateId}-${firId}`;

                if (!addedEdges.has(associateEdge)) {

                    edges.push({
                        source: associateId,
                        target: firId,
                        label:
                            associate.fa.role_in_crime
                    });

                    addedEdges.add(associateEdge);
                }
            }
        }
    }

    return {
        nodes,
        edges
    };
}

async function crimeHotspots(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            l.city,
            f.fir_number
        FROM fir f
        JOIN location l
        ON l.ROWID = f.location_rowid
    `);

    const cityCounts = {};

    for (const row of records) {

        const city = row.l.city;

        if (!cityCounts[city]) {
            cityCounts[city] = 0;
        }

        cityCounts[city]++;
    }

    const hotspots = Object.entries(cityCounts)
        .map(([city, count]) => ({
            city,
            crime_count: count,
            hotspot_level:
                count >= 10
                    ? 'HIGH'
                    : count >= 5
                    ? 'MEDIUM'
                    : 'LOW'
        }))
        .sort((a, b) => b.crime_count - a.crime_count);

    return hotspots;
}

async function crimeTypeTrends(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            c.crime_name,
            c.parent_category,
            f.fir_number
        FROM fir f
        JOIN crime_type_master c
        ON c.ROWID = f.crime_type_rowid
    `);

    const crimeCounts = {};

    for (const row of records) {

        const crime = row.c.crime_name;

        if (!crimeCounts[crime]) {

            crimeCounts[crime] = {
                crime_type: crime,
                category: row.c.parent_category,
                count: 0
            };
        }

        crimeCounts[crime].count++;
    }

    return Object.values(crimeCounts)
        .sort((a, b) => b.count - a.count);
}

async function monthlyCrimeTrends(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            date_registered
        FROM fir
    `);

    const monthCounts = {};

    for (const row of records) {

        const date = row.fir.date_registered;

        const month = date.substring(0, 7);

        if (!monthCounts[month]) {
            monthCounts[month] = 0;
        }

        monthCounts[month]++;
    }

    const result = Object.entries(monthCounts)
        .map(([month, count]) => ({
            month,
            crime_count: count
        }))
        .sort((a, b) =>
            a.month.localeCompare(b.month)
        );

    for (let i = 0; i < result.length; i++) {

        if (i === 0) {
            result[i].trend = "BASELINE";
            continue;
        }

        if (
            result[i].crime_count >
            result[i - 1].crime_count
        ) {
            result[i].trend = "UP";
        }
        else if (
            result[i].crime_count <
            result[i - 1].crime_count
        ) {
            result[i].trend = "DOWN";
        }
        else {
            result[i].trend = "STABLE";
        }

        const difference =
            result[i].crime_count -
            result[i - 1].crime_count;

        result[i].change =
            difference > 0
                ? `+${difference}`
                : `${difference}`;
    }

    return result;
}

async function districtCrimeAnalysis(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            l.district,
            f.fir_number
        FROM fir f
        JOIN location l
        ON l.ROWID = f.location_rowid
    `);

    const districtCounts = {};

    for (const row of records) {

        const district = row.l.district;

        if (!districtCounts[district]) {
            districtCounts[district] = 0;
        }

        districtCounts[district]++;
    }

    return Object.entries(districtCounts)
        .map(([district, count]) => ({
            district,
            crime_count: count
        }))
        .sort((a, b) => b.crime_count - a.crime_count);
}

async function emergingCrimeClusters(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            c.crime_name,
            f.date_registered
        FROM fir f
        JOIN crime_type_master c
        ON c.ROWID = f.crime_type_rowid
    `);

    const crimeMonthlyData = {};

    for (const row of records) {

        const crimeType = row.c.crime_name;

        const month =
            row.f.date_registered.substring(0, 7);

        if (!crimeMonthlyData[crimeType]) {
            crimeMonthlyData[crimeType] = {};
        }

        if (!crimeMonthlyData[crimeType][month]) {
            crimeMonthlyData[crimeType][month] = 0;
        }

        crimeMonthlyData[crimeType][month]++;
    }

    const clusters = [];

    for (const crimeType in crimeMonthlyData) {

        const months =
            Object.keys(
                crimeMonthlyData[crimeType]
            ).sort();

        if (months.length < 2) {
            continue;
        }

        const firstMonth =
            crimeMonthlyData[crimeType][months[0]];

        const lastMonth =
            crimeMonthlyData[crimeType][
                months[months.length - 1]
            ];

        let trend = "STABLE";

        if (lastMonth > firstMonth) {
            trend = "RISING";
        }
        else if (lastMonth < firstMonth) {
            trend = "DECLINING";
        }

        const growthPercent =
            firstMonth === 0
                ? 100
                : Number(
                    (
                        ((lastMonth - firstMonth) /
                            firstMonth) *
                        100
                    ).toFixed(2)
                );

        clusters.push({
            crime_type: crimeType,
            first_month: months[0],
            first_month_count: firstMonth,
            latest_month:
                months[months.length - 1],
            latest_month_count: lastMonth,
            trend,
            growth_percent: growthPercent
        });
    }

    return clusters.sort(
        (a, b) =>
            b.growth_percent - a.growth_percent
    );
}

async function genderCrimeAnalysis(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT gender
        FROM accused
    `);

    const counts = {};

    for (const row of records) {

        const gender = row.accused.gender;

        counts[gender] = (counts[gender] || 0) + 1;
    }

    return Object.entries(counts).map(([gender, count]) => ({
        gender,
        count
    }));
}

async function educationCrimeAnalysis(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT education_level
        FROM accused
    `);

    const counts = {};

    for (const row of records) {

        const education = row.accused.education_level;

        counts[education] = (counts[education] || 0) + 1;
    }

    return Object.entries(counts)
        .map(([education_level, count]) => ({
            education_level,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

async function migrationCrimeAnalysis(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT migration_status
        FROM accused
    `);

    const counts = {};

    for (const row of records) {

        const migration = row.accused.migration_status;

        counts[migration] = (counts[migration] || 0) + 1;
    }

    return Object.entries(counts)
        .map(([migration_status, count]) => ({
            migration_status,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

async function economicStressAnalysis(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT income_bracket
        FROM accused
    `);

    const counts = {};

    for (const row of records) {

        const income = row.accused.income_bracket;

        counts[income] = (counts[income] || 0) + 1;
    }

    return Object.entries(counts)
        .map(([income_bracket, count]) => ({
            income_bracket,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

async function demographicDashboard(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            education_level,
            income_bracket,
            migration_status,
            gang_affiliation,
            risk_score,
            is_repeat_offender
        FROM accused
    `);

    const total = records.length;

    let repeatOffenders = 0;
    let gangMembers = 0;
    let totalRiskScore = 0;

    const educationCounts = {};
    const incomeCounts = {};
    const migrationCounts = {};

    for (const row of records) {

        const accused = row.accused;

        if (accused.is_repeat_offender) {
            repeatOffenders++;
        }

        if (
            accused.gang_affiliation &&
            accused.gang_affiliation.toLowerCase() === 'yes'
        ) {
            gangMembers++;
        }

        totalRiskScore += Number(accused.risk_score || 0);

        educationCounts[accused.education_level] =
            (educationCounts[accused.education_level] || 0) + 1;

        incomeCounts[accused.income_bracket] =
            (incomeCounts[accused.income_bracket] || 0) + 1;

        migrationCounts[accused.migration_status] =
            (migrationCounts[accused.migration_status] || 0) + 1;
    }

    const topEducation =
        Object.entries(educationCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topIncome =
        Object.entries(incomeCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topMigration =
        Object.entries(migrationCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    return [{
        total_accused: total,
        repeat_offenders: repeatOffenders,
        gang_affiliated: gangMembers,
        average_risk_score:
            Number((totalRiskScore / total).toFixed(2)),
        top_education: topEducation,
        top_income_group: topIncome,
        top_migration_group: topMigration
    }];
}

async function repeatOffenderDemographics(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            gender,
            occupation,
            education_level,
            income_bracket,
            migration_status,
            risk_score,
            is_repeat_offender
        FROM accused
        WHERE is_repeat_offender = true
    `);

    let totalRiskScore = 0;

    const genderCounts = {};
    const occupationCounts = {};
    const educationCounts = {};
    const incomeCounts = {};
    const migrationCounts = {};

    for (const row of records) {

        const accused = row.accused;

        totalRiskScore += Number(
            accused.risk_score || 0
        );

        genderCounts[accused.gender] =
            (genderCounts[accused.gender] || 0) + 1;

        occupationCounts[accused.occupation] =
            (occupationCounts[accused.occupation] || 0) + 1;

        educationCounts[accused.education_level] =
            (educationCounts[accused.education_level] || 0) + 1;

        incomeCounts[accused.income_bracket] =
            (incomeCounts[accused.income_bracket] || 0) + 1;

        migrationCounts[accused.migration_status] =
            (migrationCounts[accused.migration_status] || 0) + 1;
    }

    const topGender =
        Object.entries(genderCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topOccupation =
        Object.entries(occupationCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topEducation =
        Object.entries(educationCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topIncome =
        Object.entries(incomeCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topMigration =
        Object.entries(migrationCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

    return [{
        repeat_offender_count: records.length,
        average_risk_score:
            Number(
                (
                    totalRiskScore /
                    records.length
                ).toFixed(2)
            ),
        most_common_gender: topGender,
        most_common_occupation: topOccupation,
        most_common_education: topEducation,
        most_common_income_group: topIncome,
        most_common_migration_group: topMigration
    }];
}

async function riskProfile(zcql, accusedName) {

    const accusedRecords = await zcql.executeZCQLQuery(`
        SELECT
            ROWID,
            full_name,
            gender,
            occupation,
            education_level,
            employment_status,
            income_bracket,
            migration_status,
            marital_status,
            substance_abuse_history,
            gang_affiliation,
            financial_distress_score,
            risk_score,
            is_repeat_offender
        FROM accused
        WHERE full_name = '${accusedName}'
    `);

    if (!accusedRecords.length) {

        return [{
            error: 'Accused not found'
        }];
    }

    const accused = accusedRecords[0].accused;

    const firRecords = await zcql.executeZCQLQuery(`
        SELECT
            fir_rowid
        FROM fir_accused
        WHERE accused_rowid='${accused.ROWID}'
    `);

    const totalFirs = firRecords.length;

    const associateMap = {};
    const hotspotLocations = new Set();

    for (const fir of firRecords) {

        const firRowId =
            fir.fir_accused.fir_rowid;

        const associates =
            await zcql.executeZCQLQuery(`
                SELECT
                    a.full_name,
                    a.ROWID
                FROM accused a
                JOIN fir_accused fa
                ON a.ROWID = fa.accused_rowid
                WHERE fa.fir_rowid='${firRowId}'
            `);

        for (const associate of associates) {

            const associateId =
                associate.a.ROWID;

            if (
                associateId !== accused.ROWID
            ) {

                associateMap[
                    associateId
                ] =
                    associate.a.full_name;
            }
        }

        const locationRecords =
            await zcql.executeZCQLQuery(`
                SELECT
                    l.city
                FROM fir f
                JOIN location l
                ON l.ROWID = f.location_rowid
                WHERE f.ROWID='${firRowId}'
            `);

        if (locationRecords.length) {

            hotspotLocations.add(
                locationRecords[0].l.city
            );
        }
    }

    const knownAssociates =
        Object.values(associateMap);

    const associateCount =
        knownAssociates.length;

    const organizedGroupMember =
        associateCount >= 2;

    let threatLevel = 'LOW';

    if (
        Number(accused.risk_score) >= 80 ||
        accused.gang_affiliation === 'Yes'
    ) {

        threatLevel = 'HIGH';
    }
    else if (
        Number(accused.risk_score) >= 60
    ) {

        threatLevel = 'MEDIUM';
    }

    return [{

        name:
            accused.full_name,

        gender:
            accused.gender,

        occupation:
            accused.occupation,

        education_level:
            accused.education_level,

        employment_status:
            accused.employment_status,

        income_bracket:
            accused.income_bracket,

        migration_status:
            accused.migration_status,

        marital_status:
            accused.marital_status,

        substance_abuse_history:
            accused.substance_abuse_history,

        gang_affiliation:
            accused.gang_affiliation,

        financial_distress_score:
            accused.financial_distress_score,

        risk_score:
            accused.risk_score,

        repeat_offender:
            accused.is_repeat_offender,

        total_firs:
            totalFirs,

        criminal_history_count:
            totalFirs,

        known_associates:
            knownAssociates,

        hotspot_locations:
            Array.from(
                hotspotLocations
            ),

        associate_count:
            associateCount,

        organized_group_member:
            organizedGroupMember,

        threat_level:
            threatLevel
    }];
}

async function socialRiskAnalysis(zcql) {

    const records = await zcql.executeZCQLQuery(`
        SELECT
            address,
            risk_score,
            is_repeat_offender,
            gang_affiliation,
            financial_distress_score
        FROM accused
    `);

    const cityStats = {};

    for (const row of records) {

        const accused = row.accused;

        const city =
            accused.address || 'Unknown';

        if (!cityStats[city]) {

            cityStats[city] = {
                city,
                total_accused: 0,
                repeat_offenders: 0,
                gang_members: 0,
                total_risk_score: 0,
                total_financial_distress: 0
            };
        }

        cityStats[city].total_accused++;

        if (
            accused.is_repeat_offender
        ) {
            cityStats[city]
                .repeat_offenders++;
        }

        if (
            accused.gang_affiliation ===
            'Yes'
        ) {
            cityStats[city]
                .gang_members++;
        }

        cityStats[city]
            .total_risk_score +=
            Number(
                accused.risk_score || 0
            );

        cityStats[city]
            .total_financial_distress +=
            Number(
                accused
                .financial_distress_score || 0
            );
    }

    const result = [];

    for (const city in cityStats) {

        const data = cityStats[city];

        result.push({

            city:
                data.city,

            total_accused:
                data.total_accused,

            repeat_offenders:
                data.repeat_offenders,

            gang_members:
                data.gang_members,

            average_risk_score:
                Number(
                    (
                        data.total_risk_score /
                        data.total_accused
                    ).toFixed(2)
                ),

            average_financial_distress:
                Number(
                    (
                        data
                        .total_financial_distress /
                        data.total_accused
                    ).toFixed(2)
                )
        });
    }

    return result.sort(
        (a, b) =>
            b.average_risk_score -
            a.average_risk_score
    );
}