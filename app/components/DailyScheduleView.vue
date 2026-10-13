<script setup lang="ts">
const props = defineProps<{
  schoolSetting: any
  days: any[]
  classrooms: any[]
  teachers: any[]
  scheduleItems: any[]
  conflicts: any[]
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'cellClick', payload: {
    timeSlotId: number
    classroomId: number
    dayName: string
    period: number | null
    timeDisplay: string
    classroomName: string
    currentTeacherId: number | null
    currentSubjectCode: string | null
    customLabel: string | null
  }): void
}>()

// Active Day Selection (default SENIN / first day)
const selectedDayIndex = ref(0)
const activeDay = computed(() => props.days[selectedDayIndex.value] || props.days[0])

// Group classrooms by grade for the double-decker header (Row 2: Grade, Row 3: Major)
const gradesGrouped = computed(() => {
  const map = new Map<string, any[]>()
  for (const cls of props.classrooms) {
    const grade = cls.grade || cls.name.split(' ')[0] || 'Kelas'
    if (!map.has(grade)) {
      map.set(grade, [])
    }
    map.get(grade)!.push(cls)
  }
  return Array.from(map.entries()).map(([grade, clsList]) => ({
    grade,
    classrooms: clsList
  }))
})

// Fast Map: `${timeSlotId}_${classroomId}` -> item
const scheduleMap = computed(() => {
  const map = new Map<string, any>()
  for (const item of props.scheduleItems) {
    map.set(`${item.timeSlotId}_${item.classroomId}`, item)
  }
  return map
})

// Conflict detection set: `${timeSlotId}_${teacherId}`
const conflictKeys = computed(() => {
  const keys = new Set<string>()
  for (const c of props.conflicts) {
    keys.add(`${c.timeSlotId}_${c.teacherId}`)
  }
  return keys
})

function isConflict(timeSlotId: number, teacherId?: number | null): boolean {
  if (!teacherId) return false
  return conflictKeys.value.has(`${timeSlotId}_${teacherId}`)
}

// Teacher lookup map
const teacherMap = computed(() => {
  const map = new Map<number, any>()
  for (const t of props.teachers) {
    map.set(t.id, t)
  }
  return map
})

// Subject code lookup map: `${teacherId}-${subjectCode}` -> subjectName
const subjectMap = computed(() => {
  const map = new Map<string, string>()
  for (const t of props.teachers) {
    if (t.subjects) {
      for (const s of t.subjects) {
        map.set(`${t.id}-${s.code}`, s.name)
      }
    }
  }
  return map
})

// Split teachers into 4 columns for bottom legend block
const teacherColumns = computed(() => {
  const cols: any[][] = [[], [], [], []]
  props.teachers.forEach((t, i) => {
    cols[i % 4].push(t)
  })
  return cols
})

function getCell(timeSlotId: number, classroomId: number) {
  return scheduleMap.value.get(`${timeSlotId}_${classroomId}`) || null
}

function getSubjectName(item: any): string {
  if (!item) return ''
  return (
    item.subject?.name ||
    (item.teacherId && item.subjectCode ? subjectMap.value.get(`${item.teacherId}-${item.subjectCode}`) : '') ||
    item.customLabel ||
    ''
  )
}

// Count conflicts for a specific day
function getDayConflictCount(day: any): number {
  if (!day?.timeSlots) return 0
  let count = 0
  const slotIds = new Set(day.timeSlots.map((s: any) => s.id))
  for (const c of props.conflicts) {
    if (slotIds.has(c.timeSlotId)) {
      count++
    }
  }
  return count
}

// Count filled lessons for a specific day
function getDayFilledCount(day: any): number {
  if (!day?.timeSlots) return 0
  const slotIds = new Set(day.timeSlots.map((s: any) => s.id))
  return props.scheduleItems.filter((i) => slotIds.has(i.timeSlotId) && (i.teacherId || i.customLabel)).length
}

// Handle cell click to open slot editor modal
function onCellClick(slot: any, cls: any) {
  const item = getCell(slot.id, cls.id)
  emit('cellClick', {
    timeSlotId: slot.id,
    classroomId: cls.id,
    dayName: activeDay.value?.name || '',
    period: slot.period,
    timeDisplay: slot.timeDisplay,
    classroomName: cls.name,
    currentTeacherId: item?.teacherId || null,
    currentSubjectCode: item?.subjectCode || null,
    customLabel: item?.customLabel || null
  })
}

