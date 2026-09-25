/**
 * Server middleware to protect API routes that modify data.
 *
 * Strategy:
 * - GET requests are PUBLIC (anyone can view schedules, export, etc.)
 * - Auth routes (/api/auth/*) are PUBLIC
 * - All other methods (POST, PUT, DELETE, PATCH) require authentication
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const method = getMethod(event)
  const pathname = url.pathname

  // Allow all non-API routes (pages, assets, etc.)
  if (!pathname.startsWith('/api/')) return

  // Allow auth routes (login, logout, me)
  if (pathname.startsWith('/api/auth/')) return

  // Allow all GET requests (read-only, public)
  if (method === 'GET') return

  // For write operations (POST, PUT, DELETE, PATCH), require authentication
  if (!isAuthenticated(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Anda harus login sebagai admin untuk melakukan perubahan data'
    })
  }
})
