export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    if (!id || isNaN(id)) {
      return { success: false, error: 'ID ekstrakurikuler tidak valid' }
    }

    const body = await readBody(event)
    const { name, leader, orderIndex, leaders } = body

    if (!name || !String(name).trim()) {
      return { success: false, error: 'Nama ekstrakurikuler harus diisi' }
    }

    let leaderString = ''
    if (Array.isArray(leaders)) {
      leaderString = leaders.map((l: any) => String(l).trim()).filter(Boolean).join(' / ')
    } else if (typeof leader === 'string') {
      leaderString = leader.trim()
    }

    if (!leaderString) {
      leaderString = '-'
    }

    const updated = await prisma.extracurricular.update({
      where: { id },
      data: {
        name: String(name).trim(),
        leader: leaderString,
        ...(orderIndex !== undefined && !isNaN(Number(orderIndex)) && { orderIndex: Number(orderIndex) })
      }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memperbarui data ekstrakurikuler' }
  }
})
