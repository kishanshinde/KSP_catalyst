/**
 * Date Utility Functions
 * Used by Feature Builder to derive temporal features.
 */

/**
 * Calculate age from DOB.
 * @param {string|Date} dob
 * @returns {number|null}
 */
function calculateAge(dob) {
    if (!dob) return null;

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--;
    }

    return age;
}

/**
 * Returns crime hour (0-23)
 * @param {string|Date} date
 * @returns {number|null}
 */
function getCrimeHour(date) {
    if (!date) return null;
    return new Date(date).getHours();
}

/**
 * Returns month number (1-12)
 * @param {string|Date} date
 * @returns {number|null}
 */
function getCrimeMonth(date) {
    if (!date) return null;
    return new Date(date).getMonth() + 1;
}

/**
 * Returns weekday name.
 * @param {string|Date} date
 * @returns {string|null}
 */
function getDayOfWeek(date) {
    if (!date) return null;

    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    return days[new Date(date).getDay()];
}

/**
 * Returns true if Saturday or Sunday.
 * @param {string|Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
    if (!date) return false;

    const day = new Date(date).getDay();

    return day === 0 || day === 6;
}

module.exports = {
    calculateAge,
    getCrimeHour,
    getCrimeMonth,
    getDayOfWeek,
    isWeekend
};