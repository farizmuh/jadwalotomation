export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    await prisma.day.delete({
      where: { id }
    })
    return { success: true, message: 'Hari berhasil dihapus' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus hari' }
  }
})
