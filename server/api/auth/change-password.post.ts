import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  // Must be authenticated
  requireAuth(event)

  const body = await readBody(event)
  const { currentPassword, newPassword } = body || {}

  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password lama dan password baru wajib diisi'
    })
  }

  if (newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password baru minimal 6 karakter'
    })
  }

  // Get admin from DB
  const admin = await prisma.admin.findFirst()

  if (!admin) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data admin tidak ditemukan'
    })
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, admin.passwordHash)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Password lama tidak sesuai'
    })
  }

  // Hash new password and save
  const newHash = await bcrypt.hash(newPassword, 12)
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: newHash }
  })

  return { success: true, message: 'Password berhasil diubah' }
})
