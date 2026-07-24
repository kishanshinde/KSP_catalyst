import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

const API_GATEWAY_ENDPOINTS = [
  '/ai-chat',
  '/getCurrentUser',
  '/authentication',
  '/generatePDF',
  '/saveConversation',
  '/logEvidence',
  '/dashboardAggregation',
  '/listConversations',
  '/renameConversation',
  '/deleteConversation',
  '/CrimeTrends',
  '/RecentCases',
  '/CrimeheatMap',
  '/criminal-network-analysis',
]

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, rootDir, '')
  const catalystDomain = env.VITE_CATALYST_DOMAIN
  
  const catalystTarget = env.VITE_BACKEND_URL || (catalystDomain
    ? `https://${catalystDomain}.catalystserverless.in`
    : 'http://localhost:3000')

  const proxyMap = {
    '/__catalyst': {
      target: catalystTarget,
      changeOrigin: true,
      secure: false,
      cookieDomainRewrite: 'localhost',
    },
    '/server': {
      target: catalystTarget,
      changeOrigin: true,
      secure: false,
      cookieDomainRewrite: 'localhost',
    },
  }

  API_GATEWAY_ENDPOINTS.forEach((endpoint) => {
    proxyMap[endpoint] = {
      target: catalystTarget,
      changeOrigin: true,
      secure: false,
      cookieDomainRewrite: 'localhost',
    }
  })

  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: proxyMap,
    },
  }
})
