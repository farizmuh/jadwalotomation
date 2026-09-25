export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, name, nickname, phone, maxHoursPerWeek } = body

    if (!name || !name.trim()) {
      return { success: false, error: 'Nama guru harus diisi' }
    }

    let teacherId = id ? Number(id) : null
    if (!teacherId) {
      // Find highest ID + 1
      const maxTeacher = await prisma.teacher.findFirst({
        orderBy: { id: 'desc' }
      })
      teacherId = (maxTeacher?.id || 0) + 1
    }

    const hasInitialSubject = Boolean(body.initialSubjectName && body.initialSubjectName.trim())
    const created = await prisma.teacher.create({
      data: {
        id: teacherId,
        name: name.trim(),
        nickname: nickname?.trim() || null,
        phone: phone?.trim() || null,
        maxHoursPerWeek: maxHoursPerWeek ? Number(maxHoursPerWeek) : 30,
        ...(hasInitialSubject && {
          subjects: {
            create: {
              code: 'a',
              name: body.initialSubjectName.trim(),
              targetJp: body.initialSubjectJp ? Number(body.initialSubjectJp) : 4
            }
          }
        })
      },
      include: { subjects: true }
    })

    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambah guru' }
  }
})