function printDailySchedule() {
  window.print()
}
</script>

<template>
  <div class="space-y-4 print:space-y-0">
    <!-- ══════════════════════════════════════════════════════
         CONTROLS BAR (No Print)
         ══════════════════════════════════════════════════════ -->
    <div class="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <!-- Day Tabs (Senin - Sabtu) -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <button
            v-for="(day, idx) in days"
            :key="day.id"
            type="button"
            @click="selectedDayIndex = idx"
            :class="[
              'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer',
              selectedDayIndex === idx
                ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            ]"
          >
            <span>{{ day.name }}</span>

            <!-- Filled slots count badge -->
            <span
              :class="[
                'text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold',
                selectedDayIndex === idx
                  ? 'bg-slate-800 text-slate-200 dark:bg-emerald-800 dark:text-emerald-100'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              ]"
            >
              {{ getDayFilledCount(day) }} JP
            </span>

            <!-- Conflict badge if any -->
            <span
              v-if="getDayConflictCount(day) > 0"
              class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"
              title="Ada jadwal bentrok pada hari ini"
            />
          </button>
        </div>

        <!-- Actions: Print & Quick Stats -->
        <div class="flex items-center gap-2.5 shrink-0 justify-end w-full sm:w-auto">
          <div class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            Total {{ classrooms.length }} Kelas
          </div>

          <button
            type="button"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            @click="printDailySchedule"
          >
            <span>🖨️</span>
            <span>Cetak Jadwal Hari Ini</span>
          </button>
        </div>
      </div>

      <!-- Quick Interactive Hint -->
      <div class="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
        <span class="flex items-center gap-1.5 font-medium">
          <span>💡</span>
          <span><strong>Format Matriks Master Compact:</strong> Klik kotak kode jam mana saja untuk langsung mengubah guru, mata pelajaran, atau menghapus jadwal.</span>
        </span>
        <span class="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold hidden md:inline">
          Format: [Kode Guru][Kode Mapel] • Arahkan mouse untuk melihat detail guru
        </span>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         COMPACT MASTER SHEET CONTAINER (Interactive & Printable)
         ══════════════════════════════════════════════════════ -->
    <div
      class="printable-area bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-lg p-4 sm:p-6 print:block print:p-0 print:m-0 print:border-none print:shadow-none overflow-x-auto text-slate-900 dark:text-slate-100"
    >
      <!-- School Official Header -->
      <div class="text-center mb-5 pb-3 border-b border-slate-200 dark:border-slate-800 print:mb-2 print:pb-1">
        <h1 class="font-extrabold text-lg sm:text-xl tracking-wide uppercase text-slate-900 dark:text-white print:text-[12px] print:mb-0">
          JADWAL PELAJARAN HARI {{ activeDay?.name?.toUpperCase() }} • {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
        </h1>
        <h2 class="font-bold text-sm sm:text-base tracking-wider uppercase text-slate-700 dark:text-slate-300 print:text-[10px]">
          {{ schoolSetting?.semester || 'SEMESTER GANJIL' }} {{ schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027' }}
        </h2>
      </div>

      <!-- COMPACT TABLE: ROW = TIME SLOTS, COL = CLASSROOMS -->
      <div class="mb-6 overflow-x-auto print:mb-2 print:overflow-visible">
        <table class="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-center text-[11px] leading-tight select-none">
          <thead>
            <!-- Row 1: Day Banner Title -->
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border-b-2 border-slate-800 dark:border-slate-700">
              <th rowspan="3" class="border border-slate-600 dark:border-slate-600 px-1 py-1 w-9 text-center">
                JAM<br />KE
              </th>
              <th rowspan="3" class="border border-slate-600 dark:border-slate-600 px-1 py-1 w-24 text-center">
                WAKTU
              </th>
              <th
                :colspan="classrooms.length"
                class="border-2 border-slate-800 dark:border-slate-600 py-1.5 uppercase tracking-wider text-xs bg-slate-200/90 dark:bg-slate-700/90 font-black"
              >
                HARI {{ activeDay?.name?.toUpperCase() }}
              </th>
            </tr>

            <!-- Row 2: Grade (X, XI, XII...) -->
            <tr class="bg-slate-100 dark:bg-slate-800/80 font-bold border-b border-slate-600">
              <th
                v-for="grp in gradesGrouped"
                :key="'th-grade-' + grp.grade"
                :colspan="grp.classrooms.length"
                class="border border-slate-600 py-0.5 text-[11px]"
              >
                {{ grp.grade }}
              </th>
            </tr>

            <!-- Row 3: Major / Class Name (BDP, TKJ, MP, T1, ...) -->
            <tr class="bg-slate-50 dark:bg-slate-800/50 font-semibold border-b-2 border-slate-800">
              <th
                v-for="cls in classrooms"
                :key="'cls-header-' + cls.id"
                class="border border-slate-600 px-1 py-1 text-[10px] w-9 font-bold"
                :title="cls.name"
              >
                {{ cls.major || cls.name }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="slot in activeDay?.timeSlots || []"
              :key="'slot-row-' + slot.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
            >
              <!-- Jam Ke -->
              <td class="border border-slate-600 font-bold bg-slate-100/60 dark:bg-slate-800/60 py-1 font-mono">
                {{ slot.period || '' }}
              </td>

              <!-- Waktu -->
              <td class="border border-slate-600 px-1 py-1 whitespace-nowrap text-[10px] font-mono">
                {{ slot.timeDisplay || '' }}
              </td>

              <!-- BREAK ROW -->
              <td
                v-if="slot.slotType === 'BREAK'"
                :colspan="classrooms.length"
                class="border border-slate-600 bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-black tracking-widest text-xs py-1"
              >
                {{ slot.label || 'ISTIRAHAT' }}
              </td>

              <!-- CEREMONY ROW (UPACARA) -->
              <td
                v-else-if="slot.slotType === 'CEREMONY'"
                :colspan="classrooms.length"
                class="border border-slate-600 bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold text-[10px] py-1 cursor-pointer hover:bg-emerald-200/80 transition"
                @click="onCellClick(slot, classrooms[0])"
              >
                {{ slot.label || 'UPACARA / PEMBINAAN WALI KELAS / APEL' }}
              </td>

              <!-- FRIDAY PRAYER ROW -->
              <td
                v-else-if="slot.slotType === 'FRIDAY_PRAYER'"
                :colspan="classrooms.length"
                class="border border-slate-600 bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold text-[10px] py-1"
              >
                {{ slot.label || "SHOLAT JUM'AT" }}
              </td>

              <!-- LESSON CELLS (COMPACT) -->
              <template v-else>
                <td
                  v-for="cls in classrooms"
                  :key="'cell-' + cls.id + '-' + slot.id"
                  :class="[
                    'border border-slate-600 px-0.5 py-1 cursor-pointer transition-all duration-150',
                    isConflict(slot.id, getCell(slot.id, cls.id)?.teacherId)
                      ? 'bg-red-500 text-white font-black animate-pulse ring-2 ring-red-400'
                      : getCell(slot.id, cls.id)?.teacherId
                        ? 'hover:bg-emerald-100 dark:hover:bg-emerald-950/60 font-bold text-slate-800 dark:text-slate-100'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 dark:text-slate-600'
                  ]"
                  :title="getCell(slot.id, cls.id)?.teacherId
                    ? `[${getCell(slot.id, cls.id)?.teacherId}] ${teacherMap.get(getCell(slot.id, cls.id)?.teacherId)?.name || ''} - ${getSubjectName(getCell(slot.id, cls.id))} (Kelas ${cls.name})`
                    : `Klik untuk atur jam pelajaran Kelas ${cls.name}`"
                  @click="onCellClick(slot, cls)"
                >
                  <span v-if="getCell(slot.id, cls.id)">
                    {{
                      getCell(slot.id, cls.id).customLabel ||
                      `${getCell(slot.id, cls.id).teacherId || ''}${getCell(slot.id, cls.id).subjectCode || ''}`
                    }}
                  </span>
                  <span v-else class="text-slate-300 dark:text-slate-700">-</span>
                </td>
              </template>
            </tr>

            <!-- PIKET PENGAJAR ROW -->
            <tr class="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-800">
              <td colspan="2" class="border border-slate-600 px-2 py-1.5 text-left font-black text-[11px]">
                Piket Pengajar
              </td>
              <td
                :colspan="classrooms.length"
                class="border border-slate-600 px-2 py-1 text-center text-[10px]"
              >
                <div class="flex items-center justify-center gap-2 flex-wrap">
                  <span class="inline-block px-2 py-0.5 rounded bg-white dark:bg-slate-700 shadow-xs border border-slate-300 dark:border-slate-600">
                    {{ activeDay?.piket?.teacher1?.name || activeDay?.piket?.teacher1Name || '-' }}
                  </span>
                  <span>&</span>
                  <span class="inline-block px-2 py-0.5 rounded bg-white dark:bg-slate-700 shadow-xs border border-slate-300 dark:border-slate-600">
                    {{ activeDay?.piket?.teacher2?.name || activeDay?.piket?.teacher2Name || '-' }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ══════════════════════════════════════════════════════
           TABLE BOTTOM: KODE GURU LEGEND & OFFICIAL SIGNATURES
           ══════════════════════════════════════════════════════ -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 print:grid-cols-12 print:gap-2 print:pt-0.5">
        <!-- Kode Guru Grid (7 cols) -->
        <div class="lg:col-span-7">
          <div class="border-2 border-slate-800 dark:border-slate-700 rounded-lg overflow-hidden h-full flex flex-col justify-between print:rounded-md print:border">
            <div>
              <div class="bg-slate-800 text-white font-extrabold px-3 py-1.5 text-xs uppercase tracking-wider flex items-center justify-between print:py-0.5 print:px-1.5 print:text-[8px]">
                <span>KODE GURU :</span>
                <span class="text-[10px] font-normal text-slate-300 print:text-[7.5px]">Total: {{ teachers.length }} Guru</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-300 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900 print:grid-cols-4">
                <div
                  v-for="(col, colIndex) in teacherColumns"
                  :key="'t-col-' + colIndex"
                  class="divide-y divide-slate-200 dark:divide-slate-800"
                >
                  <div
                    v-for="t in col"
                    :key="'t-row-' + t.id"
                    class="px-2 py-1 text-[10px] flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition print:py-0.2 print:px-1 print:text-[7.5px] print:gap-1"
                  >
                    <!-- Modern clean number without brackets -->
                    <span class="w-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 print:w-3.5">
                      {{ t.id }}
                    </span>
                    <span class="text-slate-900 dark:text-slate-200 truncate font-medium" :title="t.name">
                      {{ t.name }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Official Signatures Block (5 cols) -->
        <div class="lg:col-span-5 flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border-2 border-slate-800 dark:border-slate-700 rounded-lg text-center print:p-1.5 print:rounded-md print:border">
          <div>
            <p class="font-semibold text-slate-700 dark:text-slate-300 text-xs print:text-[8.5px]">
              {{ schoolSetting?.dateLocation || 'Donomulyo, 13 Juni 2026' }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 my-3 text-center print:my-1 print:gap-2">
            <!-- Kepala Sekolah -->
            <div class="flex flex-col items-center justify-between min-w-0">
              <p class="font-bold text-xs text-slate-900 dark:text-white print:text-[8.5px]">
                Kepala Sekolah
              </p>
              <div class="h-14 print:h-7"></div>
              <p class="font-bold text-[11px] underline uppercase whitespace-nowrap tracking-tight text-slate-900 dark:text-white print:text-[8px]">
                {{ schoolSetting?.headmasterName || "IMAM SAFI'I, S.Pd., M.Si" }}
              </p>
            </div>

            <!-- Wakakur -->
            <div class="flex flex-col items-center justify-between min-w-0">
              <p class="font-bold text-xs text-slate-900 dark:text-white print:text-[8.5px]">
                Wakakur
              </p>
              <div class="h-14 print:h-7"></div>
              <p class="font-bold text-[11px] underline uppercase whitespace-nowrap tracking-tight text-slate-900 dark:text-white print:text-[8px]">
                {{ schoolSetting?.curriculumHeadName || 'WAHYU DIAN PERMANA, S.Pd' }}
              </p>
            </div>
          </div>

          <div class="text-[10px] text-slate-400 italic print:text-[7.5px]">
            Dokumen Resmi Jadwal Pembelajaran Harian
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
