const { THEME } = require('./pdfTheme');

function renderBarChart(doc, chart, options = {}) {
    const {
        startX = THEME.margins.left + 20,
        width = THEME.contentWidth - 40,
        height = 120,
        barColor = THEME.colors.primary,
        fontSize = 6
    } = options;

    if (!chart || chart.length === 0) {
        doc.fontSize(9).font(THEME.fonts.regular);
        doc.text('No chart data available.', { align: 'center' });
        return;
    }

    const maxCount = Math.max(...chart.map(e => e.count), 1);
    const barWidth = Math.max(4, Math.min(20, (width / chart.length) - 2));
    const chartBottom = doc.y + height;

    doc.y = doc.y + 10;

    let xPos = startX;
    chart.forEach(entry => {
        const barHeight = (entry.count / maxCount) * height;

        doc.rect(xPos, chartBottom - barHeight, barWidth, barHeight)
            .fill(barColor);

        doc.fontSize(fontSize).font(THEME.fonts.regular).fillColor(THEME.colors.gray);
        doc.text(String(entry.count), xPos, chartBottom - barHeight - 10, {
            width: barWidth,
            align: 'center'
        });

        doc.text(entry.label, xPos, chartBottom + 4, {
            width: barWidth,
            align: 'center'
        });
        doc.fillColor('#000000');

        xPos += barWidth + 2;
    });

    doc.y = chartBottom + 30;
}

module.exports = { renderBarChart };
