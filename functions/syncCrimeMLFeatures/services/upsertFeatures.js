"use strict";

const TABLES = require("../constants/tableNames");
const logger = require("../utils/logger");

/**
 * Splits generated features into:
 * - inserts
 * - updates
 * - skips
 */
function classifyFeatures(features, existingFeatureMap) {

    const inserts = [];
    const updates = [];

    let skipped = 0;

    for (const feature of features) {

        feature.last_synced = new Date();
        feature.feature_version = 1;

        const existing =
            existingFeatureMap.get(feature.fir_rowid);

        if (!existing) {

            inserts.push(feature);
            continue;

        }

        if (
            existing.feature_hash === feature.feature_hash
        ) {

            skipped++;
            continue;

        }

        feature.ROWID = existing.ROWID;

        updates.push(feature);

    }

    return {

        inserts,

        updates,

        skipped

    };

}

/**
 * Inserts new feature records.
 */
async function insertFeatures(
    table,
    features,
    existingFeatureMap
) {

    let inserted = 0;

    for (const feature of features) {

        try {

            const row = await table.insertRow({
                ...feature
            });

            inserted++;

            // Keep in-memory map synchronized
            existingFeatureMap.set(
                feature.fir_rowid,
                {
                    ...feature,
                    ROWID: row.ROWID
                }
            );

        } catch (err) {

            logger.error(
                `Failed to insert FIR ${feature.fir_rowid}`,
                err
            );

        }

    }

    return inserted;

}

/**
 * Updates existing feature records.
 */
async function updateFeatures(
    table,
    features,
    existingFeatureMap
) {

    let updated = 0;

    for (const feature of features) {

        try {

            await table.updateRow({
                ...feature
            });

            updated++;

            // Keep in-memory map synchronized
            existingFeatureMap.set(
                feature.fir_rowid,
                {
                    ...feature
                }
            );

        } catch (err) {

            logger.error(
                `Failed to update FIR ${feature.fir_rowid}`,
                err
            );

        }

    }

    return updated;

}

/**
 * Synchronizes generated feature objects
 * with crime_ml_features table.
 */
async function upsertFeatures(
    catalystApp,
    features,
    existingFeatureMap
) {

    logger.info("Starting Feature Store synchronization...");

    const datastore = catalystApp.datastore();

    const table = datastore.table(TABLES.ML_FEATURES);

    const {
        inserts,
        updates,
        skipped
    } = classifyFeatures(
        features,
        existingFeatureMap
    );

    logger.info(
        `Insert Queue : ${inserts.length}`
    );

    logger.info(
        `Update Queue : ${updates.length}`
    );

    logger.info(
        `Skipped      : ${skipped}`
    );

    const inserted = await insertFeatures(
        table,
        inserts,
        existingFeatureMap
    );

    const updated = await updateFeatures(
        table,
        updates,
        existingFeatureMap
    );

    logger.info("Feature synchronization completed.");

    return {

        processed:
            features.length,

        inserted,

        updated,

        skipped

    };

}

module.exports = upsertFeatures;