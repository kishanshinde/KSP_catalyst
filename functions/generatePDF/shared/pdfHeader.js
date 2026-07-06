const { THEME } = require('./pdfTheme');

function renderHeader(doc, title, subtitle) {
    doc.fontSize(18).font(THEME.fonts.bold);
    doc.text('KARNATAKA STATE POLICE', { align: 'center' });
    doc.fontSize(10).font(THEME.fonts.regular);
    doc.text(subtitle || 'Crime Intelligence Unit', { align: 'center' });
    doc.moveDown(0.5);

    doc.moveTo(THEME.margins.left, doc.y)
        .lineTo(THEME.margins.left + THEME.contentWidth, doc.y)
        .stroke(THEME.colors.lightGray);
    doc.moveDown(0.5);

    doc.fontSize(14).font(THEME.fonts.bold);
    doc.text(title);
    doc.moveDown(0.3);
}

module.exports = { renderHeader };
