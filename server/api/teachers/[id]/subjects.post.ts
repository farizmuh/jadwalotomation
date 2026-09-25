export default defineEventHandler(async (event) => {
  try {
    const teacherId = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)
    const { code, name, targetJp = 4, classroomId } = body

    if (!code || !code.trim() || !name || !name.trim()) {
      return { success: false, error: 'Kode mapel (mis: a, b) dan nama mapel harus diisi' }
    }

    const subCode = code.trim().toLowerCase()

    // Check duplicate code for this teacher
    const existing = await prisma.subject.findFirst({
      where: {
        teacherId,
        code: subCode
      }
    })

    if (existing) {
      return { success: false, error: `Kode '${subCode}' sudah terdaftar untuk guru ini` }
    }

    const created = await prisma.subject.create({
      data: {
        teacherId,
        code: subCode,
        name: name.trim(),
        targetJp: Number(targetJp) || 4,
        classroomId: classroomId ? Number(classroomId) : null
      },
      include: { classroom: true }
    })

    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambah mata pelajaran' }
  }
})
