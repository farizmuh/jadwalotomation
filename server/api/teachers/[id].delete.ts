export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    await prisma.teacher.delete({
      where: { id }
    })
    return { success: true, message: 'Guru berhasil dihapus' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus guru' }
  }
})
