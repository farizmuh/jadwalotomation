export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)
    const { name, orderIndex } = body

    const updated = await prisma.day.update({
      where: { id },
      data: {
        ...(name && { name: name.trim().toUpperCase() }),
        ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) })
      }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah hari' }
  }
})
