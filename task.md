# CNA Dynamic Data Integration — Tasks

## Backend
- [x] Fix ZCQL row destructuring bug in `criminal-network-analysis/index.js`
- [x] Add `search_type` / `search_query` parameter support
- [x] Add FIR-based search (FIR as center node)
- [x] Add auto-adaptive depth logic (2-hop >10 connections, 3-hop ≤10)
- [x] Add `get_summary` action for dashboard

## Frontend — API & Hook
- [x] Add `getCNASummary()`, `searchCNANetwork()`, `getCNAFullNetwork()` to `api.js`
- [x] Create `useCriminalNetwork.js` hook

## Frontend — Components
- [x] Create `NodeDetailPanel.jsx`
- [x] Update `AnalyticsPage.jsx` (search bar, summary dashboard, 3 tabs, loading/error)
- [x] Update `CriminalNetworkViz.jsx` (homepage — dynamic data)
- [x] Update `NetworkGraph.jsx` (remove mock fallback, add `onNodeSelect`)
- [x] Update `NetworkMetrics.jsx` (remove mock fallback)
- [x] Update `CommunityView.jsx` (remove mock fallback)
- [x] Remove ShortestPath tab from AnalyticsPage

## Verification
- [x] Test backend endpoint directly
- [x] Test full flow: page load → summary → search → graph
