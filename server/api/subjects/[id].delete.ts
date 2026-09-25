export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, 'id'))
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        teacher: {
          include: { subjects: true }
        }
      }
    })

    if (!subject) {
      return { success: false, error: 'Mata pelajaran tidak ditemukan' }
    }

    // Check if teacher has schedules using this subject code
    const schedulesUsingSubject = await prisma.scheduleItem.findMany({
      where: {
        teacherId: subject.teacherId,
        subjectCode: subject.code
      }
    })

    if (schedulesUsingSubject.length > 0) {
      return {
        success: false,
        error: `Mata pelajaran '${subject.name}' (kode: ${subject.code}) sedang digunakan di ${schedulesUsingSubject.length} slot jadwal pelajaran. Kosongkan jadwal tersebut terlebih dahulu sebelum menghapus mapel ini.`
      }
    }

    await prisma.subject.delete({
      where: { id }
    })
    return { success: true, message: 'Mata pelajaran berhasil dihapus' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus mata pelajaran' }
  }
})
