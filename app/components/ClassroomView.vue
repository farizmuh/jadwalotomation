<script setup lang="ts">
const props = defineProps<{
  classrooms: any[]
  days: any[]
  teachers: any[]
  scheduleItems: any[]
  schoolSetting: any
}>()

const selectedClassId = ref<number>(props.classrooms[0]?.id || 1)
const selectedDayIdx = ref<number>(0) // for mobile day tab

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
  { bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-300 dark:border-violet-700', accent: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300', pill: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' },
  { bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-300 dark:border-sky-700', accent: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300', pill: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', accent: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', pill: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-300 dark:border-rose-700', accent: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', pill: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-700', accent: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', pill: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-300 dark:border-cyan-700', accent: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', pill: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', border: 'border-fuchsia-300 dark:border-fuchsia-700', accent: 'bg-fuchsia-500', text: 'text-fuchsia-700 dark:text-fuchsia-300', pill: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-300' },
  { bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-300 dark:border-teal-700', accent: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300', pill: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-300 dark:border-orange-700', accent: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', pill: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' },
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-300 dark:border-indigo-700', accent: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', pill: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-lime-50 dark:bg-lime-950/40', border: 'border-lime-300 dark:border-lime-700', accent: 'bg-lime-500', text: 'text-lime-700 dark:text-lime-300', pill: 'bg-lime-100 dark:bg-lime-900/50 text-lime-700 dark:text-lime-300' },
  { bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-700', accent: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300', pill: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300' },
]

function hashSubject(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % SUBJECT_COLORS.length
}

function getSubjectColor(subjectName: string | null) {
  if (!subjectName) return SUBJECT_COLORS[0]!
  return SUBJECT_COLORS[hashSubject(subjectName)]!
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

// Row-based matrix for desktop grid (slot rows × 5 day columns)
const slotRows = computed(() => {
  if (!weeklyClassGrid.value.length) return []
  const firstDay = weeklyClassGrid.value[0]
  return firstDay.slots.map((_: any, slotIdx: number) => {
    const cells = weeklyClassGrid.value.map((d: any) => d.slots[slotIdx])
    return { meta: cells[0], cells }
  })
})

// Mobile: slots for the selected day
const mobileSlots = computed(() => {
  return weeklyClassGrid.value[selectedDayIdx.value]?.slots || []
})

// Day abbreviations for mobile tabs
const DAY_SHORT: Record<string, string> = {
  SENIN: 'Sen', SELASA: 'Sel', RABU: 'Rab', KAMIS: 'Kam', "JUM'AT": 'Jum', SABTU: 'Sab', MINGGU: 'Min'
}
function dayShort(name: string): string {
  return DAY_SHORT[name.toUpperCase()] || name.slice(0, 3)
}

function printClassSchedule() {
  window.print()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Controls Bar -->
    <div class="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <span class="text-xl">🏫</span>
        <div class="flex-1">
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
        class="no-print w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
        @click="printClassSchedule"
      >
        <span>🖨️</span>
        <span>Cetak Jadwal</span>
      </button>
    </div>

    <!-- Classroom Timetable Card -->
    <div class="printable-area bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden print:rounded-none print:border-none print:shadow-none">

      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 print:px-4 print:py-2">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/20 print:hidden shrink-0">
            {{ currentClass?.grade }}
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 print:text-[8px]">Jadwal Pelajaran</p>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white leading-none print:text-sm">
              Kelas {{ currentClass?.name }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 print:text-[7px]">
              {{ currentClass?.grade }} &bull; {{ currentClass?.major }} &bull; {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
            </p>
          </div>
        </div>
        <div class="text-left sm:text-right print:text-right">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-[7px]">{{ schoolSetting?.semester || 'Semester Ganjil' }}</p>
          <p class="text-sm font-extrabold text-slate-700 dark:text-slate-200 print:text-[9px]">{{ schoolSetting?.academicYear || '2026 / 2027' }}</p>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           MOBILE VIEW (< md): Day tabs + single-column slot list
           ══════════════════════════════════════════════════════════ -->
      <div class="md:hidden print:hidden">
        <!-- Day Tab Selector -->
        <div class="flex gap-1.5 px-3 pt-3 pb-2 overflow-x-auto no-scrollbar">
          <button
            v-for="(d, idx) in weeklyClassGrid"
            :key="'mob-tab-' + idx"
            type="button"
            :class="[
              'flex-1 min-w-[52px] py-2 px-1 rounded-xl text-center transition font-bold text-xs whitespace-nowrap',
              selectedDayIdx === idx
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="selectedDayIdx = idx"
          >
            {{ dayShort(d.day.name) }}
          </button>
        </div>

        <!-- Day Label -->
        <div class="px-3 pb-2">
          <p class="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {{ weeklyClassGrid[selectedDayIdx]?.day?.name }}
          </p>
        </div>

        <!-- Mobile Slot List — full width, equal height cards via min-h -->
        <div class="flex flex-col gap-2 px-3 pb-4">
          <template v-for="(s, sIdx) in mobileSlots" :key="'mob-' + sIdx">

            <!-- Break -->
            <div
              v-if="s.isBreak"
              class="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">☕</span>
                <span class="text-sm font-black uppercase tracking-wide text-amber-700 dark:text-amber-400">{{ s.label }}</span>
              </div>
              <span class="text-xs font-mono text-amber-600/70 dark:text-amber-500/70">{{ s.slot.timeDisplay }}</span>
            </div>

            <!-- Lesson -->
            <div
              v-else-if="s.item?.teacherId || s.item?.customLabel"
              :class="[
                'flex items-stretch rounded-2xl border overflow-hidden min-h-[76px] shadow-sm hover:shadow-md active:scale-[0.99] transition-all',
                getSubjectColor(s.subjectName).bg,
                getSubjectColor(s.subjectName).border
              ]"
            >
              <!-- Left accent bar -->
              <div :class="['w-1.5 shrink-0', getSubjectColor(s.subjectName).accent]" />

              <!-- Period badge (left side) -->
              <div class="flex flex-col items-center justify-center px-3 min-w-[48px] border-r border-current border-opacity-10">
                <span class="text-xl font-black text-slate-700 dark:text-slate-200 leading-none">{{ s.slot.period }}</span>
                <span class="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-1 leading-none">{{ s.slot.timeStart }}</span>
              </div>

              <!-- Main content -->
              <div class="flex flex-col justify-center px-3 py-3 flex-1">
                <!-- Subject name — BESAR & BOLD -->
                <p :class="['font-extrabold text-base leading-tight mb-1', getSubjectColor(s.subjectName).text]">
                  {{ s.subjectName || s.item?.customLabel || '—' }}
                </p>
                <!-- Teacher -->
                <div class="flex items-center gap-1.5">
                  <span class="text-xs">👤</span>
                  <span class="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-snug">
                    {{ s.teacher?.name || s.item?.customLabel || '—' }}
                  </span>
                </div>
              </div>

              <!-- Right: End time -->
              <div class="flex items-center pr-3 shrink-0">
                <span class="text-[9px] font-mono text-slate-400 dark:text-slate-500">{{ s.slot.timeEnd }}</span>
              </div>
            </div>

            <!-- Empty Slot -->
            <div
              v-else-if="s.slot?.period"
              class="flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 min-h-[56px]"
            >
              <span class="text-sm font-semibold text-slate-400 dark:text-slate-600">Jam {{ s.slot.period }}</span>
              <span class="text-xs font-mono text-slate-300 dark:text-slate-700">{{ s.slot.timeDisplay }}</span>
            </div>

          </template>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           DESKTOP VIEW (md+): Row-based 5-column grid
           ══════════════════════════════════════════════════════════ -->
      <div class="hidden md:block p-4 print:block print:p-2">

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

        <!-- Slot Rows — each row = same height via CSS Grid auto row -->
        <div class="flex flex-col gap-1.5 print:gap-1">
          <div
            v-for="(row, rowIdx) in slotRows"
            :key="'row-' + rowIdx"
            class="grid gap-1.5 items-stretch print:gap-1"
            style="grid-template-columns: 52px repeat(5, 1fr);"
          >
            <!-- Period / Time label -->
            <div class="flex flex-col items-center justify-center text-center select-none">
              <template v-if="row.meta.isBreak">
                <span class="text-base print:hidden">☕</span>
              </template>
              <template v-else-if="row.meta.slot?.period">
                <span class="text-sm font-black text-slate-500 dark:text-slate-400 print:text-[9px]">{{ row.meta.slot.period }}</span>
                <span class="text-[9px] font-mono text-slate-400/70 dark:text-slate-600 mt-0.5 print:text-[6px]">{{ row.meta.slot.timeStart }}</span>
              </template>
            </div>

            <!-- 5 Day Cells -->
            <template v-for="(cell, cIdx) in row.cells" :key="'cell-' + rowIdx + '-' + cIdx">

              <!-- Break -->
              <div
                v-if="cell.isBreak"
                class="flex flex-col items-center justify-center rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-2 py-2.5 print:rounded-md print:py-1"
              >
                <span class="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 print:text-[7px]">{{ cell.label }}</span>
                <span class="text-[8px] font-mono text-amber-600/60 dark:text-amber-500/60 mt-0.5 print:text-[6px]">{{ cell.slot.timeDisplay }}</span>
              </div>

              <!-- Lesson -->
              <div
                v-else-if="cell.item?.teacherId || cell.item?.customLabel"
                :class="[
                  'relative flex flex-col rounded-xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-px print:rounded-md print:shadow-none print:translate-y-0',
                  getSubjectColor(cell.subjectName).bg,
                  getSubjectColor(cell.subjectName).border
                ]"
              >
                <div :class="['h-1 w-full shrink-0 print:h-0.5', getSubjectColor(cell.subjectName).accent]" />
                <div class="flex flex-col justify-between flex-1 px-2.5 py-2 print:px-1.5 print:py-1">
                  <p :class="['font-extrabold text-[12px] leading-snug print:text-[8px]', getSubjectColor(cell.subjectName).text]">
                    {{ cell.subjectName || cell.item?.customLabel || '—' }}
                  </p>
                  <div class="flex-1" />
                  <div class="flex items-center gap-1 mt-2 print:mt-0.5">
                    <span class="text-[9px] shrink-0 print:text-[6px]">👤</span>
                    <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight line-clamp-2 print:text-[7px] print:line-clamp-1">
                      {{ cell.teacher?.name || cell.item?.customLabel || '—' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty -->
              <div
                v-else-if="cell.slot?.period"
                class="flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 print:rounded-md"
              >
                <span class="text-slate-300 dark:text-slate-700 text-lg font-light print:hidden">—</span>
              </div>

              <!-- Placeholder -->
              <div v-else class="rounded-xl bg-slate-50/30 dark:bg-slate-800/10 print:rounded-md" />

            </template>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
