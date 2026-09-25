<script setup lang="ts">
defineProps<{
  modelValue: boolean
  conflicts: Array<{
    timeSlotId: number
    dayName: string
    period: number | null
    timeDisplay: string
    teacherId: number
    teacherName: string
    classrooms: { id: number; name: string }[]
    message: string
  }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'resolveSlot', payload: { timeSlotId: number; classroomId: number }): void
}>()
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
  >
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/20">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg">
            ⚠️
          </div>
          <div>
            <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              Daftar Tabrakan Jadwal (Bentrok)
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-bold">
                {{ conflicts.length }} Kasus
              </span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Guru berikut dijadwalkan di 2 kelas atau lebih pada jam pelajaran yang sama.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          @click="emit('update:modelValue', false)"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto space-y-3">
        <div v-if="conflicts.length === 0" class="text-center py-10">
          <span class="text-4xl">🎉</span>
          <p class="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            Hebat! Tidak Ada Tabrakan Jadwal
          </p>
          <p class="text-xs text-slate-500 mt-1">
            Seluruh guru telah terjadwal secara rapi tanpa bentrok di kelas manapun.
          </p>
        </div>

        <div
          v-for="(c, idx) in conflicts"
          :key="idx"
          class="p-4 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white rounded">
                Guru [{{ c.teacherId }}]
              </span>
              <span class="font-bold text-sm text-slate-900 dark:text-white">
                {{ c.teacherName }}
              </span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Hari <strong class="text-slate-900 dark:text-white">{{ c.dayName }}</strong> • Jam Ke-{{ c.period || '-' }} ({{ c.timeDisplay }})
            </p>
            <div class="flex items-center gap-1.5 mt-2 flex-wrap">
              <span class="text-xs text-slate-500">Kelas bentrok:</span>
              <span
                v-for="cls in c.classrooms"
                :key="cls.id"
                class="px-2 py-0.5 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 rounded text-xs font-semibold text-red-600 dark:text-red-400"
              >
                {{ cls.name }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-for="cls in c.classrooms"
              :key="'btn-' + cls.id"
              type="button"
              class="px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              @click="emit('resolveSlot', { timeSlotId: c.timeSlotId, classroomId: cls.id })"
            >
              Ubah {{ cls.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-800/50">
        <button
          type="button"
          class="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition"
          @click="emit('update:modelValue', false)"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
