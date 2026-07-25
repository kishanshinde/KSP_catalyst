export const SESSION_TOKEN_KEY = 'ksp_lumina_session_token'

export function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY)
}

export function setSessionToken(token) {
  localStorage.setItem(SESSION_TOKEN_KEY, token)
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY)
}

// Zoho's own API Gateway intercepts and validates any `Authorization` header
// itself (attempting its own CatalystUserManagement auth), rejecting this
// app's custom session token before it ever reaches our function code. Using
// a differently-named header avoids that entirely.
export async function getAuthHeader() {
  const token = getSessionToken()
  return token ? { 'X-Session-Token': token } : {}
}
