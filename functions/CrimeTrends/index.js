'use strict';

const catalyst = require('zcatalyst-sdk-node');

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];

function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfWeek(date) {
    const d = new Date(startOfWeek(date));
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

function weekLabel(date) {
    const start = startOfWeek(date);
    const end = endOfWeek(date);

    return `${String(start.getDate()).padStart(2, '0')} ${MONTHS[start.getMonth()]} - ${String(end.getDate()).padStart(2, '0')} ${MONTHS[end.getMonth()]}`;
}

function monthLabel(date) {
    return MONTHS[date.getMonth()];
}

function percentChange(current, previous) {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
}

module.exports = async (req, res) => {

    try {

        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        const view = (req.query?.view || 'weekly').toLowerCase();

        const query = `
            SELECT
                f.ROWID,
                f.fir_number,
                f.date_registered,
                f.crime_type_rowid,
                c.crime_name
            FROM fir AS f
            LEFT JOIN crime_type_master AS c
            ON f.crime_type_rowid = c.ROWID
            ORDER BY f.date_registered ASC
        `;

        const records = await zcql.executeZCQLQuery(query);

        const firs = records
            .map(row => ({
            date: new Date(row.f.date_registered),
            crime: row.c ? row.c.crime_name : 'Unknown'
        }))
        .sort((a, b) => a.date - b.date);

        const latestDate =
            firs.length > 0
                ? new Date(firs[firs.length - 1].date)
                : new Date();

        let chart = [];
        let crimeTypes = [];
        let peak = {};

        if (view === 'weekly') {

            const buckets = [];

            const latestWeekStart = startOfWeek(latestDate);

            for (let i = 5; i >= 0; i--) {

                const start = new Date(latestWeekStart);

                start.setDate(start.getDate() - (i * 7));

                const end = new Date(start);

                end.setDate(end.getDate() + 6);

                end.setHours(23, 59, 59, 999);

                buckets.push({
                    key: weekLabel(start),
                    start,
                    end,
                    count: 0
                });

            }

            const currentCrime = {};
            const previousCrime = {};

            firs.forEach(fir => {

                buckets.forEach((bucket, index) => {

                    if (fir.date >= bucket.start && fir.date <= bucket.end) {

                        bucket.count++;

                        if (index === buckets.length - 1) {
                            currentCrime[fir.crime] = (currentCrime[fir.crime] || 0) + 1;
                        }

                        if (index === buckets.length - 2) {
                            previousCrime[fir.crime] = (previousCrime[fir.crime] || 0) + 1;
                        }

                    }

                });

            });

            let max = 0;

            buckets.forEach(bucket => {

                if (bucket.count > max) {

                    max = bucket.count;

                    peak = {
                        label: bucket.key,
                        count: bucket.count
                    };

                }

            });

            chart = buckets.map(bucket => ({
                label: bucket.key,
                count: bucket.count,
                isPeak: bucket.count === max
            }));

            const crimes = new Set([
                ...Object.keys(currentCrime),
                ...Object.keys(previousCrime)
            ]);

            crimeTypes = [];

            crimes.forEach(crime => {

                const current = currentCrime[crime] || 0;
                const previous = previousCrime[crime] || 0;

                const change = percentChange(current, previous);

                crimeTypes.push({
                    crime,
                    count: current,
                    change,
                    trend:
                        change > 0
                            ? 'up'
                            : change < 0
                            ? 'down'
                            : 'same'
                });

            });

            crimeTypes.sort((a, b) => b.count - a.count);

        }
		else {

            const buckets = [];

            for (let i = 5; i >= 0; i--) {

                const date = new Date(latestDate);

                date.setMonth(latestDate.getMonth() - i);

                buckets.push({
                    key: monthLabel(date),
                    month: date.getMonth(),
                    year: date.getFullYear(),
                    count: 0
                });

            }

            const currentCrime = {};
            const previousCrime = {};

            firs.forEach(fir => {

                buckets.forEach((bucket, index) => {

                    if (
                        fir.date.getMonth() === bucket.month &&
                        fir.date.getFullYear() === bucket.year
                    ) {

                        bucket.count++;

                        if (index === buckets.length - 1) {

                            currentCrime[fir.crime] =
                                (currentCrime[fir.crime] || 0) + 1;

                        }

                        if (index === buckets.length - 2) {

                            previousCrime[fir.crime] =
                                (previousCrime[fir.crime] || 0) + 1;

                        }

                    }

                });

            });

            let max = 0;

            buckets.forEach(bucket => {

                if (bucket.count > max) {

                    max = bucket.count;

                    peak = {
                        label: bucket.key,
                        count: bucket.count
                    };

                }

            });

            chart = buckets.map(bucket => ({

                label: bucket.key,

                count: bucket.count,

                isPeak: bucket.count === max

            }));

            const crimes = new Set([
                ...Object.keys(currentCrime),
                ...Object.keys(previousCrime)
            ]);

            crimeTypes = [];

            crimes.forEach(crime => {

                const current = currentCrime[crime] || 0;
                const previous = previousCrime[crime] || 0;

                const change = percentChange(current, previous);

                crimeTypes.push({

                    crime,

                    count: current,

                    change,

                    trend:
                        change > 0
                            ? 'up'
                            : change < 0
                            ? 'down'
                            : 'same'

                });

            });

            crimeTypes.sort((a, b) => {

                if (b.count !== a.count) {
                    return b.count - a.count;
                }

                return b.change - a.change;

            });

        }

        res.setHeader('Content-Type', 'application/json');

        res.statusCode = 200;

        res.end(JSON.stringify({

            success: true,

            view,

            peak,

            chart,

            crimeTypes: crimeTypes.slice(0, 3)

        }, null, 2));

    }

    catch (error) {

        console.error(error);

        res.setHeader('Content-Type', 'application/json');

        res.statusCode = 500;

        res.end(JSON.stringify({

            success: false,

            message: error.message

        }, null, 2));

    }

};