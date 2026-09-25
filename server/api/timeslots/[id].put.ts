export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)
    const { period, timeStart, timeEnd, slotType, label } = body

    const existing = await prisma.timeSlot.findUnique({
      where: { id }
    })
    if (!existing) {
      return { success: false, error: 'Jam waktu tidak ditemukan' }
    }

    const tStart = timeStart !== undefined ? timeStart.trim() : existing.timeStart
    const tEnd = timeEnd !== undefined ? timeEnd.trim() : existing.timeEnd
    const tDisplay = `${tStart} - ${tEnd}`

    const updated = await prisma.timeSlot.update({
      where: { id },
      data: {
        period: period !== undefined ? (period ? Number(period) : null) : existing.period,
        timeStart: tStart,
        timeEnd: tEnd,
        timeDisplay: tDisplay,
        slotType: slotType !== undefined ? slotType : existing.slotType,
        label: label !== undefined ? (label ? label.trim() : null) : existing.label
      }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah jam waktu' }
  }
})
