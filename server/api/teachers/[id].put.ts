export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    const body = await readBody(event)
    const { newId, name, nickname, phone, maxHoursPerWeek, isActive } = body

    const existingTeacher = await prisma.teacher.findUnique({
      where: { id }
    })
    if (!existingTeacher) {
      return { success: false, error: 'Guru tidak ditemukan' }
    }

    // If changing teacher ID (Kode Guru)
    if (newId && Number(newId) !== id) {
      const targetId = Number(newId)
      const duplicate = await prisma.teacher.findUnique({
        where: { id: targetId }
      })
      if (duplicate) {
        return { success: false, error: `Kode Guru ${targetId} sudah digunakan oleh ${duplicate.name}` }
      }

      // Execute transaction to migrate references and update teacher ID
      await prisma.$transaction(async (tx) => {
        // 1. Create teacher with newId and copy info
        await tx.teacher.create({
          data: {
            id: targetId,
            name: name ? name.trim() : existingTeacher.name,
            nickname: nickname !== undefined ? nickname?.trim() || null : existingTeacher.nickname,
            phone: phone !== undefined ? phone?.trim() || null : existingTeacher.phone,
            maxHoursPerWeek: maxHoursPerWeek !== undefined ? Number(maxHoursPerWeek) : existingTeacher.maxHoursPerWeek,
            isActive: isActive !== undefined ? Boolean(isActive) : existingTeacher.isActive
          }
        })

        // 2. Update schedules
        await tx.scheduleItem.updateMany({
          where: { teacherId: id },
          data: { teacherId: targetId }
        })

        // 3. Update subjects
        await tx.subject.updateMany({
          where: { teacherId: id },
          data: { teacherId: targetId }
        })

        // 4. Update piket
        await tx.teacherPiket.updateMany({
          where: { teacher1Id: id },
          data: { teacher1Id: targetId }
        })
        await tx.teacherPiket.updateMany({
          where: { teacher2Id: id },
          data: { teacher2Id: targetId }
        })

        // 5. Delete old teacher record
        await tx.teacher.delete({
          where: { id }
        })
      })

      const finalTeacher = await prisma.teacher.findUnique({
        where: { id: targetId },
        include: { subjects: true }
      })

      return {
        success: true,
        data: finalTeacher,
        message: `Kode Guru berhasil diubah dari ${id} menjadi ${targetId}`
      }
    }

    // Normal update (no ID change)
    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(nickname !== undefined && { nickname: nickname?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(maxHoursPerWeek !== undefined && { maxHoursPerWeek: Number(maxHoursPerWeek) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      },
      include: { subjects: true }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error updating teacher:', error)
    return { success: false, error: error.message || 'Gagal update data guru' }
  }
})
