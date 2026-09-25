export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)
    const { code, name, targetJp, classroomId } = body

    const existing = await prisma.subject.findUnique({
      where: { id }
    })
    if (!existing) {
      return { success: false, error: 'Mata pelajaran tidak ditemukan' }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(code && { code: code.trim().toLowerCase() }),
        ...(name && { name: name.trim() }),
        ...(targetJp !== undefined && { targetJp: Number(targetJp) }),
        ...(classroomId !== undefined && { classroomId: classroomId ? Number(classroomId) : null })
      },
      include: { classroom: true }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah mata pelajaran' }
  }
})
