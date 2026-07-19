"use strict";

const crypto = require("crypto");

/**
 * Creates SHA256 hash of a feature object.
 */
function generateFeatureHash(feature) {

    // Exclude the hash itself if present
    const { feature_hash, ...payload } = feature;

    return crypto
        .createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");

}

module.exports = {
    generateFeatureHash
};