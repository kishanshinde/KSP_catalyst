const PDFDocument = require('pdfkit');
const { registerFonts, THEME } = require('../shared/pdfTheme');
const { renderHeader } = require('../shared/pdfHeader');
const { renderFooter } = require('../shared/pdfFooter');
const { sanitizeFilename } = require('../shared/helpers');

async function generate(data) {
    const { conversationId, conversation, conversation_title, question, response, created_at, language } = data;

    const doc = new PDFDocument({ margin: THEME.margins.left });
    registerFonts(doc);

    const title = conversation_title || question || 'Conversation Report';
    const createdAt = created_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

    let rawMessages = [];
    if (conversation) {
        try {
            rawMessages = JSON.parse(conversation);
        } catch (e) {
            rawMessages = [];
        }
    }

    const conversationPayload = Array.isArray(rawMessages)
        ? { schemaVersion: 1, messages: rawMessages }
        : (rawMessages ?? {});

    let messages = Array.isArray(conversationPayload.messages)
        ? conversationPayload.messages
        : [];

    if (messages.length === 0 && question) {
        messages.push({ role: 'user', content: question });
        if (response) {
            messages.push({ role: 'assistant', content: response });
        }
    }

    renderHeader(doc, title, 'Crime Intelligence Unit \u2014 Conversation Report');

    doc.fontSize(9).font(THEME.fonts.regular);
    doc.text(`Generated: ${createdAt}`);
    doc.moveDown(0.3);
    doc.text(`Messages: ${messages.length}`);
    doc.moveDown(0.5);

    doc.moveTo(THEME.margins.left, doc.y)
        .lineTo(THEME.margins.left + THEME.contentWidth, doc.y)
        .stroke(THEME.colors.lightGray);
    doc.moveDown(0.5);

    for (const msg of messages) {
        const role = msg.role === 'user' ? 'Officer' : 'AI Assistant';
        const content = msg.content || '';

        if (doc.y > 700) {
            doc.addPage();
        }

        doc.fontSize(10).font(THEME.fonts.bold);
        doc.text(`${role}:`);
        doc.moveDown(0.2);

        doc.fontSize(9).font(THEME.fonts.regular);
        doc.text(content, { indent: 10 });
        doc.moveDown(0.5);
    }

    renderFooter(doc);
    doc.end();

    return doc;
}

module.exports = { generate };
