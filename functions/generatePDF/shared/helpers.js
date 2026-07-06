function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hours = String(d.getHours()).padStart(2,'0');
    const mins = String(d.getMinutes()).padStart(2,'0');
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${mins}`;
}

module.exports = { sanitizeFilename, formatDate, formatDateTime };
