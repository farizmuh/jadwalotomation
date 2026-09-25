export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { dayId, teacher1Id, teacher2Id, teacher1Name, teacher2Name } = body

    if (!dayId) {
      return { success: false, error: 'dayId harus diisi' }
    }

    const updated = await prisma.teacherPiket.upsert({
      where: { dayId: Number(dayId) },
      update: {
        teacher1Id: teacher1Id ? Number(teacher1Id) : null,
        teacher2Id: teacher2Id ? Number(teacher2Id) : null,
        teacher1Name: teacher1Name?.trim() || null,
        teacher2Name: teacher2Name?.trim() || null
      },
      create: {
        dayId: Number(dayId),
        teacher1Id: teacher1Id ? Number(teacher1Id) : null,
        teacher2Id: teacher2Id ? Number(teacher2Id) : null,
        teacher1Name: teacher1Name?.trim() || null,
        teacher2Name: teacher2Name?.trim() || null
      },
      include: {
        teacher1: true,
        teacher2: true
      }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal update guru piket' }
  }
})
