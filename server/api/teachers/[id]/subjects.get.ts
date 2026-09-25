export default defineEventHandler(async (event) => {
  try {
    const teacherId = Number(getRouterParam(event, 'id'))

    const [teacher, subjects, scheduleItems] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.subject.findMany({
        where: { teacherId },
        include: { classroom: true },
        orderBy: { code: 'asc' }
      }),
      prisma.scheduleItem.findMany({
        where: { teacherId },
        include: { classroom: true, timeSlot: true }
      })
    ])

    if (!teacher) {
      return { success: false, error: 'Guru tidak ditemukan' }
    }

    // Calculate scheduled hours per subject code
    const subjectStats = subjects.map((sub) => {
      const scheduledCount = scheduleItems.filter(
        (s) => s.subjectCode?.toLowerCase() === sub.code.toLowerCase()
      ).length
      const remainingJp = Math.max(0, sub.targetJp - scheduledCount)

      return {
        ...sub,
        scheduledJp: scheduledCount,
        remainingJp,
        isCompleted: scheduledCount >= sub.targetJp
      }
    })

    const totalTargetJp = subjects.reduce((sum, s) => sum + s.targetJp, 0)
    const totalScheduledJp = scheduleItems.length
    const totalRemainingJp = Math.max(0, totalTargetJp - totalScheduledJp)

    return {
      success: true,
      data: {
        teacher,
        subjects: subjectStats,
        totalTargetJp,
        totalScheduledJp,
        totalRemainingJp
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat mata pelajaran guru' }
  }
})
