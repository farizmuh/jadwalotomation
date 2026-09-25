import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  try {
    const [
      schoolSetting,
      days,
      classrooms,
      teachers,
      extracurriculars,
      scheduleItems
    ] = await Promise.all([
      prisma.schoolSetting.findFirst(),
      prisma.day.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          piket: {
            include: { teacher1: true, teacher2: true }
          },
          timeSlots: { orderBy: { orderIndex: 'asc' } }
        }
      }),
      prisma.classroom.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.teacher.findMany({ orderBy: { id: 'asc' } }),
      prisma.extracurricular.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.scheduleItem.findMany()
    ])

    // Fast map of schedule items: `${timeSlotId}_${classroomId}` -> display text
    const cellMap = new Map<string, string>()
    for (const item of scheduleItems) {
      const key = `${item.timeSlotId}_${item.classroomId}`
      if (item.customLabel) {
        cellMap.set(key, item.customLabel)
      } else if (item.teacherId) {
        const text = `${item.teacherId}${item.subjectCode || ''}`
        cellMap.set(key, text)
      }
    }

    const schoolTitle = schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO'
    const semesterTitle = schoolSetting?.semester || 'SEMESTER GANJIL'
    const yearTitle = schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027'

    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('Jadwal Pelajaran')

    // Page Setup
    ws.pageSetup = {
      orientation: 'landscape',
      paperSize: 9 // A4
    }

    // Set columns width
    ws.columns = [
      { width: 8 },  // Col 1: Jam Ke
      { width: 14 }, // Col 2: Waktu
      ...Array(32).fill({ width: 7 })
    ]

    // Titles
    ws.addRow([])
    const rTitle1 = ws.addRow(['', '', `JADWAL PELAJARAN ${semesterTitle} ${schoolTitle}`])
    rTitle1.font = { bold: true, size: 14 }
    rTitle1.alignment = { horizontal: 'center' }

    const rTitle2 = ws.addRow(['', '', `${yearTitle}`])
    rTitle2.font = { bold: true, size: 12 }
    rTitle2.alignment = { horizontal: 'center' }

    ws.addRow([])

    // Divide days into 2 rows dynamically
    const half = Math.ceil(days.length / 2)
    const topDays = days.slice(0, half)
    const bottomDays = days.slice(half)

    const rowDayHeader: string[] = ['JAM KE', 'WAKTU']
    for (const d of topDays) {
      rowDayHeader.push(d.name)
      for (let i = 1; i < classrooms.length; i++) rowDayHeader.push('')
    }
    const rDay = ws.addRow(rowDayHeader)
    rDay.font = { bold: true, size: 11 }
    rDay.alignment = { horizontal: 'center', vertical: 'middle' }

    const rowGradeHeader: string[] = ['', '']
    for (let d = 0; d < topDays.length; d++) {
      rowGradeHeader.push('X', '', '', 'XI', '', '', 'XII', '', '', '')
    }
    const rGrade = ws.addRow(rowGradeHeader)
    rGrade.font = { bold: true, size: 10 }
    rGrade.alignment = { horizontal: 'center' }

    const rowMajorHeader: string[] = ['', '']
    for (let d = 0; d < topDays.length; d++) {
      for (const cls of classrooms) {
        rowMajorHeader.push(cls.major)
      }
    }
    const rMajor = ws.addRow(rowMajorHeader)
    rMajor.font = { bold: true, size: 10 }
    rMajor.alignment = { horizontal: 'center' }

    // Rows: Time slots
    const maxSlots = Math.max(...topDays.map((d) => d.timeSlots.length), 0)
    for (let slotIdx = 0; slotIdx < maxSlots; slotIdx++) {
      const refSlot = topDays[0]?.timeSlots[slotIdx]
      const periodLabel = refSlot?.period ? String(refSlot.period) : ''
      const timeLabel = refSlot ? refSlot.timeDisplay : ''

      const rowSlots: string[] = [periodLabel, timeLabel]

      for (const d of topDays) {
        const slot = d.timeSlots[slotIdx]
        if (!slot) {
          for (let i = 0; i < classrooms.length; i++) rowSlots.push('')
          continue
        }

        if (slot.slotType === 'BREAK') {
          for (let i = 0; i < classrooms.length; i++) {
            rowSlots.push(i === 0 ? 'ISTIRAHAT' : '')
          }
        } else if (slot.slotType === 'CEREMONY') {
          for (let i = 0; i < classrooms.length; i++) {
            rowSlots.push(i === 0 ? (slot.label || 'UPACARA/PEMBINAAN WALI KELAS/ APEL') : '')
          }
        } else {
          for (const cls of classrooms) {
            const key = `${slot.id}_${cls.id}`
            rowSlots.push(cellMap.get(key) || '')
          }
        }
      }
      const r = ws.addRow(rowSlots)
      r.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    // Piket Pengajar Top
    const rowPiketTop: string[] = ['Piket Pengajar', '']
    for (const d of topDays) {
      const p1 = d.piket?.teacher1?.name || d.piket?.teacher1Name || '-'
      const p2 = d.piket?.teacher2?.name || d.piket?.teacher2Name || '-'
      rowPiketTop.push(`${p1} / ${p2}`)
      for (let i = 1; i < classrooms.length; i++) rowPiketTop.push('')
    }
    const rPiketTop = ws.addRow(rowPiketTop)
    rPiketTop.font = { bold: true, size: 9 }
    rPiketTop.alignment = { horizontal: 'center' }

    ws.addRow([])

    // Block 2: Bottom Days + Pembina

    const rowDayHeaderBottom: string[] = ['JAM KE', 'WAKTU']
    for (const d of bottomDays) {
      rowDayHeaderBottom.push(d.name)
      for (let i = 1; i < classrooms.length; i++) rowDayHeaderBottom.push('')
    }
    rowDayHeaderBottom.push('Pembina', 'Nama Pembina')
    const rDayB = ws.addRow(rowDayHeaderBottom)
    rDayB.font = { bold: true, size: 11 }
    rDayB.alignment = { horizontal: 'center' }

    const rowGradeBottom: string[] = ['', '']
    for (let d = 0; d < bottomDays.length; d++) {
      rowGradeBottom.push('X', '', '', 'XI', '', '', 'XII', '', '', '')
    }
    const rGradeB = ws.addRow(rowGradeBottom)
    rGradeB.font = { bold: true, size: 10 }
    rGradeB.alignment = { horizontal: 'center' }

    const rowMajorBottom: string[] = ['', '']
    for (let d = 0; d < bottomDays.length; d++) {
      for (const cls of classrooms) rowMajorBottom.push(cls.major)
    }
    const rMajorB = ws.addRow(rowMajorBottom)
    rMajorB.font = { bold: true, size: 10 }
    rMajorB.alignment = { horizontal: 'center' }

    const maxSlotsBottom = Math.max(...bottomDays.map((d) => d.timeSlots.length))
    for (let slotIdx = 0; slotIdx < maxSlotsBottom; slotIdx++) {
      const refSlot = bottomDays[0]?.timeSlots[slotIdx]
      const periodLabel = refSlot?.period ? String(refSlot.period) : ''
      const timeLabel = refSlot ? refSlot.timeDisplay : ''

      const rowSlots: string[] = [periodLabel, timeLabel]

      for (const d of bottomDays) {
        const slot = d.timeSlots[slotIdx]
        if (!slot) {
          for (let i = 0; i < classrooms.length; i++) rowSlots.push('')
          continue
        }

        if (slot.slotType === 'BREAK') {
          for (let i = 0; i < classrooms.length; i++) {
            rowSlots.push(i === 0 ? 'ISTIRAHAT' : '')
          }
        } else if (slot.slotType === 'FRIDAY_PRAYER') {
          for (let i = 0; i < classrooms.length; i++) {
            rowSlots.push(i === 0 ? "SHOLAT JUM'AT/ KEPUTRIAN" : '')
          }
        } else {
          for (const cls of classrooms) {
            const key = `${slot.id}_${cls.id}`
            rowSlots.push(cellMap.get(key) || '')
          }
        }
      }

      // Add Pembina
      const ekskul = extracurriculars[slotIdx]
      if (ekskul) {
        rowSlots.push(ekskul.name, `: ${ekskul.leader}`)
      } else {
        rowSlots.push('', '')
      }

      const r = ws.addRow(rowSlots)
      r.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    // Piket Pengajar Bottom
    const rowPiketBottom: string[] = ['Piket Pengajar', '']
    for (const d of bottomDays) {
      const p1 = d.piket?.teacher1?.name || d.piket?.teacher1Name || '-'
      const p2 = d.piket?.teacher2?.name || d.piket?.teacher2Name || '-'
      rowPiketBottom.push(`${p1} / ${p2}`)
      for (let i = 1; i < classrooms.length; i++) rowPiketBottom.push('')
    }
    const rPiketBot = ws.addRow(rowPiketBottom)
    rPiketBot.font = { bold: true, size: 9 }
    rPiketBot.alignment = { horizontal: 'center' }

    ws.addRow([])

    // Block 3: Kode Guru
    const rKodeTitle = ws.addRow(['KODE GURU :'])
    rKodeTitle.font = { bold: true, size: 11 }

    const chunkSize = Math.ceil(teachers.length / 4)
    for (let i = 0; i < chunkSize; i++) {
      const rowTeacher: string[] = []
      for (let col = 0; col < 4; col++) {
        const tIndex = col * chunkSize + i
        const t = teachers[tIndex]
        if (t) {
          rowTeacher.push(String(t.id), t.name)
        } else {
          rowTeacher.push('', '')
        }
      }
      const r = ws.addRow(rowTeacher)
      r.font = { size: 9 }
    }

    // Signatures
    ws.addRow([])
    ws.addRow([])
    ws.addRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', schoolSetting?.dateLocation || 'Donomulyo, 13 Juni 2026'])
    const rTtdTitle = ws.addRow(['', '', '', '', 'Kepala Sekolah', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Wakakur'])
    rTtdTitle.font = { bold: true }
    ws.addRow([])
    ws.addRow([])
    const rTtdName = ws.addRow(['', '', '', '', schoolSetting?.headmasterName || "IMAM SAFI'I, S.Pd., M.Si", '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', schoolSetting?.curriculumHeadName || 'WAHYU DIAN PERMANA, S.Pd'])
    rTtdName.font = { bold: true, underline: true }

    const buffer = await workbook.xlsx.writeBuffer()

    setResponseHeaders(event, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Jadwal_Pelajaran_SMKS_Islam_Donomulyo.xlsx"'
    })

    return buffer
  } catch (error: any) {
    console.error('Error exporting excel:', error)
    return {
      success: false,
      error: error.message || 'Gagal export file excel'
    }
  }
})
