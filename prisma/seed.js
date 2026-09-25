import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper to parse cell string like "9a" -> { teacherId: 9, subjectCode: "a" } or "8" -> { teacherId: 8, subjectCode: null }
function parseCode(cell) {
  if (!cell || typeof cell !== 'string') return null
  const trimmed = cell.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d+)([a-zA-Z]*)$/)
  if (match) {
    return {
      teacherId: parseInt(match[1], 10),
      subjectCode: match[2] ? match[2].toLowerCase() : null
    }
  }
  return { customLabel: trimmed }
}

async function main() {
  console.log('Seeding database with exact schedule data...')

  // Clear existing
  await prisma.scheduleItem.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.teacherPiket.deleteMany()
  await prisma.day.deleteMany()
  await prisma.classroom.deleteMany()
  await prisma.teacher.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.extracurricular.deleteMany()
  await prisma.schoolSetting.deleteMany()

  // 1. School Setting
  await prisma.schoolSetting.create({
    data: {
      schoolName: 'SMKS ISLAM DONOMULYO',
      semester: 'SEMESTER GANJIL',
      academicYear: 'TAHUN AJARAN 2026-2027',
      headmasterName: "IMAM SAFI'I, S.Pd., M.Si",
      curriculumHeadName: 'WAHYU DIAN PERMANA, S.Pd',
      dateLocation: 'Donomulyo, 13 Juni 2026'
    }
  })

  // 2. Teachers (1 - 29)
  const teachersData = [
    { id: 1, name: "Imam Safi'i, S.Pd., M.Si" },
    { id: 2, name: 'Marry Rosewati, S.Pd' },
    { id: 3, name: 'Farikin, S.Pd' },
    { id: 4, name: 'Intan Rusmawati, S.Pd' },
    { id: 5, name: 'Widodo Adi Cahyo, A.Md' },
    { id: 6, name: 'Delis Eko A., S.Psi' },
    { id: 7, name: 'Santika Khusnul H., A.Md' },
    { id: 8, name: 'Yeni Maria Suciati, S.Pd' },
    { id: 9, name: 'Afifah Yuhalsara, S.Pd' },
    { id: 10, name: 'Veronicka Andriana N., S.Pd' },
    { id: 11, name: 'Ikhlas Bahtiyar, S.Sos' },
    { id: 12, name: 'Meylika Nurul Irawati, S.Pd' },
    { id: 13, name: 'Endik Hadi Suyitno, S.Pd' },
    { id: 14, name: 'Rosyda Azzahro, S.Pd., M.Pd' },
    { id: 15, name: 'Tasseri, S.Pd' },
    { id: 16, name: 'Vinda Vebri Atmasari, S.E' },
    { id: 17, name: 'Riza Supriana, S.E' },
    { id: 18, name: 'Wahyu Dian Permana, S.Pd' },
    { id: 19, name: 'Vina Noviyanti, S.Pd' },
    { id: 20, name: 'Mamluk Athul Karomah, S.Pd' },
    { id: 21, name: 'Kukuh Panca Setyawan, S.Pd' },
    { id: 22, name: 'Himma Anisa Sadiyah Fatmawati' },
    { id: 23, name: 'Ika Lestari, S.E' },
    { id: 24, name: "Atsilla Farkhanul Sa'daan" },
    { id: 25, name: 'Fesa Dwi Cahyo, S.Kom' },
    { id: 26, name: 'Munif Lailatul K' },
    { id: 27, name: 'Iqbal Gunawan' },
    { id: 28, name: 'Faris M. Rayhan' },
    { id: 29, name: 'Elan Zulkarnain' }
  ]

  for (const t of teachersData) {
    await prisma.teacher.create({ data: t })
  }

  // 3. Classrooms (10 columns)
  const classesData = [
    { grade: 'X', major: 'BDP', name: 'X BDP', orderIndex: 1 },
    { grade: 'X', major: 'TKJ', name: 'X TKJ', orderIndex: 2 },
    { grade: 'X', major: 'MP', name: 'X MP', orderIndex: 3 },
    { grade: 'XI', major: 'BDP', name: 'XI BDP', orderIndex: 4 },
    { grade: 'XI', major: 'TKJ', name: 'XI TKJ', orderIndex: 5 },
    { grade: 'XI', major: 'MP', name: 'XI MP', orderIndex: 6 },
    { grade: 'XII', major: 'BDP', name: 'XII BDP', orderIndex: 7 },
    { grade: 'XII', major: 'T1', name: 'XII T1', orderIndex: 8 },
    { grade: 'XII', major: 'T2', name: 'XII T2', orderIndex: 9 },
    { grade: 'XII', major: 'MP', name: 'XII MP', orderIndex: 10 }
  ]

  const createdClasses = []
  for (const c of classesData) {
    const item = await prisma.classroom.create({ data: c })
    createdClasses.push(item)
  }

  // 4. Extracurriculars
  const pembinaData = [
    { name: 'BTQ', leader: 'Ikhlas Bahtiyar, S.Sos', orderIndex: 1 },
    { name: 'ECC', leader: 'Elan Zulkarnain', orderIndex: 2 },
    { name: 'BDI', leader: 'Ikhlas Bahtiyar, S.Sos', orderIndex: 3 },
    { name: 'BANJARI', leader: 'Mamluk Athul Karomah, S.Pd', orderIndex: 4 },
    { name: 'BES', leader: 'Kukuh Panca Setyawan, S.Pd', orderIndex: 5 },
    { name: 'MUSIK', leader: 'Fesa Dwi Cahyo, S.Kom', orderIndex: 6 },
    { name: 'PMR', leader: 'Munif Lailatul K', orderIndex: 7 },
    { name: 'TARI', leader: 'Ika Lestari, S.E', orderIndex: 8 },
    { name: 'OR', leader: 'Tasseri, S.Pd', orderIndex: 9 },
    { name: 'Pramuka', leader: 'Ikhlas Bahtiyar, S.Sos / Santika Khusnul H, A.Md', orderIndex: 10 },
    { name: 'Bug Bou', leader: 'Faris M. Rayhan', orderIndex: 11 },
    { name: 'Jurnalistik', leader: "Atsilla Farkhanul Sa'daan", orderIndex: 12 }
  ]
  for (const p of pembinaData) {
    await prisma.extracurricular.create({ data: p })
  }

  // 5. Days & TimeSlots Definition
  const daysConfig = [
    {
      name: 'SENIN',
      orderIndex: 1,
      piket: { teacher1Id: 25, teacher2Id: 21 },
      slots: [
        { period: 1, timeStart: '07.00', timeEnd: '07.45', timeDisplay: '07.00 - 07.45', slotType: 'CEREMONY', label: 'UPACARA/PEMBINAAN WALI KELAS/ APEL' },
        { period: 2, timeStart: '07.45', timeEnd: '08.30', timeDisplay: '07.45 - 08.30', slotType: 'LESSON' },
        { period: 3, timeStart: '08.30', timeEnd: '09.15', timeDisplay: '08.30 - 09.15', slotType: 'LESSON' },
        { period: null, timeStart: '09.15', timeEnd: '09.30', timeDisplay: '09.15 - 09.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 4, timeStart: '09.30', timeEnd: '10.15', timeDisplay: '09.30 - 10.15', slotType: 'LESSON' },
        { period: 5, timeStart: '10.15', timeEnd: '11.00', timeDisplay: '10.15 - 11.00', slotType: 'LESSON' },
        { period: 6, timeStart: '11.00', timeEnd: '11.45', timeDisplay: '11.00 - 11.45', slotType: 'LESSON' },
        { period: null, timeStart: '11.45', timeEnd: '12.30', timeDisplay: '11.45 - 12.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 7, timeStart: '12.30', timeEnd: '13.15', timeDisplay: '12.30 - 13.15', slotType: 'LESSON' },
        { period: 8, timeStart: '13.15', timeEnd: '14.00', timeDisplay: '13.15 - 14.00', slotType: 'LESSON' },
        { period: 9, timeStart: '14.00', timeEnd: '14.45', timeDisplay: '14.00 - 14.45', slotType: 'LESSON' }
      ],
      // Row by row values for the 10 classes
      grid: {
        1: ['UPACARA', 'UPACARA', 'UPACARA', 'UPACARA', 'UPACARA', 'UPACARA', 'UPACARA', 'UPACARA', 'UPACARA', 'UPACARA'],
        2: ['3', '9a', '8', '2c', '20', '15', '16d', '21', '18', '17e'],
        3: ['3', '9a', '8', '2c', '20', '15', '16d', '21', '18', '17e'],
        4: ['5', '3', '8', '2c', '12b', '17d', '20', '4', '18', '19d'],
        5: ['5', '3', '9b', '18', '12b', '17d', '20', '4', '13', '19d'],
        6: ['5', '11b', '9b', '18', '12b', '17d', '10', '4', '13', '19d'],
        7: ['5', '11b', '9b', '18', '12b', '14', '10', '13', '25b', '4'],
        8: ['11b', '17c', '27b', '21', '5', '14', '10', '13', '25b', '4'],
        9: ['11b', '17c', '27b', '21', '5', '14', '10', '13', '25b', '4']
      }
    },
    {
      name: 'SELASA',
      orderIndex: 2,
      piket: { teacher1Id: 23, teacher2Id: 28 },
      slots: [
        { period: 1, timeStart: '07.00', timeEnd: '07.45', timeDisplay: '07.00 - 07.45', slotType: 'LESSON' },
        { period: 2, timeStart: '07.45', timeEnd: '08.30', timeDisplay: '07.45 - 08.30', slotType: 'LESSON' },
        { period: 3, timeStart: '08.30', timeEnd: '09.15', timeDisplay: '08.30 - 09.15', slotType: 'LESSON' },
        { period: null, timeStart: '09.15', timeEnd: '09.30', timeDisplay: '09.15 - 09.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 4, timeStart: '09.30', timeEnd: '10.15', timeDisplay: '09.30 - 10.15', slotType: 'LESSON' },
        { period: 5, timeStart: '10.15', timeEnd: '11.00', timeDisplay: '10.15 - 11.00', slotType: 'LESSON' },
        { period: 6, timeStart: '11.00', timeEnd: '11.45', timeDisplay: '11.00 - 11.45', slotType: 'LESSON' },
        { period: null, timeStart: '11.45', timeEnd: '12.30', timeDisplay: '11.45 - 12.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 7, timeStart: '12.30', timeEnd: '13.15', timeDisplay: '12.30 - 13.15', slotType: 'LESSON' },
        { period: 8, timeStart: '13.15', timeEnd: '14.00', timeDisplay: '13.15 - 14.00', slotType: 'LESSON' },
        { period: 9, timeStart: '14.00', timeEnd: '14.45', timeDisplay: '14.00 - 14.45', slotType: 'LESSON' }
      ],
      grid: {
        1: ['8', '15', '9a', '2a', '3', '20', '16c', '25b', '19a', '4'],
        2: ['8', '15', '9a', '2a', '3', '20', '16c', '25b', '19a', '4'],
        3: ['8', '15', '3', '2a', '11b', '22a', '16c', '4', '19a', '17f'],
        4: ['6a', '19a', '3', '8', '11b', '22a', '12a', '4', '25b', '17f'],
        5: ['6a', '19a', '11c', '8', '24a', '22a', '12a', '5', '25b', '17f'],
        6: ['16a', '9a', '11c', '3', '24a', '21', '12a', '5', '25b', '10'],
        7: ['16a', '9a', '11c', '3', '24a', '21', '23a', '13', '25b', '10'],
        8: ['9a', '20', '19b', '11b', '5', '14', '23a', '13', '24a', '10'],
        9: ['9a', '20', '19b', '11b', '5', '14', '23a', '13', '24a', '10']
      }
    },
    {
      name: 'RABU',
      orderIndex: 3,
      piket: { teacher1Id: 3, teacher2Id: 16 },
      slots: [
        { period: 1, timeStart: '07.00', timeEnd: '07.45', timeDisplay: '07.00 - 07.45', slotType: 'LESSON' },
        { period: 2, timeStart: '07.45', timeEnd: '08.30', timeDisplay: '07.45 - 08.30', slotType: 'LESSON' },
        { period: 3, timeStart: '08.30', timeEnd: '09.15', timeDisplay: '08.30 - 09.15', slotType: 'LESSON' },
        { period: null, timeStart: '09.15', timeEnd: '09.30', timeDisplay: '09.15 - 09.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 4, timeStart: '09.30', timeEnd: '10.15', timeDisplay: '09.30 - 10.15', slotType: 'LESSON' },
        { period: 5, timeStart: '10.15', timeEnd: '11.00', timeDisplay: '10.15 - 11.00', slotType: 'LESSON' },
        { period: 6, timeStart: '11.00', timeEnd: '11.45', timeDisplay: '11.00 - 11.45', slotType: 'LESSON' },
        { period: null, timeStart: '11.45', timeEnd: '12.30', timeDisplay: '11.45 - 12.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 7, timeStart: '12.30', timeEnd: '13.15', timeDisplay: '12.30 - 13.15', slotType: 'LESSON' },
        { period: 8, timeStart: '13.15', timeEnd: '14.00', timeDisplay: '13.15 - 14.00', slotType: 'LESSON' },
        { period: 9, timeStart: '14.00', timeEnd: '14.45', timeDisplay: '14.00 - 14.45', slotType: 'LESSON' }
      ],
      grid: {
        1: ['12a', '19a', '20', '6b', '15', '22c', '4', '18', '11a', '23f'],
        2: ['12a', '19a', '20', '6b', '15', '22c', '4', '18', '11a', '23f'],
        3: ['9a', '21', '22b', '12a', '24c', '17e', '4', '18', '25b', '23f'],
        4: ['9a', '21', '22b', '12a', '24c', '17e', '18', '5', '25b', '23f'],
        5: ['16b', '22b', '23c', '12a', '24c', '3', '18', '5', '4', '17f'],
        6: ['16b', '22b', '23c', '5', '21', '3', '18', '24a', '4', '17f'],
        7: ['27c', '26', '28c', '5', '21', '19c', '16c', '24a', '4', '17f'],
        8: ['27c', '26', '28c', '5', '24c', '19c', '16c', '22c', '21', '23f'],
        9: ['27c', '26', '28c', '5', '24c', '19c', '16c', '22c', '21', '23f']
      }
    },
    {
      name: 'KAMIS',
      orderIndex: 4,
      piket: { teacher1Id: 11, teacher2Id: 20 },
      slots: [
        { period: 1, timeStart: '07.00', timeEnd: '07.45', timeDisplay: '07.00 - 07.45', slotType: 'LESSON' },
        { period: 2, timeStart: '07.45', timeEnd: '08.30', timeDisplay: '07.45 - 08.30', slotType: 'LESSON' },
        { period: 3, timeStart: '08.30', timeEnd: '09.15', timeDisplay: '08.30 - 09.15', slotType: 'LESSON' },
        { period: null, timeStart: '09.15', timeEnd: '09.30', timeDisplay: '09.15 - 09.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 4, timeStart: '09.30', timeEnd: '10.15', timeDisplay: '09.30 - 10.15', slotType: 'LESSON' },
        { period: 5, timeStart: '10.15', timeEnd: '11.00', timeDisplay: '10.15 - 11.00', slotType: 'LESSON' },
        { period: 6, timeStart: '11.00', timeEnd: '11.45', timeDisplay: '11.00 - 11.45', slotType: 'LESSON' },
        { period: null, timeStart: '11.45', timeEnd: '12.30', timeDisplay: '11.45 - 12.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 7, timeStart: '12.30', timeEnd: '13.15', timeDisplay: '12.30 - 13.15', slotType: 'LESSON' },
        { period: 8, timeStart: '13.15', timeEnd: '14.00', timeDisplay: '13.15 - 14.00', slotType: 'LESSON' },
        { period: 9, timeStart: '14.00', timeEnd: '14.45', timeDisplay: '14.00 - 14.45', slotType: 'LESSON' }
      ],
      grid: {
        1: ['12a', '24b', '23d', '2c', '25a', '19c', '16d', '13', '4', '18'],
        2: ['12a', '24b', '23d', '2c', '25a', '19c', '16d', '13', '4', '18'],
        3: ['17a', '27a', '22a', '2c', '25a', '23e', '4', '13', '28a', '18'],
        4: ['17a', '27a', '22a', '2c', '25a', '23e', '4', '19a', '28a', '21'],
        5: ['20', '29', '23d', '6b', '18', '2b', '11b', '19a', '5', '21'],
        6: ['20', '29', '9a', '6b', '18', '2b', '11b', '19a', '5', '22a'],
        7: ['26', '27c', '9a', '16e', '28a', '2b', '23a', '25b', '13', '22a'],
        8: ['26', '27c', '22c', '16e', '28a', '5', '23a', '25b', '13', '20'],
        9: ['26', '27c', '22c', '16e', '28a', '5', '23a', '25b', '13', '20']
      }
    },
    {
      name: "JUM'AT",
      orderIndex: 5,
      piket: { teacher1Id: 18, teacher2Id: 26 },
      slots: [
        { period: 1, timeStart: '07.00', timeEnd: '07.45', timeDisplay: '07.00 - 07.45', slotType: 'LESSON' },
        { period: 2, timeStart: '07.45', timeEnd: '08.30', timeDisplay: '07.45 - 08.30', slotType: 'LESSON' },
        { period: 3, timeStart: '08.30', timeEnd: '09.15', timeDisplay: '08.30 - 09.15', slotType: 'LESSON' },
        { period: null, timeStart: '09.15', timeEnd: '09.30', timeDisplay: '09.15 - 09.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 4, timeStart: '09.30', timeEnd: '10.15', timeDisplay: '09.30 - 10.15', slotType: 'LESSON' },
        { period: 5, timeStart: '10.15', timeEnd: '11.00', timeDisplay: '10.15 - 11.00', slotType: 'LESSON' },
        { period: 6, timeStart: '11.00', timeEnd: '11.45', timeDisplay: '11.00 - 11.45', slotType: 'FRIDAY_PRAYER', label: "SHOLAT JUM'AT/ KEPUTRIAN" },
        { period: null, timeStart: '11.45', timeEnd: '12.30', timeDisplay: '11.45 - 12.30', slotType: 'BREAK', label: 'ISTIRAHAT' },
        { period: 7, timeStart: '12.30', timeEnd: '13.15', timeDisplay: '12.30 - 13.15', slotType: 'LESSON' },
        { period: 8, timeStart: '13.15', timeEnd: '14.00', timeDisplay: '13.15 - 14.00', slotType: 'LESSON' },
        { period: 9, timeStart: '14.00', timeEnd: '14.45', timeDisplay: '14.00 - 14.45', slotType: 'LESSON' }
      ],
      grid: {
        1: ['17b', '29', '21', '2a', '19a', '18', '23b', '25b', '13', '22a'],
        2: ['17b', '29', '21', '2a', '19a', '18', '23b', '25b', '13', '11c'],
        3: ['21', '28b', '22a', '2a', '19a', '18', '16d', '25b', '13', '11c'],
        4: ['21', '28b', '22a', '20', '18', '2b', '16d', '25b', '13', '23e'],
        5: ['22b', '27b', '29', '20', '25a', '17d', '21', '28a', '5', '23e'],
        6: ["SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT", "SHOLAT JUM'AT"],
        7: ['22b', '27b', '29', '23b', '25a', '17d', '21', '28a', '5', '19d'],
        8: ['27b', '28d', '29', '23b', '24c', '5', '16e', '11a', '22c', '19d'],
        9: ['27b', '28d', '29', '23b', '24c', '5', '16e', '11a', '22c', '19d']
      }
    }
  ]

  for (const dayConf of daysConfig) {
    const day = await prisma.day.create({
      data: {
        name: dayConf.name,
        orderIndex: dayConf.orderIndex
      }
    })

    // Piket
    await prisma.teacherPiket.create({
      data: {
        dayId: day.id,
        teacher1Id: dayConf.piket.teacher1Id,
        teacher2Id: dayConf.piket.teacher2Id
      }
    })

    // Slots & Grid Items
    let slotOrder = 0
    for (const s of dayConf.slots) {
      slotOrder++
      const slot = await prisma.timeSlot.create({
        data: {
          dayId: day.id,
          period: s.period,
          timeStart: s.timeStart,
          timeEnd: s.timeEnd,
          timeDisplay: s.timeDisplay,
          slotType: s.slotType,
          label: s.label || null,
          orderIndex: slotOrder
        }
      })

      // If slot has lesson or ceremony/prayer grid entries
      if (s.period !== null && dayConf.grid[s.period]) {
        const rowCells = dayConf.grid[s.period]
        for (let colIdx = 0; colIdx < rowCells.length; colIdx++) {
          const cellStr = rowCells[colIdx]
          const cls = createdClasses[colIdx]
          if (!cls) continue

          const parsed = parseCode(cellStr)
          if (parsed) {
            await prisma.scheduleItem.create({
              data: {
                timeSlotId: slot.id,
                classroomId: cls.id,
                teacherId: parsed.teacherId || null,
                subjectCode: parsed.subjectCode || null,
                customLabel: parsed.customLabel || null
              }
            })
          }
        }
      }
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
