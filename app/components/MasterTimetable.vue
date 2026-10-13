<script setup lang="ts">
const props = defineProps<{
  schoolSetting: any
  days: any[]
  classrooms: any[]
  teachers: any[]
  extracurriculars: any[]
  scheduleItems: any[]
  conflicts: any[]
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

// Map: `${timeSlotId}_${classroomId}` -> ScheduleItem
const scheduleMap = computed(() => {
  const map = new Map<string, any>()
  for (const item of props.scheduleItems) {
    map.set(`${item.timeSlotId}_${item.classroomId}`, item)
  }
  return map
})

// Set of conflicting cell keys: `${timeSlotId}_${teacherId}`
const conflictKeys = computed(() => {
  const keys = new Set<string>()
  for (const c of props.conflicts) {
    keys.add(`${c.timeSlotId}_${c.teacherId}`)
  }
  return keys
})

// Teacher ID -> Teacher Name map
const teacherMap = computed(() => {
  const map = new Map<number, any>()
  for (const t of props.teachers) {
    map.set(t.id, t)
  }
  return map
})

const topDays = computed(() => {
  const half = Math.ceil(props.days.length / 2)
  return props.days.slice(0, half)
})

const bottomDays = computed(() => {
  const half = Math.ceil(props.days.length / 2)
  return props.days.slice(half)
})

function getCell(slotId: number, classId: number) {
  return scheduleMap.value.get(`${slotId}_${classId}`)
}

function isConflict(slotId: number, teacherId: number | null) {
  if (!teacherId) return false
  return conflictKeys.value.has(`${slotId}_${teacherId}`)
}

function onCellClicked(dayName: string, slot: any, cls: any) {
  if (slot.slotType === 'BREAK') return
  const item = getCell(slot.id, cls.id)
  emit('cellClick', {
    timeSlotId: slot.id,
    classroomId: cls.id,
    dayName,
    period: slot.period,
    timeDisplay: slot.timeDisplay,
    classroomName: cls.name,
    currentTeacherId: item?.teacherId || null,
    currentSubjectCode: item?.subjectCode || null,
    customLabel: item?.customLabel || null
  })
}

// Split teachers into 4 columns for the bottom Kode Guru block
const teacherColumns = computed(() => {
  const count = props.teachers.length
  const colSize = Math.ceil(count / 4)
  const cols: any[][] = [[], [], [], []]
  props.teachers.forEach((t, index) => {
    const colIndex = Math.min(Math.floor(index / colSize), 3)
    cols[colIndex]!.push(t)
  })
  return cols
})

// Mobile master: selected day & class
const mobileSelDayIdx = ref(0)
const mobileSelClassIdx = ref(0)

const mobileSlots = computed(() => {
  const day = props.days[mobileSelDayIdx.value]
  if (!day) return []
  const cls = props.classrooms[mobileSelClassIdx.value]
  if (!cls) return []
  return day.timeSlots.map((slot: any) => {
    const item = scheduleMap.value.get(`${slot.id}_${cls.id}`)
    const teacher = item?.teacherId ? teacherMap.value.get(item.teacherId) : null
    const hasConflict = item?.teacherId ? conflictKeys.value.has(`${slot.id}_${item.teacherId}`) : false
    return { slot, item, teacher, hasConflict, cls }
  })
})

const DAY_SHORT: Record<string, string> = {
  SENIN: 'Sen', SELASA: 'Sel', RABU: 'Rab', KAMIS: 'Kam', "JUM'AT": 'Jum', SABTU: 'Sab', MINGGU: 'Min'
}
function dayShort(name: string): string {
  return DAY_SHORT[name?.toUpperCase()] || name?.slice(0, 3)
}
</script>

<template>
  <div class="space-y-4 print:space-y-0">

    <!-- ══════════════════════════════════════════════════════
         MOBILE VIEW (< md): Day tabs + Class tabs + Slot cards
         ══════════════════════════════════════════════════════ -->
    <div class="md:hidden print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden">

      <!-- Mobile Header -->
      <div class="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Matriks Master</p>
        <h2 class="text-base font-extrabold leading-tight">
          {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
        </h2>
        <p class="text-[10px] text-slate-400 mt-0.5">{{ schoolSetting?.semester }} · {{ schoolSetting?.academicYear }}</p>
      </div>

      <!-- Day Tabs -->
      <div class="flex gap-1.5 px-3 pt-3 pb-2 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800">
        <button
          v-for="(d, idx) in days"
          :key="'mob-day-' + idx"
          type="button"
          :class="[
            'flex-1 min-w-[48px] py-1.5 px-1 rounded-xl text-center font-bold text-xs whitespace-nowrap transition',
            mobileSelDayIdx === idx
              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          ]"
          @click="mobileSelDayIdx = idx"
        >
          {{ dayShort(d.name) }}
        </button>
      </div>

      <!-- Class Tabs -->
      <div class="flex gap-1 px-3 pt-2 pb-2 overflow-x-auto no-scrollbar">
        <button
          v-for="(cls, cIdx) in classrooms"
          :key="'mob-cls-' + cIdx"
          type="button"
          :class="[
            'shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition border',
            mobileSelClassIdx === cIdx
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          ]"
          @click="mobileSelClassIdx = cIdx"
        >
          {{ cls.name }}
        </button>
      </div>

      <!-- Slot Cards -->
      <div class="flex flex-col gap-2 px-3 pb-4">
        <template v-for="(s, sIdx) in mobileSlots" :key="'mob-master-' + sIdx">

          <!-- Break / Special -->
          <div
            v-if="s.slot.slotType === 'BREAK' || s.slot.slotType === 'FRIDAY_PRAYER' || s.slot.slotType === 'CEREMONY'"
            class="flex items-center justify-between px-4 py-3 rounded-xl"
            :class="s.slot.slotType === 'BREAK' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50' : s.slot.slotType === 'FRIDAY_PRAYER' ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50'"
          >
            <span class="text-sm font-black uppercase tracking-wide"
              :class="s.slot.slotType === 'BREAK' ? 'text-amber-700 dark:text-amber-400' : s.slot.slotType === 'FRIDAY_PRAYER' ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400'"
            >{{ s.slot.label || s.slot.slotType }}</span>
            <span class="text-xs font-mono text-slate-400">{{ s.slot.timeDisplay }}</span>
          </div>

          <!-- Lesson Slot -->
          <div
            v-else-if="s.slot.period"
            :class="[
              'flex items-stretch rounded-2xl border overflow-hidden min-h-[68px] transition-all',
              s.hasConflict
                ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 shadow-sm shadow-red-200 dark:shadow-red-900'
                : s.item?.teacherId
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
            ]"
            @click="onCellClicked(days[mobileSelDayIdx].name, s.slot, s.cls)"
          >
            <!-- Left accent + period -->
            <div
              :class="[
                'flex flex-col items-center justify-center px-3 min-w-[52px] border-r',
                s.hasConflict ? 'bg-red-500 text-white border-red-400' : s.item?.teacherId ? 'bg-emerald-500/10 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/40' : 'border-slate-200 dark:border-slate-700'
              ]"
            >
              <span :class="['text-xl font-black leading-none', s.hasConflict ? 'text-white' : 'text-slate-700 dark:text-slate-200']">{{ s.slot.period }}</span>
              <span :class="['text-[9px] font-mono mt-1', s.hasConflict ? 'text-red-100' : 'text-slate-400 dark:text-slate-500']">{{ s.slot.timeStart }}</span>
            </div>

            <!-- Content -->
            <div class="flex flex-col justify-center px-3 py-2.5 flex-1">
              <template v-if="s.hasConflict">
                <p class="text-sm font-black text-red-700 dark:text-red-400">⚠️ Bentrok!</p>
                <p class="text-xs text-red-600 dark:text-red-400">
                  {{ s.item?.teacherId }}{{ s.item?.subjectCode || '' }} · {{ s.teacher?.name }}
                </p>
              </template>
              <template v-else-if="s.item?.teacherId || s.item?.customLabel">
                <p class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {{ s.item.customLabel || `${s.item.teacherId}${s.item.subjectCode || ''}` }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ s.teacher?.name || '-' }}</p>
              </template>
              <template v-else>
                <p class="text-sm text-slate-400 dark:text-slate-600 italic">Belum diisi</p>
              </template>
            </div>

            <!-- Right: end time -->
            <div class="flex items-center pr-3 shrink-0">
              <span class="text-[9px] font-mono text-slate-400 dark:text-slate-500">{{ s.slot.timeEnd }}</span>
            </div>
          </div>

        </template>
      </div>

      <!-- Mobile Piket Info -->
      <div class="mx-3 mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Piket Pengajar</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-if="days[mobileSelDayIdx]?.piket?.teacher1?.name || days[mobileSelDayIdx]?.piket?.teacher1Name"
            class="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold"
          >
            {{ days[mobileSelDayIdx]?.piket?.teacher1?.name || days[mobileSelDayIdx]?.piket?.teacher1Name }}
          </span>
          <span
            v-if="days[mobileSelDayIdx]?.piket?.teacher2?.name || days[mobileSelDayIdx]?.piket?.teacher2Name"
            class="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold"
          >
            {{ days[mobileSelDayIdx]?.piket?.teacher2?.name || days[mobileSelDayIdx]?.piket?.teacher2Name }}
          </span>
          <span v-if="!days[mobileSelDayIdx]?.piket" class="text-xs text-slate-400 italic">-</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         DESKTOP VIEW (md+): Full master table (+ print)
         ══════════════════════════════════════════════════════ -->
    <!-- Paper Sheet Container -->
    <div
      id="printable-schedule"
      class="printable-area hidden md:block bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-lg p-4 sm:p-6 print:block print:p-0 print:m-0 print:border-none print:shadow-none overflow-x-auto text-slate-900 dark:text-slate-100"
    >
      <!-- School Header -->
      <div class="text-center mb-5 pb-3 border-b border-slate-200 dark:border-slate-800 print:mb-1 print:pb-0.5">
        <h1 class="font-extrabold text-lg sm:text-xl tracking-wide uppercase text-slate-900 dark:text-white print:text-[11px] print:mb-0">
          JADWAL PELAJARAN {{ schoolSetting?.semester || 'SEMESTER GANJIL' }} {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
        </h1>
        <h2 class="font-bold text-sm sm:text-base tracking-wider uppercase text-slate-700 dark:text-slate-300 print:text-[9.5px]">
          {{ schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027' }}
        </h2>
      </div>

      <!-- TABLE 1: SENIN, SELASA, RABU -->
      <div class="mb-6 overflow-x-auto print:mb-1 print:overflow-visible">
        <table class="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-center text-[11px] leading-tight select-none">
          <thead>
            <!-- Row 1: Day Names -->
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border-b-2 border-slate-800 dark:border-slate-700">
              <th rowspan="3" class="border border-slate-600 dark:border-slate-600 px-1 py-1 w-8">
                JAM<br />KE
              </th>
              <th rowspan="3" class="border border-slate-600 dark:border-slate-600 px-1 py-1 w-20">
                WAKTU
              </th>

              <template v-for="d in topDays" :key="'th-day-' + d.id">
                <th
                  :colspan="classrooms.length"
                  class="border-2 border-slate-800 dark:border-slate-600 py-1.5 uppercase tracking-wider text-xs bg-slate-200/80 dark:bg-slate-700/80 font-black"
                >
                  {{ d.name }}
                </th>
              </template>
            </tr>

            <!-- Row 2: Grade (X, XI, XII) -->
            <tr class="bg-slate-100 dark:bg-slate-800/80 font-bold border-b border-slate-600">
              <template v-for="d in topDays" :key="'th-grade-' + d.id">
                <th colspan="3" class="border border-slate-600 py-0.5 text-[11px]">X</th>
                <th colspan="3" class="border border-slate-600 py-0.5 text-[11px]">XI</th>
                <th colspan="4" class="border border-slate-600 py-0.5 text-[11px]">XII</th>
              </template>
            </tr>

            <!-- Row 3: Major (BDP, TKJ, MP, ...) -->
            <tr class="bg-slate-50 dark:bg-slate-800/50 font-semibold border-b-2 border-slate-800">
              <template v-for="d in topDays" :key="'th-majors-' + d.id">
                <th
                  v-for="cls in classrooms"
                  :key="'cls-' + cls.id + '-' + d.id"
                  class="border border-slate-600 px-1 py-1 text-[10px] w-9 font-bold"
                >
                  {{ cls.major }}
                </th>
              </template>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="slotIdx in Math.max(...topDays.map((d) => d.timeSlots.length))"
              :key="'top-slot-' + slotIdx"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
            >
              <!-- Jam Ke -->
              <td class="border border-slate-600 font-bold bg-slate-100/60 dark:bg-slate-800/60 py-1">
                {{ topDays[0]?.timeSlots[slotIdx - 1]?.period || '' }}
              </td>

              <!-- Waktu -->
              <td class="border border-slate-600 px-1 py-1 whitespace-nowrap text-[10px] font-mono">
                {{ topDays[0]?.timeSlots[slotIdx - 1]?.timeDisplay || '' }}
              </td>

              <!-- Day Cells -->
              <template v-for="d in topDays" :key="'top-cell-day-' + d.id">
                <template v-if="d.timeSlots[slotIdx - 1]">
                  <!-- BREAK ROW -->
                  <td
                    v-if="d.timeSlots[slotIdx - 1].slotType === 'BREAK'"
                    :colspan="classrooms.length"
                    class="border border-slate-600 bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-black tracking-widest text-xs py-1"
                  >
                    {{ d.timeSlots[slotIdx - 1].label || 'ISTIRAHAT' }}
                  </td>

                  <!-- CEREMONY ROW (UPACARA) -->
                  <td
                    v-else-if="d.timeSlots[slotIdx - 1].slotType === 'CEREMONY'"
                    :colspan="classrooms.length"
                    class="border border-slate-600 bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold text-[10px] py-1 cursor-pointer hover:bg-emerald-200/80 transition"
                    @click="onCellClicked(d.name, d.timeSlots[slotIdx - 1], classrooms[0])"
                  >
                    {{ d.timeSlots[slotIdx - 1].label || 'UPACARA/PEMBINAAN WALI KELAS/ APEL' }}
                  </td>

                  <!-- LESSON CELLS -->
                  <template v-else>
                    <td
                      v-for="cls in classrooms"
                      :key="'cell-' + d.id + '-' + cls.id + '-' + slotIdx"
                      :class="[
                        'border border-slate-600 px-0.5 py-1 cursor-pointer transition-all duration-150',
                        isConflict(d.timeSlots[slotIdx - 1].id, getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId)
                          ? 'bg-red-500 text-white font-black animate-pulse ring-2 ring-red-400'
                          : getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId
                            ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-slate-800 dark:text-slate-100'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                      ]"
                      :title="getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId
                        ? `[${getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId}] ${teacherMap.get(getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId)?.name} (Kelas ${cls.name})`
                        : 'Klik untuk atur guru'"
                      @click="onCellClicked(d.name, d.timeSlots[slotIdx - 1], cls)"
                    >
                      <span v-if="getCell(d.timeSlots[slotIdx - 1].id, cls.id)">
                        {{
                          getCell(d.timeSlots[slotIdx - 1].id, cls.id).customLabel ||
                          `${getCell(d.timeSlots[slotIdx - 1].id, cls.id).teacherId || ''}${getCell(d.timeSlots[slotIdx - 1].id, cls.id).subjectCode || ''}`
                        }}
                      </span>
                      <span v-else class="text-slate-300 dark:text-slate-700">-</span>
                    </td>
                  </template>
                </template>
                <template v-else>
                  <td :colspan="classrooms.length" class="border border-slate-600"></td>
                </template>
              </template>
            </tr>

            <!-- Piket Pengajar Row Top -->
            <tr class="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-800">
              <td colspan="2" class="border border-slate-600 px-2 py-1.5 text-left font-black text-[11px]">
                Piket Pengajar
              </td>
              <td
                v-for="d in topDays"
                :key="'piket-top-' + d.id"
                :colspan="classrooms.length"
                class="border border-slate-600 px-2 py-1 text-center text-[10px]"
              >
                <div class="flex items-center justify-center gap-2 flex-wrap">
                  <span class="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 shadow-xs border border-slate-300 dark:border-slate-600">
                    {{ d.piket?.teacher1?.name || d.piket?.teacher1Name || '-' }}
                  </span>
                  <span>&</span>
                  <span class="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 shadow-xs border border-slate-300 dark:border-slate-600">
                    {{ d.piket?.teacher2?.name || d.piket?.teacher2Name || '-' }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TABLE 2: KAMIS, JUM'AT + PEMBINA EKSTRAKURIKULER SIDEBAR -->
      <div class="mb-6 overflow-x-auto print:mb-1 print:overflow-visible">
        <table class="w-full border-collapse border-2 border-slate-800 dark:border-slate-700 text-center text-[11px] leading-tight select-none">
          <thead>
            <!-- Row 1: Day Names -->
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border-b-2 border-slate-800 dark:border-slate-700">
              <th rowspan="3" class="border border-slate-600 px-1 py-1 w-8">
                JAM<br />KE
              </th>
              <th rowspan="3" class="border border-slate-600 px-1 py-1 w-20">
                WAKTU
              </th>

              <template v-for="d in bottomDays" :key="'th-day-b-' + d.id">
                <th
                  :colspan="classrooms.length"
                  class="border-2 border-slate-800 dark:border-slate-600 py-1.5 uppercase tracking-wider text-xs bg-slate-200/80 dark:bg-slate-700/80 font-black"
                >
                  {{ d.name }}
                </th>
              </template>

              <!-- Pembina Column Header -->
              <th colspan="2" class="border-2 border-slate-800 dark:border-slate-600 py-1.5 uppercase tracking-wider text-xs bg-amber-200/70 dark:bg-amber-900/40 text-amber-950 dark:text-amber-200 font-black">
                Pembina
              </th>
            </tr>

            <!-- Row 2: Grade (X, XI, XII) -->
            <tr class="bg-slate-100 dark:bg-slate-800/80 font-bold border-b border-slate-600">
              <template v-for="d in bottomDays" :key="'th-grade-b-' + d.id">
                <th colspan="3" class="border border-slate-600 py-0.5 text-[11px]">X</th>
                <th colspan="3" class="border border-slate-600 py-0.5 text-[11px]">XI</th>
                <th colspan="4" class="border border-slate-600 py-0.5 text-[11px]">XII</th>
              </template>
              <th class="border border-slate-600 py-0.5 text-[10px] w-20">Kegiatan</th>
              <th class="border border-slate-600 py-0.5 text-[10px]">Nama Pembina</th>
            </tr>

            <!-- Row 3: Major (BDP, TKJ, MP...) -->
            <tr class="bg-slate-50 dark:bg-slate-800/50 font-semibold border-b-2 border-slate-800">
              <template v-for="d in bottomDays" :key="'th-majors-b-' + d.id">
                <th
                  v-for="cls in classrooms"
                  :key="'cls-b-' + cls.id + '-' + d.id"
                  class="border border-slate-600 px-1 py-1 text-[10px] w-9 font-bold"
                >
                  {{ cls.major }}
                </th>
              </template>
              <th class="border border-slate-600 py-0.5 text-[9px] text-slate-400">Ekskul</th>
              <th class="border border-slate-600 py-0.5 text-[9px] text-slate-400">Guru</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="slotIdx in Math.max((extracurriculars || []).length, ...bottomDays.map((d) => d.timeSlots.length))"
              :key="'bot-slot-' + slotIdx"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
            >
              <!-- Jam Ke -->
              <td class="border border-slate-600 font-bold bg-slate-100/60 dark:bg-slate-800/60 py-1">
                {{ bottomDays[0]?.timeSlots[slotIdx - 1]?.period || '' }}
              </td>

              <!-- Waktu -->
              <td class="border border-slate-600 px-1 py-1 whitespace-nowrap text-[10px] font-mono">
                {{ bottomDays[0]?.timeSlots[slotIdx - 1]?.timeDisplay || '' }}
              </td>

              <!-- Day Cells -->
              <template v-for="d in bottomDays" :key="'bot-cell-day-' + d.id">
                <template v-if="d.timeSlots[slotIdx - 1]">
                  <!-- BREAK -->
                  <td
                    v-if="d.timeSlots[slotIdx - 1].slotType === 'BREAK'"
                    :colspan="classrooms.length"
                    class="border border-slate-600 bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-black tracking-widest text-xs py-1"
                  >
                    {{ d.timeSlots[slotIdx - 1].label || 'ISTIRAHAT' }}
                  </td>

                  <!-- FRIDAY PRAYER -->
                  <td
                    v-else-if="d.timeSlots[slotIdx - 1].slotType === 'FRIDAY_PRAYER'"
                    :colspan="classrooms.length"
                    class="border border-slate-600 bg-blue-100/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-black tracking-wider text-xs py-1 cursor-pointer hover:bg-blue-200 transition"
                    @click="onCellClicked(d.name, d.timeSlots[slotIdx - 1], classrooms[0])"
                  >
                    {{ d.timeSlots[slotIdx - 1].label || "SHOLAT JUM'AT/ KEPUTRIAN" }}
                  </td>

                  <!-- LESSON CELLS -->
                  <template v-else>
                    <td
                      v-for="cls in classrooms"
                      :key="'cell-b-' + d.id + '-' + cls.id + '-' + slotIdx"
                      :class="[
                        'border border-slate-600 px-0.5 py-1 cursor-pointer transition-all duration-150',
                        isConflict(d.timeSlots[slotIdx - 1].id, getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId)
                          ? 'bg-red-500 text-white font-black animate-pulse ring-2 ring-red-400'
                          : getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId
                            ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-slate-800 dark:text-slate-100'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                      ]"
                      :title="getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId
                        ? `[${getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId}] ${teacherMap.get(getCell(d.timeSlots[slotIdx - 1].id, cls.id)?.teacherId)?.name} (Kelas ${cls.name})`
                        : 'Klik untuk atur guru'"
                      @click="onCellClicked(d.name, d.timeSlots[slotIdx - 1], cls)"
                    >
                      <span v-if="getCell(d.timeSlots[slotIdx - 1].id, cls.id)">
                        {{
                          getCell(d.timeSlots[slotIdx - 1].id, cls.id).customLabel ||
                          `${getCell(d.timeSlots[slotIdx - 1].id, cls.id).teacherId || ''}${getCell(d.timeSlots[slotIdx - 1].id, cls.id).subjectCode || ''}`
                        }}
                      </span>
                      <span v-else class="text-slate-300 dark:text-slate-700">-</span>
                    </td>
                  </template>
                </template>
                <template v-else>
                  <td :colspan="classrooms.length" class="border border-slate-600"></td>
                </template>
              </template>

              <!-- Extracurricular Sidebar Row -->
              <td class="border border-slate-600 px-2 py-1 font-bold text-left text-[10px] bg-slate-50 dark:bg-slate-800/40">
                {{ extracurriculars[slotIdx - 1]?.name || '' }}
              </td>
              <td class="border border-slate-600 px-2 py-1 text-left text-[10px] whitespace-nowrap">
                <span v-if="extracurriculars[slotIdx - 1]">
                  : {{ extracurriculars[slotIdx - 1]?.leader }}
                </span>
              </td>
            </tr>

            <!-- Piket Pengajar Row Bottom -->
            <tr class="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-800">
              <td colspan="2" class="border border-slate-600 px-2 py-1.5 text-left font-black text-[11px]">
                Piket Pengajar
              </td>
              <td
                v-for="d in bottomDays"
                :key="'piket-bot-' + d.id"
                :colspan="classrooms.length"
                class="border border-slate-600 px-2 py-1 text-center text-[10px]"
              >
                <div class="flex items-center justify-center gap-2 flex-wrap">
                  <span class="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 shadow-xs border border-slate-300 dark:border-slate-600">
                    {{ d.piket?.teacher1?.name || d.piket?.teacher1Name || '-' }}
                  </span>
                  <span>&</span>
                  <span class="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 shadow-xs border border-slate-300 dark:border-slate-600">
                    {{ d.piket?.teacher2?.name || d.piket?.teacher2Name || '-' }}
                  </span>
                </div>
              </td>
              <td colspan="2" class="border border-slate-600 bg-slate-50 dark:bg-slate-800/40"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TABLE 3: KODE GURU & SIGNATURES -->
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
                    <span class="w-5 text-right font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0 print:w-3.5">
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

        <!-- Official Signatures Block (5 cols for ample horizontal space) -->
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
              <!-- Ruang Tanda Tangan & Stempel Manual -->
              <div class="h-16 print:h-8"></div>
              <p class="font-bold text-[11px] underline uppercase whitespace-nowrap tracking-tight text-slate-900 dark:text-white print:text-[8px]">
                {{ schoolSetting?.headmasterName || "IMAM SAFI'I, S.Pd., M.Si" }}
              </p>
            </div>

            <!-- Wakakur -->
            <div class="flex flex-col items-center justify-between min-w-0">
              <p class="font-bold text-xs text-slate-900 dark:text-white print:text-[8.5px]">
                Wakakur
              </p>
              <!-- Ruang Tanda Tangan Manual -->
              <div class="h-16 print:h-8"></div>
              <p class="font-bold text-[11px] underline uppercase whitespace-nowrap tracking-tight text-slate-900 dark:text-white print:text-[8px]">
                {{ schoolSetting?.curriculumHeadName || 'WAHYU DIAN PERMANA, S.Pd' }}
              </p>
            </div>
          </div>

          <div class="text-[10px] text-slate-400 italic print:text-[7.5px]">
            Dokumen Resmi Jadwal Pembelajaran
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
