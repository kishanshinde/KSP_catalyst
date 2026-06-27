function extractName(text) {
  const patterns = [
    /(?:of|about|for|find|search)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:history|profile|network)\s+(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1]
  }
  return null
}

function extractFirNumber(text) {
  const m = text.match(/(FIR[-\s]?\d{4}[-\s]?\d{3,4})/i)
  return m ? m[1].toUpperCase() : null
}

function detectIntent(query) {
  const q = query.toLowerCase()

  if (q.includes('criminal network') || q.includes('gang') || q.includes(' network')) return 'criminal_network'
  if (q.includes('heatmap') || q.includes('hotspot') || q.includes('crime map')) return 'crime_hotspots'
  if ((q.includes('trend') || q.includes('monthly') || q.includes('weekly')) && !q.includes('network')) return 'crime_trends'
  if (q.includes('financial') || q.includes('money') || q.includes('asset') || q.includes('hawala')) return 'financial_analysis'
  if (q.includes('criminal history') || q.includes('profile') || (q.includes('accused') && !q.includes('fir'))) return 'criminal_history'
  if (q.includes('repeat offender') || q.includes('repeat')) return 'repeat_offenders'
  if (q.includes('risk') || q.includes('risk profile')) return 'risk_analysis'
  if (q.includes('demographic') || q.includes('district')) return 'dashboard'
  if (q.includes('timeline') || q.includes('investigation')) return 'investigation_timeline'
  if (q.includes('graph') || q.includes('network graph')) return 'criminal_network'
  if (q.includes('similar') || q.includes('analogous')) return 'similar_cases'
  if (q.includes('forecast') || q.includes('predict') || q.includes('future')) return 'forecast'
  if (q.includes('fir') || q.includes('file') || q.includes('complaint')) return 'search_fir'
  if (q.includes('case summary') || q.includes('case details')) return 'case_summary'
  return 'search_fir'
}

