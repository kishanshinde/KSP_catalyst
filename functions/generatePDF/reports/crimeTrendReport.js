const PDFDocument = require('pdfkit');
const { registerFonts, THEME } = require('../shared/pdfTheme');
const { renderHeader } = require('../shared/pdfHeader');
const { renderFooter } = require('../shared/pdfFooter');
const { renderTable } = require('../shared/pdfTable');
const { renderBarChart } = require('../shared/pdfChart');
const { formatDate, formatDateTime } = require('../shared/helpers');

function generate(data) {
    const { year, month, monthName, dateRange, summary, analytics, chart, crimeTypes, insights, metadata } = data;

    const doc = new PDFDocument({ margin: THEME.margins.left });
    registerFonts(doc);

    const periodLabel = monthName
        ? `Crime Intelligence Report \u2014 ${monthName} ${year}`
        : `Crime Intelligence Report \u2014 ${year}`;
    const dateLabel = dateRange
        ? `${formatDate(dateRange.from)} \u2014 ${formatDate(dateRange.to)}`
        : '';

    renderHeader(doc, periodLabel, 'Crime Intelligence Unit \u2014 Crime Trends Report');

    doc.fontSize(9).font(THEME.fonts.regular);
    if (dateLabel) {
        doc.text(`Period: ${dateLabel}`);
    }
    if (metadata?.generatedAt) {
        doc.text(`Generated: ${formatDateTime(metadata.generatedAt)}`);
    }
    if (metadata?.requestId) {
        doc.text(`Request ID: ${metadata.requestId}`);
    }
    doc.moveDown(0.5);

    doc.moveTo(THEME.margins.left, doc.y)
        .lineTo(THEME.margins.left + THEME.contentWidth, doc.y)
        .stroke(THEME.colors.lightGray);
    doc.moveDown(0.5);

    doc.fontSize(12).font(THEME.fonts.bold);
    doc.text('Operational Summary');
    doc.moveDown(0.3);
    doc.fontSize(9).font(THEME.fonts.regular);

    const summaryRows = [
        ['Total Crimes', String(summary?.totalCrimes ?? 0)],
        ['Average Per Day', String(summary?.averagePerDay ?? 0)],
        ['Peak Day', summary?.highestDay ? `${summary.highestDay} (${summary.highestCount} FIRs)` : 'N/A'],
        ['Trend', monthName
            ? `${summary?.trendPercentage != null ? summary.trendPercentage : 0}% vs previous month`
            : 'Annual overview']
    ];

    summaryRows.forEach(([label, value]) => {
        doc.font(THEME.fonts.bold);
        doc.text(`${label}: `, { continued: true });
        doc.font(THEME.fonts.regular);
        doc.text(value);
        doc.moveDown(0.2);
    });

    doc.moveDown(0.5);

    doc.moveTo(THEME.margins.left, doc.y)
        .lineTo(THEME.margins.left + THEME.contentWidth, doc.y)
        .stroke(THEME.colors.lightGray);
    doc.moveDown(0.5);

    if (crimeTypes && crimeTypes.length > 0) {
        doc.fontSize(12).font(THEME.fonts.bold);
        doc.text('Crime Distribution');
        doc.moveDown(0.3);

        const headers = ['Crime Type', 'Count', 'Change %', 'Trend'];
        const colWidths = [180, 80, 100, 80];
        const rows = crimeTypes.map(ct => [
            ct.crime,
            String(ct.count),
            `${ct.change > 0 ? '+' : ''}${ct.change}%`,
            ct.trend === 'up' ? '\u2191 Increase' : ct.trend === 'down' ? '\u2193 Decrease' : '\u2192 Stable'
        ]);

        renderTable(doc, headers, rows, { columnWidths: colWidths });
        doc.moveDown(0.5);
    }

    if (insights && insights.length > 0) {
        doc.moveTo(THEME.margins.left, doc.y)
            .lineTo(THEME.margins.left + THEME.contentWidth, doc.y)
            .stroke(THEME.colors.lightGray);
        doc.moveDown(0.5);

        doc.fontSize(12).font(THEME.fonts.bold);
        doc.text('Intelligence Insights');
        doc.moveDown(0.3);
        doc.fontSize(9).font(THEME.fonts.regular);

        insights.forEach(insight => {
            doc.font(THEME.fonts.bold);
            doc.text(`${insight.title}: `, { continued: true });
            doc.font(THEME.fonts.regular);
            doc.text(insight.description);
            doc.moveDown(0.2);
        });

        doc.moveDown(0.5);
    }

    if (chart && chart.length > 0) {
        doc.moveTo(THEME.margins.left, doc.y)
            .lineTo(THEME.margins.left + THEME.contentWidth, doc.y)
            .stroke(THEME.colors.lightGray);
        doc.moveDown(0.5);

        doc.fontSize(12).font(THEME.fonts.bold);
        doc.text(monthName ? 'Daily Trend' : 'Monthly Trend');
        doc.moveDown(0.3);

        renderBarChart(doc, chart);
    }

    renderFooter(doc);
    doc.end();

    return doc;
}

module.exports = { generate };
