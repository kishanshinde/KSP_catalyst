# Lumina Intelligence — KSP Crime Intelligence Platform

An AI-powered conversational crime intelligence platform for the **Karnataka State Police (KSP)**. Built with React, Zoho Catalyst serverless, and Google Gemini AI.

## Overview

Lumina Intelligence lets law enforcement officers query, analyze, and visualize crime data using natural language. Ask questions about FIRs, accused individuals, victims, criminal networks, crime hotspots, financial analysis, and more — and get structured answers with rich visualizations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 5, TailwindCSS 3, Framer Motion 12 |
| Backend | Zoho Catalyst serverless functions (Node.js) |
| Database | Zoho Catalyst Data Store (ZCQL) |
| AI/LLM | Google Gemini 2.5 Flash, Zoho Catalyst LLM (Qwen 14B) |
| Charts | Recharts 3 |
| PDF | PDFKit |

## Project Structure

```
functions/               # Serverless backend (10 functions)
  ai-chat/               # Google Gemini integration
  chat-intent/           # Regex-based intent classification
  convokraftHandler/     # Zoho ConvoKraft bot handler
  dashboardAggregation/  # Dashboard metrics aggregation
  generatePDF/           # PDF report generation
  getConversation/       # Fetch conversation by ID
  logEvidence/           # Log AI evidence artifacts
  query/                 # Core data query engine (ZCQL)
  saveConversation/      # Save chat conversations
  test-llm/              # Intent classification via Catalyst LLM

react-vite/              # React frontend
  src/
    context/             # App & Chat state management
    pages/               # HomePage, WorkspacePage
    components/
      layout/            # Sidebar, Header, MainLayout
      landing/           # Dashboard widgets (hotspots, trends, alerts)
      chat/              # Chat input, messages, markdown renderer
      workspace/         # Dynamic visualization components
        visualizations/  # CrimeTrend, HeatMap, CriminalNetwork, etc.
      common/            # Reusable UI primitives
    services/            # API client + mock data
```

## Supported Queries

- Search FIRs, accused, victims, investigations
- Criminal history & risk profiling
- Criminal network graphs
- Repeat offender analysis
- Crime hotspots & geographic trends
- Monthly / district crime analysis
- Demographic & socio-economic crime analysis
- Gender, education, migration, economic stress analysis

## Local Development

```bash
# Frontend
cd react-vite
npm install
npm run dev              # → localhost:3001

# Backend (requires Zoho Catalyst CLI)
npm install -g zcatalyst-cli
catalyst login
catalyst link
catalyst serve           # → localhost:3000
```

Set `VITE_API_URL` in `react-vite/.env.local` to point to your backend.

## Deployment

```bash
catalyst deploy
```

The project is deployed on Zoho Catalyst under **Techsonic-Crime-Intelligence**.

## Mock Mode

Toggle `USE_MOCK = true` in `react-vite/src/services/api.js` to run the frontend with comprehensive mock data — no backend needed.

