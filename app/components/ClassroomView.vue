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
  for (const t of props.teachers) {
    map.set(t.id, t)
  }
  return map
})

const weeklyClassGrid = computed(() => {
  const result: any[] = []

  for (const day of props.days) {
    const slots: any[] = []
    for (const slot of day.timeSlots) {
      if (slot.slotType === 'BREAK') {
        slots.push({
          slot,
          isBreak: true,
          label: slot.label || 'ISTIRAHAT'
        })
      } else {
        const item = props.scheduleItems.find(
          (s) => s.timeSlotId === slot.id && s.classroomId === selectedClassId.value
        )
        const teacher = item?.teacherId ? teacherMap.value.get(item.teacherId) : null
        slots.push({
          slot,
          isBreak: false,
          item,
          teacher
        })
      }
    }
    result.push({
      day,
      slots
    })
  }

  return result
})

function printClassSchedule() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Controls Bar -->
    <div class="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <label class="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
          Pilih Kelas :
        </label>
        <select
          v-model="selectedClassId"
          class="w-full sm:w-80 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option
            v-for="c in classrooms"
            :key="c.id"
            :value="c.id"
          >
            Kelas {{ c.name }} (Tingkat {{ c.grade }} - {{ c.major }})
          </option>
        </select>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button
          type="button"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          @click="printClassSchedule"
        >
          <span>🖨️</span>
          <span>Cetak Jadwal Kelas</span>
        </button>
      </div>
    </div>

    <!-- Classroom Timetable Card -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md text-slate-900 dark:text-white">
      <!-- Header -->
      <div class="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Jadwal Pelajaran Kelas
          </span>
          <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            Kelas {{ currentClass?.name }}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Tingkat {{ currentClass?.grade }} • Jurusan {{ currentClass?.major }} • {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
          </p>
        </div>

        <div class="text-right">
          <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {{ schoolSetting?.semester || 'SEMESTER GANJIL' }}
          </p>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027' }}
          </p>
        </div>
      </div>

      <!-- 5 Days Grid -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div
          v-for="d in weeklyClassGrid"
          :key="'cg-day-' + d.day.id"
          class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 flex flex-col"
        >
          <div class="bg-slate-800 text-white font-extrabold text-center py-2 text-xs uppercase tracking-wider">
            {{ d.day.name }}
          </div>

          <div class="p-2 space-y-1.5 flex-1">
            <template v-for="(s, sIdx) in d.slots" :key="'slot-c-' + sIdx">
              <!-- Break -->
              <div
                v-if="s.isBreak"
                class="px-2 py-1 bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-[10px] font-bold text-center rounded"
              >
                {{ s.label }} ({{ s.slot.timeDisplay }})
              </div>

              <!-- Lesson / Teacher Slot -->
              <div
                v-else-if="s.item?.teacherId || s.item?.customLabel"
                class="px-2.5 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-slate-900 dark:text-white rounded-lg text-xs"
              >
                <div class="flex items-center justify-between font-bold">
                  <span class="text-blue-700 dark:text-blue-300">Jam ke-{{ s.slot.period }}</span>
                  <span class="font-mono px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px]">
                    {{ s.item.customLabel || `${s.item.teacherId}${s.item.subjectCode || ''}` }}
                  </span>
                </div>
                <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1 truncate">
                  {{ s.teacher?.name || s.item.customLabel || '-' }}
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  {{ s.slot.timeDisplay }}
                </div>
              </div>

              <!-- Unassigned -->
              <div
                v-else-if="s.slot.period"
                class="px-2 py-1 text-[10px] text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-800 rounded text-center"
              >
                Jam {{ s.slot.period }} • Kosong
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
