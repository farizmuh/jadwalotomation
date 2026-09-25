export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { grade, major, name } = body

    if (!grade || !major) {
      return { success: false, error: 'Tingkat (X/XI/XII) dan Jurusan harus diisi' }
    }

    const count = await prisma.classroom.count()
    const created = await prisma.classroom.create({
      data: {
        grade: grade.trim().toUpperCase(),
        major: major.trim().toUpperCase(),
        name: name ? name.trim() : `${grade.trim().toUpperCase()} ${major.trim().toUpperCase()}`,
        orderIndex: count + 1
      }
    })

    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambah kelas' }
  }
})
