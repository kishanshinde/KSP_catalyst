const generators = {
    conversation: require('./reports/conversationReport'),
    crime_trends: require('./reports/crimeTrendReport')
};

function generate(reportType, data) {
    const generator = generators[reportType];
    if (!generator) {
        throw new Error(`Unknown report type: ${reportType}`);
    }
    return generator.generate(data);
}

function isSupported(reportType) {
    return reportType in generators;
}

module.exports = { generate, isSupported };