export function mockClassifyIntentResponse(params) {
  const query = (params?.question || params?.message || '').toLowerCase()
  const intent = detectIntent(query)

  const response = { intent }

  switch (intent) {
    case 'criminal_history':
    case 'criminal_network':
    case 'risk_analysis': {
      const name = extractName(query)
      if (name) response.accused_name = name
      break
    }
    case 'search_fir':
    case 'fir_accused':
    case 'fir_victims':
    case 'investigation_timeline':
    case 'case_summary':
    case 'similar_cases': {
      const firNum = extractFirNumber(query)
      if (firNum) response.fir_number = firNum
      break
    }
    case 'crime_hotspots':
    case 'crime_trends':
    case 'repeat_offenders':
    case 'financial_analysis':
    case 'forecast':
    case 'dashboard': {
      const name = extractName(query)
      if (name) response.accused_name = name
      const location = query.match(/(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
      if (location) response.location_name = location[1]
      break
    }
    default: {
      const name = extractName(query)
      if (name) response.accused_name = name
      const firNum = extractFirNumber(query)
      if (firNum) response.fir_number = firNum
    }
  }

  return response
}

export function mockQueryResponse(params) {
  const intent = params?.intent || 'search_fir'

  switch (intent) {
    case 'criminal_history':
    case 'risk_analysis':
    case 'offender_profile': {
      const name = params?.accused_name || 'Ramesh G.'
      return {
        success: true,
        summary: `${name} — Repeat offender with 7 prior FIRs. High risk profile.`,
        text: `${name} is a 34-year-old male with 7 prior FIRs registered against them. Primary involvement in property crimes (5 cases) and assault (2 cases). They reside in Bangalore North and have associations with 3 known repeat offenders.`,
        rows: [{
          name,
          age: 34,
          gender: 'Male',
          city: 'Bangalore North',
          firCount: 7,
          riskLevel: 'high',
          crimeTypes: ['Theft', 'Burglary', 'Assault'],
          repeatOffender: true,
          lastArrest: '2025-03-15',
        }],
      }
    }

    case 'criminal_network': {
      const name = params?.accused_name || 'Ramesh G.'
      return {
        success: true,
        summary: `Criminal network of ${name} — 12 connected individuals identified.`,
        text: `Analysis of criminal records reveals a network of 12 individuals connected through shared criminal activities with ${name} at the center. Key associates identified across Bangalore North and South divisions.`,
        rows: [{
          nodes: [
            { id: '1', label: name, group: 'central', firCount: 7 },
            { id: '2', label: 'Suresh K.', group: 'central', firCount: 5 },
            { id: '3', label: 'Prakash M.', group: 'central', firCount: 6 },
            { id: '4', label: 'Anita S.', group: 'associate', firCount: 3 },
            { id: '5', label: 'Vijay P.', group: 'associate', firCount: 2 },
            { id: '6', label: 'Kavita R.', group: 'associate', firCount: 4 },
          ],
          edges: [
            { source: '1', target: '2', label: 'co-accused' },
            { source: '1', target: '3', label: 'co-accused' },
            { source: '2', target: '3', label: 'known' },
            { source: '1', target: '4', label: 'associate' },
            { source: '3', target: '5', label: 'associate' },
            { source: '2', target: '6', label: 'associate' },
          ],
        }],
      }
    }

    case 'crime_hotspots': {
      return {
        success: true,
        summary: 'Crime hotspots: Bangalore North (42), South (38), East (35).',
        text: 'The crime heatmap analysis reveals three primary hotspots: Bangalore North division (42 incidents), Bangalore South division (38 incidents), and Bangalore East division (35 incidents). Whitefield and Electronic City show emerging patterns.',
        rows: [
          { location: 'Bangalore North', count: 42, level: 'high' },
          { location: 'Bangalore South', count: 38, level: 'high' },
          { location: 'Bangalore East', count: 35, level: 'high' },
          { location: 'Bangalore West', count: 22, level: 'medium' },
          { location: 'Whitefield', count: 15, level: 'medium' },
          { location: 'Electronic City', count: 12, level: 'low' },
          { location: 'Yelahanka', count: 8, level: 'low' },
        ],
      }
    }

    case 'crime_trends': {
      return {
        success: true,
        summary: 'Crime declining 12% year-over-year.',
        text: 'Monthly crime trends show a gradual decline from January (89 incidents) to June (62 incidents), representing a 30% reduction over the six-month period. Property crimes saw the steepest decline at 18%.',
        rows: [],
        analytics: {
          months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: [89, 82, 75, 70, 65, 62],
          trend: 'declining',
          percentChange: -12,
        },
      }
    }

    case 'search_fir':
    case 'fir_accused':
    case 'fir_victims':
    case 'case_summary': {
      const firNum = params?.fir_number || 'FIR-2026-0012'
      return {
        success: true,
        summary: `Investigation details for ${firNum}`,
        text: `Investigation for ${firNum} is currently active. Case involves organized crime with 3 suspects identified. Evidence collection phase is 75% complete. The case is registered under Bangalore North division.`,
        rows: [{
          fir_number: firNum,
          title: 'Organized Retail Theft Ring',
          status: 'active',
          progress: 75,
          registered_date: '2026-01-12',
          division: 'Bangalore North',
          crime_type: 'Theft',
        }],
      }
    }

    case 'investigation_timeline': {
      const firNum = params?.fir_number || 'FIR-2026-0012'
      return {
        success: true,
        summary: `Investigation timeline for ${firNum}`,
        text: `Investigation for ${firNum} is currently active. Evidence collection phase is 75% complete.`,
        rows: [{
          fir_number: firNum,
          title: 'Organized Retail Theft Ring',
          status: 'active',
          progress: 75,
          events: [
            { date: '2026-01-12', event: 'FIR Registered', description: 'Complaint filed at Bangalore North station' },
            { date: '2026-01-15', event: 'Investigation Assigned', description: 'CID team assigned to case' },
            { date: '2026-02-01', event: 'Suspects Identified', description: '3 suspects identified through CCTV analysis' },
            { date: '2026-03-10', event: 'Evidence Collection', description: '75% evidence collected' },
          ],
        }],
      }
    }

    case 'repeat_offenders': {
      return {
        success: true,
        summary: '4 repeat offenders with 3+ FIRs each.',
        text: 'Identified 4 repeat offenders in the database with 3 or more registered FIRs. All individuals are currently under active surveillance. Highest priority: Ramesh G. with 7 cases.',
        rows: [
          { name: 'Ramesh G.', firCount: 7, lastArrest: '2025-03-15', riskLevel: 'high' },
          { name: 'Suresh K.', firCount: 5, lastArrest: '2025-02-20', riskLevel: 'high' },
          { name: 'Prakash M.', firCount: 4, lastArrest: '2025-01-10', riskLevel: 'medium' },
          { name: 'Kavita R.', firCount: 3, lastArrest: '2025-04-01', riskLevel: 'medium' },
        ],
      }
    }

    case 'financial_analysis': {
      return {
        success: true,
        summary: '₹2.3Cr in unexplained assets identified.',
        text: 'Financial analysis reveals approximately ₹2.3 crore in potentially unexplained assets. Key findings: 3 properties worth ₹1.2Cr, 2 luxury vehicles valued at ₹45L, and multiple bank accounts with high-value transactions totaling ₹65L.',
        rows: [{
          totalUnexplained: '2,30,00,000',
          assets: [
            { type: 'Real Estate', value: '1,20,00,000', count: 3 },
            { type: 'Vehicles', value: '45,00,000', count: 2 },
            { type: 'Bank Deposits', value: '65,00,000', count: 7 },
          ],
          flaggedAccounts: 4,
        }],
      }
    }

    case 'similar_cases': {
      const firNum = params?.fir_number || 'FIR-2026-0012'
      return {
        success: true,
        summary: `3 similar cases found for ${firNum}`,
        text: `Analysis identified 3 cases with similar modus operandi to ${firNum}. All cases involve organized retail theft with similar suspect descriptions.`,
        rows: [
          { fir_number: 'FIR-2025-0891', similarity: 0.87, division: 'Bangalore South', status: 'closed' },
          { fir_number: 'FIR-2025-0923', similarity: 0.82, division: 'Bangalore East', status: 'closed' },
          { fir_number: 'FIR-2026-0007', similarity: 0.76, division: 'Bangalore North', status: 'active' },
        ],
      }
    }

    case 'forecast': {
      return {
        success: true,
        summary: 'Crime forecast: 8% increase predicted for next quarter.',
        text: 'Based on current trends and seasonal patterns, a moderate increase in property crimes is expected in the next quarter. Bangalore East and Whitefield zones require proactive patrolling.',
        rows: [],
        analytics: {
          predictedMonths: ['Jul', 'Aug', 'Sep'],
          predictedValues: [68, 72, 78],
          confidence: 0.82,
        },
      }
    }

    case 'dashboard': {
      return {
        success: true,
        summary: 'Dashboard aggregated successfully.',
        text: 'Aggregated crime statistics across all divisions.',
        rows: [],
        analytics: {
          totalCases: 1284,
          activeCases: 342,
          closedCases: 890,
          clearanceRate: 69.3,
        },
      }
    }

    default:
      return {
        success: true,
        summary: 'Query processed successfully.',
        text: 'Analysis complete. Please refine your query for more specific results.',
        rows: [],
      }
  }
}

export function mockDashboardResponse() {
  return {
    success: true,
    statistics: {
      totalConversations: 1284,
      evidenceLogs: 3562,
      activeLanguages: 3,
    },
    alerts: [
      { type: 'critical', message: 'High-risk offender Ramesh G. reported near MG Road', time: '2 min ago' },
      { type: 'intel', message: 'New criminal network pattern detected in Bangalore East', time: '15 min ago' },
    ],
    trends: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [89, 82, 75, 70, 65, 62],
      percentChange: -12,
    },
    heatmaps: [
      { location: 'Bangalore North', count: 42, level: 'high' },
      { location: 'Bangalore South', count: 38, level: 'high' },
      { location: 'Bangalore East', count: 35, level: 'high' },
    ],
  }
}
