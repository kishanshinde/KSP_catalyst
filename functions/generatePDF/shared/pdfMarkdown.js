const { THEME } = require('./pdfTheme');

const HEADING_SIZES = { 1: 13, 2: 12, 3: 10.5 };

function renderInline(doc, line, { x, width, fontSize, regularFont, boldFont }) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

    doc.fontSize(fontSize);
    parts.forEach((part, i) => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        const text = isBold ? part.slice(2, -2) : part;
        doc.font(isBold ? boldFont : regularFont);
        doc.text(text, {
            continued: i < parts.length - 1,
            width,
            indent: 0
        });
    });
}

// Renders a light Markdown dialect (headings, bold, bullet/numbered lists,
// blank-line paragraph breaks) as formatted PDF text instead of dumping the
// raw "##"/"**"/"-" syntax. Mirrors the subset handled by the chat UI's
// MarkdownRenderer so PDF exports match what officers see on screen.
function renderMarkdown(doc, content, options = {}) {
    const {
        fontSize = 9,
        indent = 10,
        pageBottom = 700
    } = options;
    const regularFont = THEME.fonts.regular;
    const boldFont = THEME.fonts.bold;
    const left = doc.page.margins.left + indent;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;

    const lines = String(content || '').split('\n');

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (doc.y > pageBottom) {
            doc.addPage();
        }

        if (line === '') {
            doc.moveDown(0.4);
            continue;
        }

        const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
        const bulletMatch = line.match(/^[-*]\s+(.*)$/);
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);

        doc.x = left;

        if (headingMatch) {
            const level = headingMatch[1].length;
            doc.font(boldFont).fontSize(HEADING_SIZES[level] || 10);
            doc.text(headingMatch[2], left, doc.y, { width });
            doc.moveDown(0.3);
            doc.fontSize(fontSize).font(regularFont);
        } else if (bulletMatch) {
            doc.font(regularFont).fontSize(fontSize);
            doc.text('•  ', { continued: true, width });
            renderInline(doc, bulletMatch[1], { x: left, width: width - 14, fontSize, regularFont, boldFont });
            doc.moveDown(0.15);
        } else if (numberedMatch) {
            doc.font(regularFont).fontSize(fontSize);
            doc.text(`${numberedMatch[1]}.  `, { continued: true, width });
            renderInline(doc, numberedMatch[2], { x: left, width: width - 14, fontSize, regularFont, boldFont });
            doc.moveDown(0.15);
        } else {
            renderInline(doc, line, { x: left, width, fontSize, regularFont, boldFont });
            doc.moveDown(0.15);
        }
    }

    doc.font(regularFont).fontSize(fontSize);
}

module.exports = { renderMarkdown };
