"use strict";

const TABLES = require("../constants/tableNames");
const logger = require("../utils/logger");

/**
 * Executes a ZCQL query.
 */
async function executeQuery(zcql, query) {
    try {
        return await zcql.executeZCQLQuery(query);
    } catch (err) {
        logger.error(`ZCQL Failed:\n${query}`, err);
        throw err;
    }
}

/**
 * Converts Catalyst ZCQL response into a Map.
 *
 * keyField should be "ROWID".
 */
function buildMap(records, tableName, keyField = "ROWID") {

    const map = new Map();

    records.forEach(record => {

        const row = record[tableName];

        if (!row) return;

        map.set(row[keyField], row);

    });

    return map;

}

/**
 * Loads all FIRs.
 * Returns an array of plain FIR objects.
 */
async function loadFIRs(zcql) {

    logger.info("Loading FIR records...");

    const query = `
        SELECT *
        FROM ${TABLES.FIR}
    `;

    const rows = await executeQuery(zcql, query);

    const firs = rows
        .map(record => record[TABLES.FIR])
        .filter(Boolean);

    logger.info(`Loaded ${firs.length} FIR records`);

    return firs;

}

/**
 * Loads Crime Types.
 */
async function loadCrimeTypes(zcql) {

    logger.info("Loading Crime Types...");

    const query = `
        SELECT *
        FROM ${TABLES.CRIME_TYPE}
    `;

    const rows = await executeQuery(zcql, query);

    const crimeTypeMap = buildMap(
        rows,
        TABLES.CRIME_TYPE
    );

    logger.info(
        `Loaded ${crimeTypeMap.size} Crime Types`
    );

    return crimeTypeMap;

}

/**
 * Loads Locations.
 */
async function loadLocations(zcql) {

    logger.info("Loading Locations...");

    const query = `
        SELECT *
        FROM ${TABLES.LOCATION}
    `;

    const rows = await executeQuery(zcql, query);

    const locationMap = buildMap(
        rows,
        TABLES.LOCATION
    );

    logger.info(
        `Loaded ${locationMap.size} Locations`
    );

    return locationMap;

}

/**
 * Loads Victims and builds:
 * 1. victimMap -> victim_rowid => victim
 * 2. firVictimMap -> fir_rowid => [victim, victim...]
 */
async function loadVictims(zcql) {

    logger.info("Loading Victims...");

    const query = `
        SELECT *
        FROM ${TABLES.FIR_VICTIM}
        INNER JOIN ${TABLES.VICTIM}
        ON ${TABLES.FIR_VICTIM}.victim_rowid = ${TABLES.VICTIM}.ROWID
    `;

    const rows = await executeQuery(zcql, query);

    const victimMap = new Map();
    const firVictimMap = new Map();

    rows.forEach(record => {

        const victim = record[TABLES.VICTIM];
        const relation = record[TABLES.FIR_VICTIM];

        if (!victim || !relation) return;

        victimMap.set(victim.ROWID, victim);

        if (!firVictimMap.has(relation.fir_rowid)) {
            firVictimMap.set(relation.fir_rowid, []);
        }

        firVictimMap
            .get(relation.fir_rowid)
            .push(victim);

    });

    logger.info(`Loaded ${victimMap.size} Victims`);
    logger.info(`Mapped ${firVictimMap.size} FIR → Victim relationships`);

    return {
        victimMap,
        firVictimMap
    };

}

/**
 * Loads Accused and builds:
 * 1. accusedMap
 * 2. firAccusedMap
 */
async function loadAccused(zcql) {

    logger.info("Loading Accused...");

    const query = `
        SELECT *
        FROM ${TABLES.FIR_ACCUSED}
        INNER JOIN ${TABLES.ACCUSED}
        ON ${TABLES.FIR_ACCUSED}.accused_rowid = ${TABLES.ACCUSED}.ROWID
    `;

    const rows = await executeQuery(zcql, query);

    const accusedMap = new Map();
    const firAccusedMap = new Map();

    rows.forEach(record => {

        const accused = record[TABLES.ACCUSED];
        const relation = record[TABLES.FIR_ACCUSED];

        if (!accused || !relation) return;

        accusedMap.set(accused.ROWID, accused);

        if (!firAccusedMap.has(relation.fir_rowid)) {
            firAccusedMap.set(relation.fir_rowid, []);
        }

        firAccusedMap
            .get(relation.fir_rowid)
            .push({
                ...accused,
                role_in_crime: relation.role_in_crime
            });

    });

    logger.info(`Loaded ${accusedMap.size} Accused`);
    logger.info(`Mapped ${firAccusedMap.size} FIR → Accused relationships`);

    return {
        accusedMap,
        firAccusedMap
    };

}

/**
 * Loads Modus Operandi and builds:
 * 1. moMap
 * 2. firMOMap
 */
