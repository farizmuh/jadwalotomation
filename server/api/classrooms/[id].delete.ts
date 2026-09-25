export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    await prisma.classroom.delete({
      where: { id }
    })
    return { success: true, message: 'Kelas berhasil dihapus' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus kelas' }
  }
})
