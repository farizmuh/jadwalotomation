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
    cols[colIndex].push(t)
  })
  return cols
})
</script>

<template>
  <div class="space-y-6">
    <!-- Paper Sheet Container -->
    <div
      id="printable-schedule"
      class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-lg p-4 sm:p-6 overflow-x-auto text-slate-900 dark:text-slate-100"
    >
      <!-- School Header -->
      <div class="text-center mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 class="font-extrabold text-lg sm:text-xl tracking-wide uppercase text-slate-900 dark:text-white">
          JADWAL PELAJARAN {{ schoolSetting?.semester || 'SEMESTER GANJIL' }} {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
        </h1>
        <h2 class="font-bold text-sm sm:text-base tracking-wider uppercase text-slate-700 dark:text-slate-300">
          {{ schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027' }}
        </h2>
      </div>

      <!-- TABLE 1: SENIN, SELASA, RABU -->
      <div class="mb-6 overflow-x-auto">
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
      <div class="mb-6 overflow-x-auto">
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
              v-for="slotIdx in Math.max(...bottomDays.map((d) => d.timeSlots.length))"
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
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
        <!-- Kode Guru Grid (3 cols) -->
        <div class="lg:col-span-3">
          <div class="border-2 border-slate-800 dark:border-slate-700 rounded-lg overflow-hidden">
            <div class="bg-slate-800 text-white font-extrabold px-3 py-1 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>KODE GURU :</span>
              <span class="text-[10px] font-normal text-slate-300">Total: {{ teachers.length }} Guru</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-300 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900">
              <div
                v-for="(col, colIndex) in teacherColumns"
                :key="'t-col-' + colIndex"
                class="divide-y divide-slate-200 dark:divide-slate-800"
              >
                <div
                  v-for="t in col"
                  :key="'t-row-' + t.id"
                  class="px-2 py-1 text-[10px] flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span class="w-5 text-right font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
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

        <!-- Official Signatures Block (1 col) -->
        <div class="lg:col-span-1 flex flex-col justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border-2 border-slate-800 dark:border-slate-700 rounded-lg text-center text-xs">
          <div>
            <p class="font-medium text-slate-600 dark:text-slate-400">
              {{ schoolSetting?.dateLocation || 'Donomulyo, 13 Juni 2026' }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 my-3 items-end">
            <!-- Kepala Sekolah with Seal & Stamp -->
            <div class="relative">
              <p class="font-bold text-[11px] mb-8">Kepala Sekolah</p>

              <!-- Stamp Visual Representation -->
              <div class="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
                <div class="w-16 h-16 rounded-full border-2 border-blue-600/60 dark:border-blue-400/60 flex items-center justify-center rotate-[-12deg] text-[7px] text-blue-700 dark:text-blue-300 font-extrabold uppercase p-1 text-center">
                  SMK ISLAM DONOMULYO
                </div>
              </div>

              <!-- Signature placeholder -->
              <div class="font-serif italic text-base text-slate-700 dark:text-slate-300 select-none pb-1">
                Imam Safi'i
              </div>
              <p class="font-bold text-[10px] underline uppercase">
                {{ schoolSetting?.headmasterName || "IMAM SAFI'I, S.Pd., M.Si" }}
              </p>
            </div>

            <!-- Wakakur -->
            <div>
              <p class="font-bold text-[11px] mb-8">Wakakur</p>
              <div class="font-serif italic text-base text-slate-700 dark:text-slate-300 select-none pb-1">
                Wahyu Dian P.
              </div>
              <p class="font-bold text-[10px] underline uppercase">
                {{ schoolSetting?.curriculumHeadName || 'WAHYU DIAN PERMANA, S.Pd' }}
              </p>
            </div>
          </div>

          <div class="text-[9px] text-slate-400 italic">
            Dokumen Resmi Jadwal Pembelajaran
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
