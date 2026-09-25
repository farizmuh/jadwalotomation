export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { dayId, period, timeStart, timeEnd, slotType, label } = body

    if (!dayId || !timeStart || !timeEnd) {
      return { success: false, error: 'Hari, waktu mulai, dan waktu selesai harus diisi' }
    }

    const count = await prisma.timeSlot.count({
      where: { dayId: Number(dayId) }
    })

    const created = await prisma.timeSlot.create({
      data: {
        dayId: Number(dayId),
        period: period ? Number(period) : null,
        timeStart: timeStart.trim(),
        timeEnd: timeEnd.trim(),
        timeDisplay: `${timeStart.trim()} - ${timeEnd.trim()}`,
        slotType: slotType || 'LESSON',
        label: label ? label.trim() : null,
        orderIndex: count + 1
      }
    })

    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambah jam waktu' }
  }
})
