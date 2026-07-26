console.log("CrimeTrends v2 loaded");

'use strict';

const catalyst = require('zcatalyst-sdk-node');

const API_VERSION = '1.0';
const REPORT_SCHEMA_VERSION = '1.0';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getQueryParams(req) {
    const url = new URL(req.url, 'http://localhost');
    return {
        year: url.searchParams.get('year'),
        month: url.searchParams.get('month'),
        fir: url.searchParams.get('fir'),
        accused: url.searchParams.get('accused'),
        victim: url.searchParams.get('victim')
    };
}

function generateRequestId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return `req_${ts}_${rand}`;
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function percentChange(current, previous) {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildMonthDateRange(year, month) {
    const from = startOfDay(new Date(year, month - 1, 1));
    const to = endOfDay(new Date(year, month, 0));
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previousFrom = startOfDay(new Date(prevYear, prevMonth - 1, 1));
    const previousTo = endOfDay(new Date(prevYear, prevMonth, 0));
    return { from, to, previousFrom, previousTo };
}

function buildYearDateRange(year) {
    const from = startOfDay(new Date(year, 0, 1));
    const to = endOfDay(new Date(year, 11, 31));
    return { from, to };
}

function buildDailyChart(firs, from, to) {
    const countMap = new Map();
    firs.forEach(fir => {
        const dateKey = toDateKey(fir.date);
        countMap.set(dateKey, (countMap.get(dateKey) || 0) + 1);
    });

    const chart = [];
    const cursor = new Date(from);
    while (cursor <= to) {
        const dateKey = toDateKey(cursor);
        chart.push({
            date: dateKey,
            label: String(cursor.getDate()),
            count: countMap.get(dateKey) || 0
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return chart;
}

function buildYearlyChart(firs, year) {
    const monthly = new Array(12).fill(0);
    firs.forEach(fir => {
        if (fir.date.getFullYear() === year) {
            monthly[fir.date.getMonth()]++;
        }
    });
    return monthly.map((count, i) => ({
        date: `${year}-${String(i + 1).padStart(2, '0')}`,
        label: MONTH_NAMES[i],
        count
    }));
}

function calculateSummary(chart, totalCrimes, trendPercentage) {
    let highestDay = null;
    let highestCount = 0;
    chart.forEach(entry => {
        if (entry.count > highestCount) {
            highestCount = entry.count;
            highestDay = entry.date;
        }
    });

    const periodDays = chart.length;
    const averagePerDay = periodDays > 0
        ? Number((totalCrimes / periodDays).toFixed(1))
        : 0;

    return {
        totalCrimes,
        averagePerDay,
        highestDay,
        highestCount,
        trendPercentage
    };
}

function calculateAnalytics(currentCount, previousCount, crimeTypes, chart) {
    const peakCrimeType = crimeTypes.length > 0 ? crimeTypes[0].crime : null;
    const lowestCrimeType = crimeTypes.length > 0 ? crimeTypes[crimeTypes.length - 1].crime : null;

    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    chart.forEach(entry => {
        const d = new Date(entry.date + 'T00:00:00');
        dayCounts[d.getDay()] += entry.count;
    });
    let maxDayIndex = 0;
    let maxDayCount = 0;
    dayCounts.forEach((count, i) => {
        if (count > maxDayCount) {
            maxDayCount = count;
            maxDayIndex = i;
        }
    });

    return {
        currentPeriodCount: currentCount,
        previousPeriodCount: previousCount,
        growthRate: percentChange(currentCount, previousCount),
        peakCrimeType,
        lowestCrimeType,
        peakWeekday: dayNames[maxDayIndex],
        busiestHour: null
    };
}

function calculateCrimeTypes(firs, previousFirs) {
    const currentMap = new Map();
    firs.forEach(fir => {
        currentMap.set(fir.crime, (currentMap.get(fir.crime) || 0) + 1);
    });

    const previousMap = new Map();
    previousFirs.forEach(fir => {
        previousMap.set(fir.crime, (previousMap.get(fir.crime) || 0) + 1);
    });

    const allCrimes = new Set([...currentMap.keys(), ...previousMap.keys()]);
    const crimeTypes = [];

    allCrimes.forEach(crime => {
        const current = currentMap.get(crime) || 0;
        const previous = previousMap.get(crime) || 0;
        const change = percentChange(current, previous);
        crimeTypes.push({
            crime,
            count: current,
            change,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
        });
    });

    crimeTypes.sort((a, b) => b.count - a.count);
    return crimeTypes.slice(0, 5);
}

function generateInsights(chart, crimeTypes) {
    const insights = [];

    const highestEntry = chart.reduce((max, e) => e.count > max.count ? e : max, { count: 0 });
    if (highestEntry.count > 0) {
        const d = new Date(highestEntry.date + 'T00:00:00');
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        insights.push({
            type: 'highest_day',
            title: 'Highest Crime Activity',
            description: `${dayName} recorded ${highestEntry.count} FIRs.`
        });
    }

    if (crimeTypes.length > 0) {
        const biggestIncrease = crimeTypes.reduce((max, c) => c.change > max.change ? c : max, { change: -Infinity });
        const biggestDecrease = crimeTypes.reduce((min, c) => c.change < min.change ? c : min, { change: Infinity });

        if (biggestIncrease.change > 0) {
            insights.push({
                type: 'crime_increase',
                title: 'Largest Increase',
                description: `${biggestIncrease.crime} increased by ${biggestIncrease.change}%.`
            });
        }

        if (biggestDecrease.change < 0) {
            insights.push({
                type: 'crime_decrease',
                title: 'Largest Reduction',
                description: `${biggestDecrease.crime} reduced by ${Math.abs(biggestDecrease.change)}%.`
            });
        }
    }

    return insights;
}

module.exports = async (req, res) => {

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
    }

    console.log("===== CrimeTrends =====");
    console.log("URL:", req.url);

    try {
        const app = catalyst.initialize(req);
        const zcql = app.zcql();

        const query = getQueryParams(req);
        const rawYear = query.year;
        const rawMonth = query.month;

        console.log("Raw year:", rawYear, "Raw month:", rawMonth);

        const year = parseInt(rawYear, 10) || new Date().getFullYear();
        const hasMonth = rawMonth != null && rawMonth !== '';

        let mode, dateRange;

        if (hasMonth) {
            const month = parseInt(rawMonth, 10);
            if (month >= 1 && month <= 12) {
                mode = 'month';
                dateRange = buildMonthDateRange(year, month);
                console.log("Mode: month", year, month);
            } else {
                mode = 'year';
                dateRange = buildYearDateRange(year);
                console.log("Mode: year", year, "(invalid month)");
            }
        } else {
            mode = 'year';
            dateRange = buildYearDateRange(year);
            console.log("Mode: year", year);
        }

        const zcqlQuery = `
            SELECT f.date_registered, f.crime_type_rowid, c.crime_name
            FROM fir AS f
            LEFT JOIN crime_type_master AS c ON f.crime_type_rowid = c.ROWID
            ORDER BY f.date_registered ASC
        `;

        const records = await zcql.executeZCQLQuery(zcqlQuery);

        const allFirs = records.map(row => ({
            date: new Date(row.f.date_registered),
            crime: row.c ? row.c.crime_name : 'Unknown'
        }));

        let chart, currentCount, previousCount, currentFirs, previousFirs, trendPercentage, crimeTypes, analytics, insights, summary;

        if (mode === 'month') {
            const { from, to, previousFrom, previousTo } = dateRange;
            currentFirs = allFirs.filter(fir => fir.date >= from && fir.date <= to);
            previousFirs = allFirs.filter(fir => fir.date >= previousFrom && fir.date <= previousTo);
            chart = buildDailyChart(currentFirs, from, to);
            currentCount = currentFirs.length;
            previousCount = previousFirs.length;
            trendPercentage = percentChange(currentCount, previousCount);
            summary = calculateSummary(chart, currentCount, trendPercentage);
            crimeTypes = calculateCrimeTypes(currentFirs, previousFirs);
            analytics = calculateAnalytics(currentCount, previousCount, crimeTypes, chart);
            insights = generateInsights(chart, crimeTypes);
        } else {
            currentFirs = allFirs.filter(fir => fir.date.getFullYear() === year);
            previousFirs = [];
            chart = buildYearlyChart(allFirs, year);
            currentCount = currentFirs.length;
            previousCount = 0;
            trendPercentage = 0;
            summary = calculateSummary(chart, currentCount, trendPercentage);
            crimeTypes = currentCount > 0
                ? calculateCrimeTypes(currentFirs, [])
                : [];
            analytics = calculateAnalytics(currentCount, 0, crimeTypes, chart);
            insights = generateInsights(chart, crimeTypes);
        }

        const data = {
            year,
            dateRange: {
                from: formatDate(dateRange.from),
                to: formatDate(dateRange.to)
            },
            metadata: {
                requestId: generateRequestId(),
                generatedAt: new Date().toISOString(),
                generatedBy: 'CrimeTrends',
                mode,
                timezone: 'Asia/Kolkata',
                source: 'Catalyst Datastore',
                apiVersion: API_VERSION,
                reportSchemaVersion: REPORT_SCHEMA_VERSION
            },
            summary,
            analytics,
            chart,
            crimeTypes,
            insights
        };

        if (mode === 'month') {
            const month = parseInt(rawMonth, 10);
            data.month = month;
            data.monthName = MONTH_NAMES[month - 1];
        }

        const response = {
            success: true,
            message: 'Crime trends retrieved successfully.',
            data
        };

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(response));
    } catch (error) {
        console.error('[CrimeTrends] Error:', error);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({
            success: false,
            message: 'Failed to retrieve crime trends.',
            data: null
        }));
    }
};
