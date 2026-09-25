export default defineEventHandler(async () => {
  try {
    const list = await prisma.extracurricular.findMany({
      orderBy: { orderIndex: 'asc' }
    })
    return { success: true, data: list }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat data ekstrakurikuler' }
  }
})
