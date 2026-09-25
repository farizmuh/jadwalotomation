export default defineEventHandler(async () => {
  const days = await prisma.day.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      timeSlots: {
        orderBy: { orderIndex: 'asc' }
      }
    }
  })
  return { success: true, data: days }
})
