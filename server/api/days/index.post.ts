export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name } = body

    if (!name || !name.trim()) {
      return { success: false, error: 'Nama hari harus diisi' }
    }

    const count = await prisma.day.count()
    const dayName = name.trim().toUpperCase()

    // Check existing
    const existing = await prisma.day.findFirst({
      where: { name: dayName }
    })
    if (existing) {
      return { success: false, error: `Hari ${dayName} sudah terdaftar` }
    }

    const created = await prisma.day.create({
      data: {
        name: dayName,
        orderIndex: count + 1
      }
    })

    // Also create initial empty piket record for this day
    await prisma.teacherPiket.create({
      data: {
        dayId: created.id
      }
    })

    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambah hari' }
  }
})
