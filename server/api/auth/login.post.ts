export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username dan password wajib diisi'
    })
  }

  const config = useRuntimeConfig()

  // Validate credentials against env
  if (username !== config.adminUsername || password !== config.adminPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Username atau password salah'
    })
  }

  // Create session token and set cookie
  const token = createSessionToken(config.authSecret)
  setSessionCookie(event, token)

  return {
    success: true,
    message: 'Login berhasil'
  }
})
