export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    if (!id || isNaN(id)) {
      return { success: false, error: 'ID ekstrakurikuler tidak valid' }
    }

    await prisma.extracurricular.delete({
      where: { id }
    })

    return { success: true, message: 'Ekstrakurikuler berhasil dihapus' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus ekstrakurikuler' }
  }
})
