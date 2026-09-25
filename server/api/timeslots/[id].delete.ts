export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    await prisma.timeSlot.delete({
      where: { id }
    })
    return { success: true, message: 'Jam waktu berhasil dihapus' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus jam waktu' }
  }
})
