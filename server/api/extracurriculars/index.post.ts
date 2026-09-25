export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, leader, orderIndex, leaders } = body

    if (!name || !String(name).trim()) {
      return { success: false, error: 'Nama ekstrakurikuler harus diisi' }
    }

    let leaderString = ''
    if (Array.isArray(leaders) && leaders.length > 0) {
      leaderString = leaders.map((l: any) => String(l).trim()).filter(Boolean).join(' / ')
    } else if (typeof leader === 'string') {
      leaderString = leader.trim()
    }

    if (!leaderString) {
      leaderString = '-'
    }

    let finalOrderIndex = orderIndex ? Number(orderIndex) : 0
    if (!finalOrderIndex || isNaN(finalOrderIndex)) {
      const maxOrder = await prisma.extracurricular.findFirst({
        orderBy: { orderIndex: 'desc' }
      })
      finalOrderIndex = (maxOrder?.orderIndex || 0) + 1
    }

    const created = await prisma.extracurricular.create({
      data: {
        name: String(name).trim(),
        leader: leaderString,
        orderIndex: finalOrderIndex
      }
    })

    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menambahkan ekstrakurikuler' }
  }
})
