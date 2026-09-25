export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { timeSlotId, classroomId, teacherId, subjectCode, customLabel, allowConflict } = body

    if (!timeSlotId || !classroomId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'timeSlotId dan classroomId harus disertakan'
      })
    }

    // Validate teacher has registered subjects and valid subjectCode
    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: Number(teacherId) },
        include: { subjects: true }
      })

      if (!teacher) {
        return {
          success: false,
          error: 'Guru tidak ditemukan di sistem'
        }
      }

      if (!teacher.subjects || teacher.subjects.length === 0) {
        // Non-teaching teacher (Kepala Sekolah, TU, etc.)
        // Allowed if customLabel is provided (e.g. for ceremonies, briefings, or events)
        if (!customLabel || !String(customLabel).trim()) {
          return {
            success: false,
            error: `Guru ${teacher.name} terdaftar sebagai Non-Pengajar (tidak memiliki mata pelajaran). Untuk menjadwalkan kegiatan khusus, silakan isi kolom Teks Kustom (misal: PEMBINA APEL/UPACARA) atau daftarkan mata pelajarannya di menu Pengaturan.`
          }
        }
      } else {
        // Teacher has registered subjects -> must select a valid subject
        if (!subjectCode || !String(subjectCode).trim()) {
          return {
            success: false,
            error: `Wajib memilih mata pelajaran untuk guru ${teacher.name}. Tidak boleh mengisi jadwal tanpa memilih mapel.`
          }
        }

        const cleanCode = String(subjectCode).trim().toLowerCase()
        const matchingSubject = teacher.subjects.find((s) => s.code.toLowerCase() === cleanCode)
        if (!matchingSubject) {
          return {
            success: false,
            error: `Kode mapel '${cleanCode}' tidak terdaftar pada guru ${teacher.name}. Silakan pilih mapel yang tersedia.`
          }
        }
      }

      // Anti-collision check if a teacher is assigned
      const existingInSameSlot = await prisma.scheduleItem.findFirst({
        where: {
          timeSlotId: Number(timeSlotId),
          teacherId: Number(teacherId),
          classroomId: { not: Number(classroomId) }
        },
        include: {
          classroom: true,
          teacher: true,
          timeSlot: {
            include: { day: true }
          }
        }
      })

      if (existingInSameSlot && !allowConflict) {
        return {
          success: false,
          conflict: true,
          message: `TABRAKAN JADWAL: Guru ${existingInSameSlot.teacher?.name || '#' + teacherId} sudah terjadwal di kelas ${existingInSameSlot.classroom.name} pada ${existingInSameSlot.timeSlot.day.name} Jam ke-${existingInSameSlot.timeSlot.period || '-'} (${existingInSameSlot.timeSlot.timeDisplay})!`,
          conflictDetails: {
            conflictingClassroom: existingInSameSlot.classroom.name,
            dayName: existingInSameSlot.timeSlot.day.name,
            period: existingInSameSlot.timeSlot.period
          }
        }
      }
    }

    // Upsert the schedule item
    const updated = await prisma.scheduleItem.upsert({
      where: {
        timeSlotId_classroomId: {
          timeSlotId: Number(timeSlotId),
          classroomId: Number(classroomId)
        }
      },
      update: {
        teacherId: teacherId ? Number(teacherId) : null,
        subjectCode: subjectCode ? String(subjectCode).trim().toLowerCase() : null,
        customLabel: customLabel ? String(customLabel).trim() : null
      },
      create: {
        timeSlotId: Number(timeSlotId),
        classroomId: Number(classroomId),
        teacherId: teacherId ? Number(teacherId) : null,
        subjectCode: subjectCode ? String(subjectCode).trim().toLowerCase() : null,
        customLabel: customLabel ? String(customLabel).trim() : null
      },
      include: {
        teacher: true,
        classroom: true,
        timeSlot: true
      }
    })

    return {
      success: true,
      data: updated
    }
  } catch (error: any) {
    console.error('Error updating schedule slot:', error)
    return {
      success: false,
      error: error.message || 'Gagal menyimpan slot jadwal'
    }
  }
})
