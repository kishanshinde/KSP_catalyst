"use strict";

const { generateFeatureHash } = require("../utils/hashUtils");

const {
    calculateAge,
    getCrimeHour,
    getCrimeMonth,
    getDayOfWeek,
    isWeekend
} = require("../utils/dateUtils");

const {
    average,
    mode,
    safeCount,
    joinUnique
} = require("../utils/aggregationUtils");

/**
 * Crime related features
 */
function buildCrimeFeatures(fir, maps) {

    const crime =
        maps.crimeTypes.get(fir.crime_type_rowid) || {};

    return {

        // FIR Reference
        fir_rowid:
            fir.ROWID,

        fir_number:
            fir.fir_number || null,

        // Crime Classification
        crime_type:
            crime.crime_name || null,

        parent_category:
            crime.parent_category || null,

        severity_score:
            crime.severity_score || null,

        // FIR Details
        crime_status:
            fir.status || null,

        crime_priority:
            fir.priorites || null,

        // Temporal Features
        crime_date:
            fir.date_registered || null,

        crime_hour:
            getCrimeHour(fir.date_registered),

        day_of_week:
            getDayOfWeek(fir.date_registered),

        crime_month:
            getCrimeMonth(fir.date_registered),

        weekend_flag:
            isWeekend(fir.date_registered)

    };

}

/**
 * Location Features
 */
function buildLocationFeatures(fir, maps) {

    const location =
        maps.locations.get(fir.location_rowid) || {};

    return {

        district:
            location.district || null,

        taluk:
            location.taluk || null,

        city:
            location.city || null,

        latitude:
            location.latitude || null,

        longitude:
            location.longitude || null

    };

}

/**
 * Victim Features
 */
function buildVictimFeatures(fir, maps) {

    const victims =
        maps.victims.get(fir.ROWID) || [];

    const victimAges = victims
        .map(v => calculateAge(v.dob))
        .filter(age => age !== null);

    return {

        victim_count:
            safeCount(victims),

        avg_victim_age:
            average(victimAges),

        predominant_victim_gender:
            mode(
                victims.map(v => v.gender)
            ),

        predominant_victim_occupation:
            mode(
                victims.map(v => v.occupation)
            )

    };

}

/**
 * Accused Features
 */
function buildAccusedFeatures(fir, maps) {

    const accused =
        maps.accused.get(fir.ROWID) || [];

    const accusedAges = accused
        .map(a => calculateAge(a.dob))
        .filter(age => age !== null);

    return {

        accused_count:
            safeCount(accused),

        repeat_offender_count:

            accused.filter(
                a => a.is_repeat_offender === true
            ).length,

        gang_affiliation_count:

            accused.filter(
                a =>
                    a.gang_affiliation !== null &&
                    a.gang_affiliation !== undefined &&
                    a.gang_affiliation !== ""
            ).length,

        avg_accused_age:
            average(accusedAges),

        predominant_accused_gender:
            mode(
                accused.map(a => a.gender)
            ),

        predominant_accused_occupation:
            mode(
                accused.map(a => a.occupation)
            )

    };

}

/**
 * Modus Operandi Features
 */
function buildMOFeatures(fir, maps) {

    const modusOperandi =
        maps.modusOperandi.get(fir.ROWID) || [];

    return {

        modus_operandi_count:
            safeCount(modusOperandi),

        primary_modus_operandi:
            modusOperandi.length > 0
                ? modusOperandi[0].mo_name
                : null,

        all_modus_operandi:
            joinUnique(
                modusOperandi.map(m => m.mo_name)
            )

    };

}

/**
 * Investigation Features
 */
function buildInvestigationFeatures(fir, maps) {

    const investigation =
        maps.investigations.get(fir.ROWID);

    if (!investigation) {

        return {

            investigation_status: null,

            investigation_duration_days: null

        };

    }

    let duration = null;

    if (
        investigation.start_date &&
        investigation.end_date
    ) {

        const start = new Date(investigation.start_date);
        const end = new Date(investigation.end_date);

        duration = Math.round(
            (end - start) / (1000 * 60 * 60 * 24)
        );

    }

    return {

        investigation_status:
            investigation.status || null,

        investigation_duration_days:
            duration

    };

}

/**
 * Evidence Features
 */
function buildEvidenceFeatures(fir, maps) {

    const evidence =
        maps.evidence.get(fir.ROWID) || [];

    return {

        evidence_count:
            safeCount(evidence),

        primary_evidence_type:
            mode(
                evidence.map(e => e.evidence_type)
            ),

        weapon_used:
            mode(
                evidence.map(e => e.weapon_used)
            )

    };

}

/**
 * Builds one ML feature record for a FIR.
 *
 * @param {Object} fir
 * @param {Object} maps
 * @returns {Object}
 */
function buildFeature(fir, maps) {

    const feature = {

        ...buildCrimeFeatures(
            fir,
            maps
        ),

        ...buildLocationFeatures(
            fir,
            maps
        ),

        ...buildVictimFeatures(
            fir,
            maps
        ),

        ...buildAccusedFeatures(
            fir,
            maps
        ),

        ...buildMOFeatures(
            fir,
            maps
        ),

        ...buildInvestigationFeatures(
            fir,
            maps
        ),

        ...buildEvidenceFeatures(
            fir,
            maps
        )

    };

    feature.feature_hash = generateFeatureHash(feature);

    return feature;

}

module.exports = buildFeature;