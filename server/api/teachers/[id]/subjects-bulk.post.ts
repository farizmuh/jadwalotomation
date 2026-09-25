export default defineEventHandler(async (event) => {
  try {
    const teacherId = Number(getRouterParam(event, 'id'))
    if (!teacherId || isNaN(teacherId)) {
      return { success: false, error: 'ID guru tidak valid' }
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { subjects: true }
    })

    if (!teacher) {
      return { success: false, error: 'Guru tidak ditemukan' }
    }

    const body = await readBody(event)
    const { subjects } = body

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return { success: false, error: 'Daftar mata pelajaran tidak boleh kosong' }
    }

    const existingCodes = new Set(teacher.subjects.map((s) => s.code.toLowerCase()))
    let alphabetIdx = 0

    const toCreate: Array<{
      teacherId: number
      code: string
      name: string
      targetJp: number
      classroomId: number | null
    }> = []

    for (let i = 0; i < subjects.length; i++) {
      const sub = subjects[i]
      const name = sub.name ? String(sub.name).trim() : ''
      if (!name) continue

      let code = sub.code ? String(sub.code).trim().toLowerCase() : ''
      if (!code) {
        while (alphabetIdx < 26) {
          const char = String.fromCharCode(97 + alphabetIdx)
          alphabetIdx++
          if (!existingCodes.has(char)) {
            code = char
            break
          }
        }
        if (!code) {
          code = `s${existingCodes.size + 1}`
        }
      }

      if (existingCodes.has(code)) {
        return {
          success: false,
          error: `Kode '${code}' untuk mapel "${name}" sudah terdaftar untuk guru ${teacher.name}. Gunakan kode huruf lain.`
        }
      }

      existingCodes.add(code)
      toCreate.push({
        teacherId,
        code,
        name,
        targetJp: sub.targetJp ? Math.max(1, Number(sub.targetJp)) : 4,
        classroomId: sub.classroomId ? Number(sub.classroomId) : null
      })
    }

    if (toCreate.length === 0) {
      return { success: false, error: 'Tidak ada data mata pelajaran valid yang dapat ditambahkan' }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of toCreate) {
        await tx.subject.create({
          data: item
        })
      }
    })

    return {
      success: true,
      message: `Berhasil menambahkan ${toCreate.length} mata pelajaran baru untuk ${teacher.name}!`,
      count: toCreate.length
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan mata pelajaran massal' }
  }
})
