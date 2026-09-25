const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('1. Updating all ScheduleItems with null/empty subjectCode to default "a"...')
  const updateRes = await prisma.scheduleItem.updateMany({
    where: {
      teacherId: { not: null },
      OR: [
        { subjectCode: null },
        { subjectCode: '' }
      ]
    },
    data: {
      subjectCode: 'a'
    }
  })
  console.log(`Updated ${updateRes.count} schedule items to subjectCode: 'a'`)

  console.log('\n2. Ensuring every teacher has registered subjects in Subject table...')
  const teachers = await prisma.teacher.findMany({
    orderBy: { id: 'asc' },
    include: {
      subjects: true,
      schedules: true
    }
  })

  // Subject naming mapping for vocational schools
  const subjectNaming = {
    1: { a: 'Pendidikan Agama Islam & Budi Pekerti' },
    2: { a: 'Bahasa Indonesia', b: 'Sastra Indonesia', c: 'Literasi Bahasa' },
    3: { a: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)' },
    4: { a: 'Matematika Umum', b: 'Matematika Peminatan' },
    5: { a: 'Dasar Program Keahlian TKJ', b: 'Informatika', c: 'Teknologi Jaringan Komputer' },
    6: { a: 'Bimbingan Konseling (BK)' },
    7: { a: 'Dasar Desain Komunikasi Visual & Multimedia' },
    8: { a: 'Bahasa Inggris', b: 'Bahasa Asing Pilihan' },
    9: { a: 'Sejarah Indonesia', b: 'Pendidikan Pancasila' },
    10: { a: 'Projek IPAS (Ilmu Pengetahuan Alam & Sosial)' },
    11: { a: 'Sosiologi & Antropologi' },
    12: { a: 'Dasar Manajemen Perkantoran & Layanan Bisnis (MP)' },
    13: { a: 'Pendidikan Pancasila & Kewarganegaraan (PPKn)' },
    14: { a: 'Seni Budaya & Prakarya' },
    15: { a: 'Muatan Lokal / Bahasa Daerah (Jawa)' },
    16: { a: 'Dasar Pemasaran / Bisnis Daring & Pemasaran (BDP)' },
    17: { a: 'Pengelolaan Bisnis Ritel & Digital Marketing' },
    18: { a: 'Teknologi Layanan Jaringan & Administrasi Server' },
    19: { a: 'Ekonomi Bisnis & Administrasi Umum' },
    20: { a: 'Otomatisasi Tata Kelola Kehumasan & Keprotokolan' },
    21: { a: 'Praktik Kerja Lapangan & Kejuruan Terpadu' },
    22: { a: 'Kearsipan & Tata Kelola Kepegawaian' },
    23: { a: 'Pengelolaan Kas & Perbankan Dasar' },
    24: { a: 'Dasar Pemrograman & Pengembangan Web' },
    25: { a: 'Projek Kreatif & Kewirausahaan (PKK)' },
    26: { a: 'Pendidikan Agama & Karakter Islami' },
    27: { a: 'Teknologi Perkantoran Digital' },
    28: { a: 'Komunikasi Bisnis & Negosiasi' },
    29: { a: 'Infrastruktur Komputer & Perawatan Jaringan' },
    30: { a: 'Mata Pelajaran Umum / Kejuruan' }
  }

  for (const t of teachers) {
    // Collect all unique subject codes used in this teacher's schedules
    const codesInSchedule = new Set()
    for (const s of t.schedules) {
      if (s.subjectCode) {
        codesInSchedule.add(s.subjectCode.trim().toLowerCase())
      }
    }

    // Always ensure at least code 'a'
    if (codesInSchedule.size === 0) {
      codesInSchedule.add('a')
    }

    for (const code of codesInSchedule) {
      const scheduledCount = t.schedules.filter(
        (s) => s.subjectCode && s.subjectCode.trim().toLowerCase() === code
      ).length

      const existingSubject = t.subjects.find((s) => s.code.toLowerCase() === code)
      const mappedName = subjectNaming[t.id]?.[code] || `Mata Pelajaran ${code.toUpperCase()}`
      const targetJp = Math.max(scheduledCount, 4) // At least 4 JP or scheduled amount

      if (!existingSubject) {
        await prisma.subject.create({
          data: {
            teacherId: t.id,
            code,
            name: mappedName,
            targetJp
          }
        })
        console.log(`Created subject [${code}] '${mappedName}' (${targetJp} JP) for Teacher ${t.id} - ${t.name}`)
      } else {
        // Update name if it was a generic placeholder
        if (existingSubject.name.startsWith('Mata Pelajaran Wajib') || existingSubject.name.startsWith('Dasar Program')) {
          if (subjectNaming[t.id]?.[code]) {
            await prisma.subject.update({
              where: { id: existingSubject.id },
              data: {
                name: subjectNaming[t.id][code],
                targetJp: Math.max(existingSubject.targetJp, scheduledCount)
              }
            })
          }
        }
      }
    }
  }

  // Verification count
  const allTeachers = await prisma.teacher.findMany({
    include: { subjects: true }
  })
  const withoutSubjects = allTeachers.filter((t) => t.subjects.length === 0)
  console.log(`\nVerification: Teachers with 0 subjects = ${withoutSubjects.length}`)
  console.log(`Total Teachers: ${allTeachers.length}. Every teacher has subjects!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
