/**
 * Aggregation Utility Functions
 * Used while building ML feature records.
 */

/**
 * Calculate average of numeric values.
 * Ignores null, undefined and NaN.
 *
 * @param {number[]} values
 * @returns {number|null}
 */
function average(values = []) {
    const nums = values.filter(
        value => typeof value === "number" && !isNaN(value)
    );

    if (nums.length === 0) return null;

    const sum = nums.reduce((acc, value) => acc + value, 0);

    return Number((sum / nums.length).toFixed(2));
}

/**
 * Returns the most frequent value.
 * Ignores null, undefined and empty strings.
 *
 * @param {Array} values
 * @returns {*|null}
 */
function mode(values = []) {
    const filtered = values.filter(
        value =>
            value !== null &&
            value !== undefined &&
            value !== ""
    );

    if (filtered.length === 0) return null;

    const frequency = {};

    filtered.forEach(value => {
        frequency[value] = (frequency[value] || 0) + 1;
    });

    let maxCount = 0;
    let result = null;

    for (const key in frequency) {
        if (frequency[key] > maxCount) {
            maxCount = frequency[key];
            result = key;
        }
    }

    return result;
}

/**
 * Counts boolean true values.
 *
 * @param {boolean[]} values
 * @returns {number}
 */
function countTrue(values = []) {
    return values.filter(value => value === true).length;
}

/**
 * Counts non-empty values.
 *
 * @param {Array} values
 * @returns {number}
 */
function countNonEmpty(values = []) {
    return values.filter(
        value =>
            value !== null &&
            value !== undefined &&
            value !== ""
    ).length;
}

/**
 * Returns array length safely.
 *
 * @param {Array} arr
 * @returns {number}
 */
function safeCount(arr = []) {
    return Array.isArray(arr) ? arr.length : 0;
}

/**
 * Returns string or fallback.
 *
 * @param {*} value
 * @param {string|null} fallback
 * @returns {string|null}
 */
function safeString(value, fallback = null) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    return String(value);
}

/**
 * Removes duplicate values.
 *
 * @param {Array} values
 * @returns {Array}
 */
function unique(values = []) {
    return [...new Set(values)];
}

/**
 * Joins values into comma separated string.
 * Removes duplicates and empty values.
 *
 * @param {Array} values
 * @returns {string|null}
 */
function joinUnique(values = []) {
    const uniqueValues = unique(
        values.filter(
            value =>
                value !== null &&
                value !== undefined &&
                value !== ""
        )
    );

    if (uniqueValues.length === 0) {
        return null;
    }

    return uniqueValues.join(", ");
}

module.exports = {
    average,
    mode,
    countTrue,
    countNonEmpty,
    safeCount,
    safeString,
    unique,
    joinUnique
};