"use strict";

const express = require("express");
const catalyst = require("zcatalyst-sdk-node");

const loadMaps = require("./services/loadMaps");
const buildFeature = require("./services/featureBuilder");
const upsertFeatures = require("./services/upsertFeatures");
const logger = require("./utils/logger");

const app = express();

app.use(express.json());

const BATCH_SIZE = 500;


app.post("/sync", async (req, res) => {

    try {

        logger.info("===================================");
        logger.info("Crime ML Feature Synchronization Started");
        logger.info("===================================");

        const catalystApp = catalyst.initialize(req, {
            type: catalyst.type.applogic
        });

        const {
            firs,
            maps
        } = await loadMaps(catalystApp);

        logger.info(`Total FIRs Loaded : ${firs.length}`);

        let batch = [];

        const summary = {

            processed: 0,

            inserted: 0,

            updated: 0,

            skipped: 0

        };

        // Build features and sync in batches
		for (const fir of firs) {

			try {

				const feature = buildFeature(
					fir,
					maps
				);

				batch.push(feature);

				if (batch.length >= BATCH_SIZE) {

					const result = await upsertFeatures(
						catalystApp,
						batch,
						maps.existingFeatures
					);

					summary.processed += result.processed;
					summary.inserted += result.inserted;
					summary.updated += result.updated;
					summary.skipped += result.skipped;

					logger.info(
						`Processed ${summary.processed}/${firs.length} FIRs`
					);

					batch = [];

				}

			} catch (err) {

				logger.error(
					`Failed to build features for FIR ${fir.fir_number || fir.ROWID}`,
					err
				);

				// Continue with the next FIR
				continue;

			}

		}

        if (batch.length > 0) {

            const result = await upsertFeatures(
                catalystApp,
                batch,
                maps.existingFeatures
            );

            summary.processed += result.processed;
            summary.inserted += result.inserted;
            summary.updated += result.updated;
            summary.skipped += result.skipped;

        }

        logger.info("===================================");
        logger.info("Crime ML Feature Synchronization Completed");
        logger.info(summary);
        logger.info("===================================");

        return res.status(200).json({

            success: true,

            message: "Crime ML Feature Synchronization Completed Successfully.",

            statistics: summary

        });

    } catch (err) {

        logger.error(
            "Crime ML Feature Synchronization Failed",
            err
        );

        return res.status(500).json({

            success: false,

            message: "Crime ML Feature Synchronization Failed.",

            error: err.message

        });

    }

});

app.get("/", (req, res) => {

    res.status(200).send(
        "Crime ML Feature Sync Service is running."
    );

});

module.exports = app;