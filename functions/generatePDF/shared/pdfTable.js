const { THEME } = require('./pdfTheme');

function renderTable(doc, headers, rows, options = {}) {
    const {
        startX = THEME.margins.left,
        startY = doc.y,
        columnWidths,
        headerBg = THEME.colors.primary,
        headerColor = '#ffffff',
        fontSize = 8,
        rowPadding = 5
    } = options;

    const colCount = headers.length;
    const colWidths = columnWidths || Array(colCount).fill(THEME.contentWidth / colCount);
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    let yPos = startY + 10;

    doc.fontSize(fontSize).font(THEME.fonts.bold);
    let xPos = startX;
    headers.forEach((header, i) => {
        doc.rect(xPos, yPos, colWidths[i], 18).fill(headerBg);
        doc.fillColor(headerColor);
        doc.text(header, xPos + 4, yPos + 4, {
            width: colWidths[i] - 8,
            align: i === 0 ? 'left' : 'center'
        });
        doc.fillColor('#000000');
        xPos += colWidths[i];
    });

    yPos += 18;
    doc.font(THEME.fonts.regular).fontSize(fontSize);

    rows.forEach((row, rowIndex) => {
        const rowHeight = 16;
        if (yPos + rowHeight > 720) {
            doc.addPage();
            yPos = THEME.margins.top + 20;
        }

        if (rowIndex % 2 === 1) {
            doc.rect(startX, yPos, tableWidth, rowHeight)
                .fillColor('#f1f5f9').fill()
                .fillColor('#000000');
        }

        xPos = startX;
        row.forEach((cell, i) => {
            doc.text(String(cell), xPos + 4, yPos + 3, {
                width: colWidths[i] - 8,
                align: i === 0 ? 'left' : 'center'
            });
            xPos += colWidths[i];
        });
        yPos += rowHeight;
    });

    doc.y = yPos + 10;
}

module.exports = { renderTable };
