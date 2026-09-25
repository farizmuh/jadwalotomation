import { createHmac } from 'crypto'

const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_DURATION_HOURS = 8

/**
 * Create a signed session token
 */
export function createSessionToken(secret: string): string {
  const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  const payload = `admin:${expiresAt}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${signature}`).toString('base64')
}

/**
 * Verify a session token
 */
export function verifySessionToken(token: string, secret: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false

    const [user, expiresAtStr, signature] = parts
    const expiresAt = parseInt(expiresAtStr, 10)

    // Check expiration
    if (Date.now() > expiresAt) return false

    // Verify signature
    const payload = `${user}:${expiresAtStr}`
    const expectedSig = createHmac('sha256', secret).update(payload).digest('hex')
    return signature === expectedSig
  } catch {
    return false
  }
}

/**
 * Set the session cookie on an H3 event
 */
export function setSessionCookie(event: any, token: string) {
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 60 * 60
  })
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(event: any) {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/'
  })
}

/**
 * Get the session token from cookies
 */
export function getSessionToken(event: any): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME)
}

/**
 * Check if the current request is authenticated
 */
export function isAuthenticated(event: any): boolean {
  const config = useRuntimeConfig()
  const token = getSessionToken(event)
  if (!token) return false
  return verifySessionToken(token, config.authSecret)
}
