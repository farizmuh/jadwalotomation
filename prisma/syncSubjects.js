import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Syncing subjects from schedule items...')

  // Find all distinct (teacherId, subjectCode) combinations in ScheduleItem
  const items = await prisma.scheduleItem.findMany({
    where: {
      teacherId: { not: null },
      subjectCode: { not: null }
    }
  })

  const distinct = new Map()
  for (const item of items) {
    if (!item.teacherId || !item.subjectCode) continue
    const code = item.subjectCode.trim().toLowerCase()
    const key = `${item.teacherId}_${code}`
    if (!distinct.has(key)) {
      distinct.set(key, {
        teacherId: item.teacherId,
        code,
        count: 0
      })
    }
    distinct.get(key).count++
  }

  // Common subject naming suggestions based on vocational curricula
  const mapelNames = {
    a: 'Mata Pelajaran Wajib A',
    b: 'Mata Pelajaran Wajib B',
    c: 'Dasar Program Keahlian C',
    d: 'Konsentrasi Keahlian D',
    e: 'Projek Kreatif & Kewirausahaan E',
    f: 'Muatan Lokal / Pilihan F'
  }

  for (const [, obj] of distinct) {
    const existing = await prisma.subject.findFirst({
      where: {
        teacherId: obj.teacherId,
        code: obj.code
      }
    })

    const defaultName = mapelNames[obj.code] || `Mata Pelajaran ${obj.code.toUpperCase()}`
    const targetJp = Math.max(obj.count, 2) // At least the scheduled hours

    if (!existing) {
      await prisma.subject.create({
        data: {
          teacherId: obj.teacherId,
          code: obj.code,
          name: defaultName,
          targetJp
        }
      })
    }
  }

  console.log(`Synced ${distinct.size} distinct teacher subjects!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
