<script setup lang="ts">
const props = defineProps<{
  classrooms: any[]
  days: any[]
  teachers: any[]
  scheduleItems: any[]
  schoolSetting: any
}>()

const selectedClassId = ref<number>(props.classrooms[0]?.id || 1)

const currentClass = computed(() =>
  props.classrooms.find((c) => c.id === selectedClassId.value)
)

const teacherMap = computed(() => {
  const map = new Map<number, any>()
  for (const t of props.teachers) map.set(t.id, t)
  return map
})

// Map: `${teacherId}-${subjectCode}` → subject name
const subjectMap = computed(() => {
  const map = new Map<string, string>()
  for (const t of props.teachers) {
    if (!t.subjects) continue
    for (const s of t.subjects) map.set(`${t.id}-${s.code}`, s.name)
  }
  return map
})

// Auto-color palette per subject
const SUBJECT_COLORS = [
  { bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-300 dark:border-violet-700', accent: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-300 dark:border-sky-700', accent: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', accent: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-300 dark:border-rose-700', accent: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-700', accent: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-300 dark:border-cyan-700', accent: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', border: 'border-fuchsia-300 dark:border-fuchsia-700', accent: 'bg-fuchsia-500', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  { bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-300 dark:border-teal-700', accent: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-300 dark:border-orange-700', accent: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-300 dark:border-indigo-700', accent: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-lime-50 dark:bg-lime-950/40', border: 'border-lime-300 dark:border-lime-700', accent: 'bg-lime-500', text: 'text-lime-700 dark:text-lime-300' },
  { bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-700', accent: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300' },
]

function hashSubject(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % SUBJECT_COLORS.length
}

function getSubjectColor(subjectName: string | null) {
  if (!subjectName) return SUBJECT_COLORS[0]
  return SUBJECT_COLORS[hashSubject(subjectName)]
}

// Per-day slot data
const weeklyClassGrid = computed(() => {
  const result: any[] = []
  for (const day of props.days) {
    const slots: any[] = []
    for (const slot of day.timeSlots) {
      if (slot.slotType === 'BREAK' || slot.slotType === 'FRIDAY_PRAYER' || slot.slotType === 'CEREMONY') {
        slots.push({ slot, isBreak: true, label: slot.label || 'ISTIRAHAT' })
      } else {
        const item = props.scheduleItems.find(
          (s) => s.timeSlotId === slot.id && s.classroomId === selectedClassId.value
        )
        const teacher = item?.teacherId ? teacherMap.value.get(item.teacherId) : null
        const subjectName
          = item?.subject?.name
          || (item?.teacherId && item?.subjectCode
            ? subjectMap.value.get(`${item.teacherId}-${item.subjectCode}`)
            : null)
          || item?.customLabel
          || null
        slots.push({ slot, isBreak: false, item, teacher, subjectName })
      }
    }
    result.push({ day, slots })
  }
  return result
})

// Row-based matrix: rows[slotIndex] = { meta, cells[dayIndex] }
// This enables CSS Grid to auto-equalize all cell heights per row
const slotRows = computed(() => {
  if (!weeklyClassGrid.value.length) return []
  const firstDay = weeklyClassGrid.value[0]
  return firstDay.slots.map((_: any, slotIdx: number) => {
    const cells = weeklyClassGrid.value.map((d: any) => d.slots[slotIdx])
    const meta = cells[0]
    return { meta, cells }
  })
})

function printClassSchedule() {
  window.print()
}
</script>

<template>
  <div class="space-y-5">
    <!-- Controls Bar -->
    <div class="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <span class="text-lg">🏫</span>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Pilih Kelas</label>
          <select
            v-model="selectedClassId"
            class="w-full sm:w-72 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            <option v-for="c in classrooms" :key="c.id" :value="c.id">
              Kelas {{ c.name }} — {{ c.major }}
            </option>
          </select>
        </div>
      </div>
      <button
        type="button"
        class="no-print px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-slate-200 dark:border-slate-700"
        @click="printClassSchedule"
      >
        <span>🖨️</span>
        <span>Cetak Jadwal</span>
      </button>
    </div>

    <!-- Classroom Timetable Card -->
    <div class="printable-area bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden print:rounded-none print:border-none print:shadow-none">

      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 print:px-4 print:py-2">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20 print:hidden">
            {{ currentClass?.grade }}
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 print:text-[8px]">Jadwal Pelajaran</p>
            <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none print:text-base">
              Kelas {{ currentClass?.name }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 print:text-[8px]">
              Tingkat {{ currentClass?.grade }} &bull; {{ currentClass?.major }} &bull; {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
            </p>
          </div>
        </div>
        <div class="text-left sm:text-right print:text-right">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-[8px]">{{ schoolSetting?.semester || 'Semester Ganjil' }}</p>
          <p class="text-sm font-extrabold text-slate-700 dark:text-slate-200 print:text-[10px]">{{ schoolSetting?.academicYear || '2026 / 2027' }}</p>
        </div>
      </div>

      <!-- Row-based grid: slot rows × day columns -->
      <!-- Each row is a CSS Grid row — browser auto-equalizes cell heights -->
      <div class="p-4 print:p-2">

        <!-- Day Header Row -->
        <div class="grid gap-1.5 mb-2 print:gap-1 print:mb-1" style="grid-template-columns: 52px repeat(5, 1fr);">
          <div />
          <div
            v-for="d in weeklyClassGrid"
            :key="'hdr-' + d.day.id"
            class="py-2.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 text-white text-center print:py-1 print:rounded-md"
          >
            <p class="text-[11px] font-black uppercase tracking-widest print:text-[8px]">{{ d.day.name }}</p>
          </div>
        </div>

        <!-- Slot Rows -->
        <div class="flex flex-col gap-1.5 print:gap-1">
          <div
            v-for="(row, rowIdx) in slotRows"
            :key="'row-' + rowIdx"
            class="grid gap-1.5 items-stretch print:gap-1"
            style="grid-template-columns: 52px repeat(5, 1fr);"
          >
            <!-- Left: Period / Time label -->
            <div class="flex flex-col items-center justify-center text-center select-none">
              <template v-if="row.meta.isBreak">
                <span class="text-base print:hidden">☕</span>
              </template>
              <template v-else-if="row.meta.slot?.period">
                <span class="text-sm font-black text-slate-500 dark:text-slate-400 print:text-[9px]">{{ row.meta.slot.period }}</span>
                <span class="text-[9px] font-mono text-slate-400/70 dark:text-slate-600 mt-0.5 print:text-[6px]">{{ row.meta.slot.timeStart }}</span>
              </template>
            </div>

            <!-- 5 Day Cells — same grid row = same height automatically -->
            <template v-for="(cell, cIdx) in row.cells" :key="'cell-' + rowIdx + '-' + cIdx">

              <!-- Break / Event -->
              <div
                v-if="cell.isBreak"
                class="flex flex-col items-center justify-center rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-2 py-2.5 print:rounded-md print:py-1"
              >
                <span class="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 print:text-[7px]">{{ cell.label }}</span>
                <span class="text-[8px] font-mono text-amber-600/60 dark:text-amber-500/60 mt-0.5 print:text-[6px]">{{ cell.slot.timeDisplay }}</span>
              </div>

              <!-- Lesson Slot -->
              <div
                v-else-if="cell.item?.teacherId || cell.item?.customLabel"
                :class="[
                  'relative flex flex-col rounded-xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-px print:rounded-md print:shadow-none print:translate-y-0',
                  getSubjectColor(cell.subjectName).bg,
                  getSubjectColor(cell.subjectName).border
                ]"
              >
                <!-- Top accent strip -->
                <div :class="['h-1 w-full shrink-0 print:h-0.5', getSubjectColor(cell.subjectName).accent]" />

                <div class="flex flex-col justify-between flex-1 px-2.5 py-2 print:px-1.5 print:py-1">
                  <!-- Subject Name — UTAMA (paling besar & bold) -->
                  <p
                    :class="[
                      'font-extrabold text-[12px] leading-snug print:text-[8px]',
                      getSubjectColor(cell.subjectName).text
                    ]"
                  >
                    {{ cell.subjectName || cell.item?.customLabel || '—' }}
                  </p>

                  <!-- Spacer -->
                  <div class="flex-1" />

                  <!-- Teacher (kecil, di bawah) -->
                  <div class="flex items-center gap-1 mt-2 print:mt-0.5">
                    <span class="text-[9px] shrink-0 print:text-[6px]">👤</span>
                    <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight line-clamp-2 print:text-[7px] print:line-clamp-1">
                      {{ cell.teacher?.name || cell.item?.customLabel || '—' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty Slot -->
              <div
                v-else-if="cell.slot?.period"
                class="flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 print:rounded-md"
              >
                <span class="text-slate-300 dark:text-slate-700 text-lg font-light print:hidden">—</span>
              </div>

              <!-- Non-period placeholder (e.g. JumAt prayer row on other days) -->
              <div v-else class="rounded-xl bg-slate-50/30 dark:bg-slate-800/10 print:rounded-md" />

            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
