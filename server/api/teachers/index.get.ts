export default defineEventHandler(async () => {
  const teachers = await prisma.teacher.findMany({
    orderBy: { id: 'asc' },
    include: {
      schedules: {
        include: {
          classroom: true,
          timeSlot: {
            include: { day: true }
          }
        }
      },
      subjects: {
        include: { classroom: true },
        orderBy: { code: 'asc' }
      }
    }
  })
  return { success: true, data: teachers }
})