async function loadModusOperandi(zcql) {

    logger.info("Loading Modus Operandi...");

    const query = `
        SELECT *
        FROM ${TABLES.FIR_MODUS_OPERANDI}
        INNER JOIN ${TABLES.MODUS_OPERANDI}
        ON ${TABLES.FIR_MODUS_OPERANDI}.mo_rowid = ${TABLES.MODUS_OPERANDI}.ROWID
    `;

    const rows = await executeQuery(zcql, query);

    const moMap = new Map();
    const firMOMap = new Map();

    rows.forEach(record => {

        const mo = record[TABLES.MODUS_OPERANDI];
        const relation = record[TABLES.FIR_MODUS_OPERANDI];

        if (!mo || !relation) return;

        moMap.set(mo.ROWID, mo);

        if (!firMOMap.has(relation.fir_rowid)) {
            firMOMap.set(relation.fir_rowid, []);
        }

        firMOMap
            .get(relation.fir_rowid)
            .push(mo);

    });

    logger.info(`Loaded ${moMap.size} Modus Operandi`);
    logger.info(`Mapped ${firMOMap.size} FIR → MO relationships`);

    return {
        moMap,
        firMOMap
    };

}

/**
 * Loads Investigation records.
 * Builds:
 * investigationMap -> fir_rowid => investigation
 */
async function loadInvestigations(zcql) {

    logger.info("Loading Investigations...");

    const query = `
        SELECT *
        FROM ${TABLES.INVESTIGATION}
    `;

    const rows = await executeQuery(zcql, query);

    const investigationMap = new Map();

    rows.forEach(record => {

        const investigation = record[TABLES.INVESTIGATION];

        if (!investigation || !investigation.fir_rowid) {
            return;
        }

        // Keep first investigation for each FIR
        if (!investigationMap.has(investigation.fir_rowid)) {

            investigationMap.set(
                investigation.fir_rowid,
                investigation
            );

        }

    });

    logger.info(
        `Mapped ${investigationMap.size} FIR -> Investigation`
    );

    return investigationMap;

}

/**
 * Loads Evidence.
 * Builds:
 * evidenceMap -> fir_rowid => [evidence...]
 */
async function loadEvidence(zcql) {

    logger.info("Loading Evidence...");

    const query = `
        SELECT *
        FROM ${TABLES.EVIDENCE}
    `;

    const rows = await executeQuery(zcql, query);

    const evidenceMap = new Map();

    rows.forEach(record => {

        const evidence = record[TABLES.EVIDENCE];

        if (!evidence || !evidence.fir_rowid) {
            return;
        }

        if (!evidenceMap.has(evidence.fir_rowid)) {
            evidenceMap.set(
                evidence.fir_rowid,
                []
            );
        }

        evidenceMap
            .get(evidence.fir_rowid)
            .push(evidence);

    });

    logger.info(
        `Mapped Evidence for ${evidenceMap.size} FIRs`
    );

    return evidenceMap;

}

/**
 * Loads existing Feature Store records.
 * Builds:
 * existingFeatureMap -> fir_rowid => feature row
 */
async function loadExistingFeatures(zcql) {

    logger.info("Loading existing ML Features...");

    const query = `
        SELECT *
        FROM ${TABLES.ML_FEATURES}
    `;

    const rows = await executeQuery(zcql, query);

    const featureMap = new Map();

    rows.forEach(record => {

        const feature = record[TABLES.ML_FEATURES];

        if (!feature || !feature.fir_rowid) {
            return;
        }

        featureMap.set(
            feature.fir_rowid,
            feature
        );

    });

    logger.info(
        `Loaded ${featureMap.size} existing feature rows`
    );

    return featureMap;

}

/**
 * Loads every lookup map required by featureBuilder.js
 */
async function loadMaps(catalystApp) {

    logger.info("===================================");
    logger.info("Loading Crime ML Feature Maps...");
    logger.info("===================================");

    const zcql = catalystApp.zcql();

    const [

        firs,

        crimeTypeMap,

        locationMap,

        victimData,

        accusedData,

        moData,

        investigationMap,

        evidenceMap,

        existingFeatureMap

    ] = await Promise.all([

        loadFIRs(zcql),

        loadCrimeTypes(zcql),

        loadLocations(zcql),

        loadVictims(zcql),

        loadAccused(zcql),

        loadModusOperandi(zcql),

        loadInvestigations(zcql),

        loadEvidence(zcql),

        loadExistingFeatures(zcql)

    ]);

    logger.info("===================================");
    logger.info("Crime ML lookup maps ready.");
    logger.info("===================================");

    return {

        firs,

        maps: {

            crimeTypes: crimeTypeMap,

            locations: locationMap,

            victims: victimData.firVictimMap,

            accused: accusedData.firAccusedMap,

            modusOperandi: moData.firMOMap,

            investigations: investigationMap,

            evidence: evidenceMap,

            existingFeatures: existingFeatureMap

        }

    };

}

module.exports = loadMaps;