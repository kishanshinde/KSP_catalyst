const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'fonts');

const THEME = {
    fonts: {
        regular: 'KSP-Regular',
        bold: 'KSP-Bold',
        regularPath: path.join(FONTS_DIR, 'NotoSansKannada-Regular.ttf'),
        boldPath: path.join(FONTS_DIR, 'NotoSansKannada-Bold.ttf')
    },
    colors: {
        primary: '#004ac6',
        dark: '#1e293b',
        gray: '#64748b',
        lightGray: '#cccccc',
        lightText: '#666666',
        red: '#dc2626',
        green: '#16a34a'
    },
    margins: {
        left: 50,
        right: 50,
        top: 50,
        bottom: 50
    },
    pageWidth: 595.28,
    contentWidth: 495.28
};

function registerFonts(doc) {
    doc.registerFont(THEME.fonts.regular, THEME.fonts.regularPath);
    doc.registerFont(THEME.fonts.bold, THEME.fonts.boldPath);
}

module.exports = { THEME, registerFonts };
