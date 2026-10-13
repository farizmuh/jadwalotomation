import bcrypt from 'bcryptjs'

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

  // Try DB-based admin first
  const adminRecord = await prisma.admin.findUnique({ where: { username } })

  if (adminRecord) {
    // Verify via bcrypt hash
    const isValid = await bcrypt.compare(password, adminRecord.passwordHash)
    if (!isValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Username atau password salah'
      })
    }
  } else {
    // Fallback: validate against .env credentials (for migration / first run)
    if (username !== config.adminUsername || password !== config.adminPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Username atau password salah'
      })
    }

    // Auto-migrate: seed admin to DB so future logins use DB
    const hash = await bcrypt.hash(password, 12)
    await prisma.admin.create({
      data: {
        username,
        passwordHash: hash
      }
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
