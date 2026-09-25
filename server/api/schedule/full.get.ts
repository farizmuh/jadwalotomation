export default defineEventHandler(async () => {
  try {
    const [
      schoolSetting,
      days,
      classrooms,
      teachers,
      extracurriculars,
      scheduleItems
    ] = await Promise.all([
      prisma.schoolSetting.findFirst(),
      prisma.day.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          piket: {
            include: {
              teacher1: true,
              teacher2: true
            }
          },
          timeSlots: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }),
      prisma.classroom.findMany({
        orderBy: { orderIndex: 'asc' }
      }),
      prisma.teacher.findMany({
        orderBy: { id: 'asc' },
        include: {
          subjects: {
            include: { classroom: true },
            orderBy: { code: 'asc' }
          }
        }
      }),
      prisma.extracurricular.findMany({
        orderBy: { orderIndex: 'asc' }
      }),
      prisma.scheduleItem.findMany({
        include: {
          teacher: true,
          classroom: true,
          timeSlot: true,
          subject: true
        }
      })
    ])

    const conflicts = await detectScheduleConflicts()

    return {
      success: true,
      data: {
        schoolSetting,
        days,
        classrooms,
        teachers,
        extracurriculars,
        scheduleItems,
        conflicts
      }
    }
  } catch (error: any) {
    console.error('Error fetching full schedule:', error)
    return {
      success: false,
      error: error.message || 'Gagal memuat jadwal'
    }
  }
})
