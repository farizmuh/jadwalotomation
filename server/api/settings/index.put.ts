export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { schoolName, semester, academicYear, headmasterName, curriculumHeadName, dateLocation } = body

    const existing = await prisma.schoolSetting.findFirst()

    let result
    if (existing) {
      result = await prisma.schoolSetting.update({
        where: { id: existing.id },
        data: {
          ...(schoolName && { schoolName: schoolName.trim() }),
          ...(semester && { semester: semester.trim() }),
          ...(academicYear && { academicYear: academicYear.trim() }),
          ...(headmasterName && { headmasterName: headmasterName.trim() }),
          ...(curriculumHeadName && { curriculumHeadName: curriculumHeadName.trim() }),
          ...(dateLocation && { dateLocation: dateLocation.trim() })
        }
      })
    } else {
      result = await prisma.schoolSetting.create({
        data: {
          schoolName: schoolName || 'SMKS ISLAM DONOMULYO',
          semester: semester || 'SEMESTER GANJIL',
          academicYear: academicYear || 'TAHUN AJARAN 2026-2027',
          headmasterName: headmasterName || "IMAM SAFI'I, S.Pd., M.Si",
          curriculumHeadName: curriculumHeadName || 'WAHYU DIAN PERMANA, S.Pd',
          dateLocation: dateLocation || 'Donomulyo, 13 Juni 2026'
        }
      })
    }

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan pengaturan' }
  }
})
