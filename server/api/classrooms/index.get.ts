export default defineEventHandler(async () => {
  const classrooms = await prisma.classroom.findMany({
    orderBy: { orderIndex: 'asc' }
  })
  return { success: true, data: classrooms }
})
