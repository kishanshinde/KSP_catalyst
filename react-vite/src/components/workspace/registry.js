import HeatMap from './visualizations/HeatMap'
import CriminalNetwork from './visualizations/CriminalNetwork'
import NetworkMetrics from './visualizations/NetworkMetrics'
import ShortestPath from './visualizations/ShortestPath'
import CommunityView from './visualizations/CommunityView'
import Timeline from './visualizations/Timeline'
import AnalyticsChart from './visualizations/AnalyticsChart'
import OffenderProfile from './visualizations/OffenderProfile'
import FinancialAnalysis from './visualizations/FinancialAnalysis'
import CrimeTrend from './visualizations/CrimeTrend'
import RecentAlerts from './visualizations/RecentAlerts'

export const workspaceRegistry = {
  heatmap: HeatMap,
  network: CriminalNetwork,
  network_metrics: NetworkMetrics,
  network_path: ShortestPath,
  network_community: CommunityView,
  timeline: Timeline,
  chart: AnalyticsChart,
  profile: OffenderProfile,
  financial: FinancialAnalysis,
  trend: CrimeTrend,
  alert: RecentAlerts,
}
