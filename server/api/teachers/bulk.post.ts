export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { teachers } = body

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return { success: false, error: 'Data guru massal tidak boleh kosong' }
    }

    // Fetch all existing teachers to check IDs
    const existingTeachers = await prisma.teacher.findMany({
      select: { id: true, name: true }
    })
    const existingIdSet = new Set(existingTeachers.map((t) => t.id))
    let maxId = existingTeachers.reduce((max, t) => Math.max(max, t.id), 0)

    // Validate and prepare teachers
    const toCreate: Array<{
      id: number
      name: string
      nickname?: string | null
      phone?: string | null
      maxHoursPerWeek: number
      subjects: Array<{
        code: string
        name: string
        targetJp: number
        classroomId?: number | null
      }>
    }> = []

    const usedInBatchIds = new Set<number>()

    for (let i = 0; i < teachers.length; i++) {
      const item = teachers[i]
      const name = item.name ? String(item.name).trim() : ''
      if (!name) {
        continue // Skip empty rows
      }

      let teacherId: number
      if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
        teacherId = Number(item.id)
        if (isNaN(teacherId) || teacherId <= 0) {
          return { success: false, error: `Baris ${i + 1}: Kode Guru '${item.id}' tidak valid (harus angka positif).` }
        }
        if (existingIdSet.has(teacherId)) {
          const existing = existingTeachers.find((t) => t.id === teacherId)
          return {
            success: false,
            error: `Baris ${i + 1}: Kode Guru ${teacherId} sudah digunakan oleh "${existing?.name}". Silakan gunakan kode lain.`
          }
        }
        if (usedInBatchIds.has(teacherId)) {
          return {
            success: false,
            error: `Baris ${i + 1}: Kode Guru ${teacherId} terduplikasi di dalam daftar input massal.`
          }
        }
      } else {
        // Auto-assign next available ID
        do {
          maxId++
        } while (existingIdSet.has(maxId) || usedInBatchIds.has(maxId))
        teacherId = maxId
      }

      usedInBatchIds.add(teacherId)

      // Parse subjects
      const subjects: Array<{
        code: string
        name: string
        targetJp: number
        classroomId?: number | null
      }> = []

      if (Array.isArray(item.subjects) && item.subjects.length > 0) {
        const usedCodes = new Set<string>()
        let nextCharIndex = 0

        for (const sub of item.subjects) {
          const subName = sub.name ? String(sub.name).trim() : ''
          if (!subName) continue

          let subCode = sub.code ? String(sub.code).trim().toLowerCase() : ''
          if (!subCode) {
            // Find next letter a, b, c, ...
            while (nextCharIndex < 26) {
              const char = String.fromCharCode(97 + nextCharIndex)
              nextCharIndex++
              if (!usedCodes.has(char)) {
                subCode = char
                break
              }
            }
            if (!subCode) {
              subCode = `s${subjects.length + 1}`
            }
          }

          if (usedCodes.has(subCode)) {
            // make unique
            subCode = `${subCode}_${subjects.length + 1}`
          }
          usedCodes.add(subCode)

          subjects.push({
            code: subCode,
            name: subName,
            targetJp: sub.targetJp ? Math.max(1, Number(sub.targetJp)) : 4,
            classroomId: sub.classroomId ? Number(sub.classroomId) : null
          })
        }
      }

      toCreate.push({
        id: teacherId,
        name,
        nickname: item.nickname?.trim() || null,
        phone: item.phone?.trim() || null,
        maxHoursPerWeek: item.maxHoursPerWeek ? Number(item.maxHoursPerWeek) : 30,
        subjects
      })
    }

    if (toCreate.length === 0) {
      return { success: false, error: 'Tidak ada data guru yang valid untuk ditambahkan' }
    }

    // Execute in transaction
    const createdCount = await prisma.$transaction(async (tx) => {
      let count = 0
      for (const t of toCreate) {
        await tx.teacher.create({
          data: {
            id: t.id,
            name: t.name,
            nickname: t.nickname,
            phone: t.phone,
            maxHoursPerWeek: t.maxHoursPerWeek,
            ...(t.subjects.length > 0 && {
              subjects: {
                create: t.subjects.map((s) => ({
                  code: s.code,
                  name: s.name,
                  targetJp: s.targetJp,
                  classroomId: s.classroomId
                }))
              }
            })
          }
        })
        count++
      }
      return count
    })

    return {
      success: true,
      message: `Berhasil menambahkan ${createdCount} guru beserta mata pelajarannya!`,
      count: createdCount
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan guru secara massal' }
  }
})
