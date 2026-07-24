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

export async function getAuthHeader() {
  const token = getSessionToken()
  return token ? { Authorization: token } : {}
}
