// Workspace Component Registry
// Add new visualization types here without modifying any other file
// Key = type string from API response, Value = React component

import HeatMap from './visualizations/HeatMap'
import CriminalNetwork from './visualizations/CriminalNetwork'
import Timeline from './visualizations/Timeline'
import AnalyticsChart from './visualizations/AnalyticsChart'
import OffenderProfile from './visualizations/OffenderProfile'
import FinancialAnalysis from './visualizations/FinancialAnalysis'
import CrimeTrend from './visualizations/CrimeTrend'
import RecentAlerts from './visualizations/RecentAlerts'

export const workspaceRegistry = {
  heatmap: HeatMap,
  network: CriminalNetwork,
  timeline: Timeline,
  chart: AnalyticsChart,
  profile: OffenderProfile,
  financial: FinancialAnalysis,
  trend: CrimeTrend,
  alert: RecentAlerts,
}
