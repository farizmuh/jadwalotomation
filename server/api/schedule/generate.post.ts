export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event).catch(() => ({}))
    const { overwriteAll = false } = body

    // 1. Fetch all days, timeslots, classrooms, teachers
    const [days, classrooms, teachers] = await Promise.all([
      prisma.day.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          timeSlots: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }),
      prisma.classroom.findMany({
        orderBy: { orderIndex: 'asc' }
      }),
      prisma.teacher.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' }
      })
    ])

    if (!teachers.length || !classrooms.length) {
      return {
        success: false,
        error: 'Data guru atau kelas tidak mencukupi untuk generate otomatis.'
      }
    }

    if (overwriteAll) {
      // Clear non-ceremony/break items
      const lessonSlots = await prisma.timeSlot.findMany({
        where: { slotType: 'LESSON' },
        select: { id: true }
      })
      const lessonSlotIds = lessonSlots.map((s) => s.id)
      await prisma.scheduleItem.deleteMany({
        where: { timeSlotId: { in: lessonSlotIds } }
      })
    }

    // Common subject codes in SMK
    const subjectCodes = ['a', 'b', 'c', 'd', 'e', 'f', '']

    // Keep track of assignments per teacher to balance workload
    const teacherHourCount = new Map<number, number>()
    for (const t of teachers) {
      teacherHourCount.set(t.id, 0)
    }

    // Generate schedule slot by slot
    let generatedCount = 0

    for (const day of days) {
      for (const slot of day.timeSlots) {
        // Skip break or special fixed slots
        if (slot.slotType !== 'LESSON') continue

        // Set of teachers already assigned in THIS exact slot across all classrooms
        const busyTeachersInSlot = new Set<number>()

        // Check if there are already existing items for this slot
        const existingInSlot = await prisma.scheduleItem.findMany({
          where: { timeSlotId: slot.id }
        })
        for (const item of existingInSlot) {
          if (item.teacherId) {
            busyTeachersInSlot.add(item.teacherId)
          }
        }

        // Now iterate over each classroom
        for (const cls of classrooms) {
          const alreadyAssigned = existingInSlot.find((i) => i.classroomId === cls.id)
          if (alreadyAssigned && !overwriteAll && alreadyAssigned.teacherId) {
            continue
          }

          // Pick an available teacher who is NOT busy in this slot
          // Sort available teachers by fewest hours assigned (load balancing)
          const availableTeachers = teachers
            .filter((t) => !busyTeachersInSlot.has(t.id))
            .sort((a, b) => {
              const countA = teacherHourCount.get(a.id) || 0
              const countB = teacherHourCount.get(b.id) || 0
              return countA - countB
            })

          if (availableTeachers.length > 0) {
            // Pick from the top 3 least loaded teachers to add diversity
            const topCandidatePool = availableTeachers.slice(0, Math.min(4, availableTeachers.length))
            const chosenTeacher = topCandidatePool[Math.floor(Math.random() * topCandidatePool.length)]
            const chosenSubjectCode = subjectCodes[Math.floor(Math.random() * subjectCodes.length)]

            busyTeachersInSlot.add(chosenTeacher.id)
            teacherHourCount.set(chosenTeacher.id, (teacherHourCount.get(chosenTeacher.id) || 0) + 1)

            await prisma.scheduleItem.upsert({
              where: {
                timeSlotId_classroomId: {
                  timeSlotId: slot.id,
                  classroomId: cls.id
                }
              },
              update: {
                teacherId: chosenTeacher.id,
                subjectCode: chosenSubjectCode || null,
                customLabel: null
              },
              create: {
                timeSlotId: slot.id,
                classroomId: cls.id,
                teacherId: chosenTeacher.id,
                subjectCode: chosenSubjectCode || null
              }
            })

            generatedCount++
          }
        }
      }
    }

    return {
      success: true,
      message: `Berhasil men-generate ${generatedCount} slot jadwal secara otomatis tanpa tabrakan!`,
      generatedCount
    }
  } catch (error: any) {
    console.error('Error generating schedule:', error)
    return {
      success: false,
      error: error.message || 'Gagal generate jadwal'
    }
  }
})
