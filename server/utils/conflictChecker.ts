export interface ConflictDetail {
  timeSlotId: number
  dayName: string
  period: number | null
  timeDisplay: string
  teacherId: number
  teacherName: string
  classrooms: { id: number; name: string }[]
  message: string
}

export async function detectScheduleConflicts(): Promise<ConflictDetail[]> {
  // Query all schedule items that have a teacher assigned
  const items = await prisma.scheduleItem.findMany({
    where: {
      teacherId: { not: null }
    },
    include: {
      timeSlot: {
        include: { day: true }
      },
      classroom: true,
      teacher: true
    }
  })

  // Group by `${timeSlotId}_${teacherId}`
  const grouped = new Map<string, typeof items>()

  for (const item of items) {
    if (!item.teacherId) continue
    const key = `${item.timeSlotId}_${item.teacherId}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(item)
  }

  const conflicts: ConflictDetail[] = []

  for (const [, itemList] of grouped) {
    if (itemList.length > 1) {
      const first = itemList[0]
      const classNames = itemList.map((i) => i.classroom.name).join(', ')
      conflicts.push({
        timeSlotId: first.timeSlotId,
        dayName: first.timeSlot.day.name,
        period: first.timeSlot.period,
        timeDisplay: first.timeSlot.timeDisplay,
        teacherId: first.teacherId!,
        teacherName: first.teacher?.name || `Guru #${first.teacherId}`,
        classrooms: itemList.map((i) => ({ id: i.classroom.id, name: i.classroom.name })),
        message: `Guru ${first.teacher?.name || '#' + first.teacherId} bentrok mengajar di ${itemList.length} kelas sekaligus (${classNames}) pada hari ${first.timeSlot.day.name} Jam ke-${first.timeSlot.period || '-'} (${first.timeSlot.timeDisplay})`
      })
    }
  }

  return conflicts
}
