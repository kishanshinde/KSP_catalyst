/**
 * Logger Utility
 * Centralized logging for the Crime ML Feature Sync Function.
 */

function getTimestamp() {
    return new Date().toISOString();
}

function info(message, data = null) {
    if (data !== null) {
        console.log(
            `[INFO] ${getTimestamp()} | ${message}`,
            data
        );
    } else {
        console.log(
            `[INFO] ${getTimestamp()} | ${message}`
        );
    }
}

function warn(message, data = null) {
    if (data !== null) {
        console.warn(
            `[WARN] ${getTimestamp()} | ${message}`,
            data
        );
    } else {
        console.warn(
            `[WARN] ${getTimestamp()} | ${message}`
        );
    }
}

function error(message, err = null) {
    if (err) {
        console.error(
            `[ERROR] ${getTimestamp()} | ${message}`,
            err
        );
    } else {
        console.error(
            `[ERROR] ${getTimestamp()} | ${message}`
        );
    }
}

function debug(message, data = null) {
    if (process.env.NODE_ENV !== "production") {
        if (data !== null) {
            console.log(
                `[DEBUG] ${getTimestamp()} | ${message}`,
                data
            );
        } else {
            console.log(
                `[DEBUG] ${getTimestamp()} | ${message}`
            );
        }
    }
}

module.exports = {
    info,
    warn,
    error,
    debug
};