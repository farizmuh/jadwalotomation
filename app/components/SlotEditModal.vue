<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  slotInfo: {
    timeSlotId: number
    classroomId: number
    dayName: string
    period: number | null
    timeDisplay: string
    classroomName: string
    currentTeacherId: number | null
    currentSubjectCode: string | null
    customLabel: string | null
  } | null
  teachers: Array<{
    id: number
    name: string
  }>
  busyTeacherIds: number[]
  scheduleItems?: any[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const selectedTeacherId = ref<number | null>(null)
const subjectCode = ref('')
const customText = ref('')
const isSubmitting = ref(false)
const conflictWarning = ref('')
const errorMessage = ref('')

const selectedTeacher = computed(() =>
  props.teachers.find((t: any) => t.id === selectedTeacherId.value) as any
)

function getSubjectJpStats(sub: any) {
  const target = sub.targetJp || 0
  if (!props.scheduleItems || !selectedTeacherId.value) {
    return { scheduled: 0, target, remaining: target }
  }
  const scheduled = props.scheduleItems.filter((item: any) => {
    return item.teacherId === selectedTeacherId.value &&
      item.subjectCode?.toLowerCase() === sub.code.toLowerCase()
  }).length
  return {
    scheduled,
    target,
    remaining: target - scheduled
  }
}

watch(
  () => props.slotInfo,
  (newVal) => {
    if (newVal) {
      selectedTeacherId.value = newVal.currentTeacherId
      subjectCode.value = newVal.currentSubjectCode || ''
      customText.value = newVal.customLabel || ''
      errorMessage.value = ''
      conflictWarning.value = ''
      checkLocalConflict()
    }
  },
  { immediate: true }
)

function checkLocalConflict() {
  conflictWarning.value = ''
  if (selectedTeacherId.value && props.busyTeacherIds.includes(selectedTeacherId.value)) {
    // Only warn if they didn't already occupy this specific cell
    if (selectedTeacherId.value !== props.slotInfo?.currentTeacherId) {
      const teacher = props.teachers.find((t) => t.id === selectedTeacherId.value)
      conflictWarning.value = `Peringatan: ${teacher?.name || 'Guru ini'} sudah dijadwalkan mengajar di kelas lain pada jam ini!`
    }
  }
}

const hasNoSubjects = computed(() => {
  if (!selectedTeacherId.value) return false
  return !selectedTeacher.value?.subjects || selectedTeacher.value.subjects.length === 0
})

const isSubjectValid = computed(() => {
  if (!selectedTeacherId.value) return true
  if (hasNoSubjects.value) return false
  if (!subjectCode.value || !subjectCode.value.trim()) return false
  const cleanCode = subjectCode.value.trim().toLowerCase()
  return selectedTeacher.value.subjects.some((s: any) => s.code.toLowerCase() === cleanCode)
})

const canSave = computed(() => {
  if (isSubmitting.value) return false
  if (selectedTeacherId.value) {
    if (hasNoSubjects.value) {
      return Boolean(customText.value && customText.value.trim())
    }
    return isSubjectValid.value
  }
  return true
})

watch(selectedTeacherId, (newId) => {
  checkLocalConflict()
  if (newId && selectedTeacher.value?.subjects && selectedTeacher.value.subjects.length > 0) {
    const currentCode = subjectCode.value.trim().toLowerCase()
    const match = selectedTeacher.value.subjects.find((s: any) => s.code.toLowerCase() === currentCode)
    if (!match) {
      subjectCode.value = selectedTeacher.value.subjects[0].code
    }
  } else if (!newId) {
    subjectCode.value = ''
  }
})

async function saveSlot(allowConflict = false) {
  if (!props.slotInfo) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const res: any = await $fetch('/api/schedule/slot', {
      method: 'POST',
      body: {
        timeSlotId: props.slotInfo.timeSlotId,
        classroomId: props.slotInfo.classroomId,
        teacherId: selectedTeacherId.value,
        subjectCode: subjectCode.value,
        customLabel: customText.value,
        allowConflict
      }
    })

    if (res.conflict && !allowConflict) {
      errorMessage.value = res.message
      return
    }

    if (res.success) {
      emit('update:modelValue', false)
      emit('saved')
    } else {
      errorMessage.value = res.error || 'Gagal menyimpan slot'
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Terjadi kesalahan sistem'
  } finally {
    isSubmitting.value = false
  }
}

async function clearSlot() {
  selectedTeacherId.value = null
  subjectCode.value = ''
  customText.value = ''
  await saveSlot(true)
}
</script>

<template>
  <div
    v-if="modelValue && slotInfo"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
  >
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-sm">
              {{ slotInfo.classroomName }}
            </span>
            <span>Atur Jadwal Pelajaran</span>
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hari {{ slotInfo.dayName }} • Jam ke-{{ slotInfo.period || '-' }} ({{ slotInfo.timeDisplay }})
          </p>
        </div>
        <button
          type="button"
          class="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          @click="emit('update:modelValue', false)"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-5">
        <!-- Error & Conflict Alert -->
        <div
          v-if="errorMessage"
          class="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
        >
          <span class="text-base font-bold">⚠️</span>
          <div class="flex-1">
            <p class="font-semibold">Tabrakan Terdeteksi!</p>
            <p class="mt-0.5">{{ errorMessage }}</p>
            <div class="mt-2.5 flex gap-2">
              <button
                type="button"
                class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition"
                @click="saveSlot(true)"
              >
                Tetap Simpan (Paksa Bentrok)
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md hover:bg-slate-300 transition"
                @click="errorMessage = ''"
              >
                Pilih Guru Lain
              </button>
            </div>
          </div>
        </div>

        <div
          v-else-if="conflictWarning"
          class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2"
        >
          <span class="text-base">⚠️</span>
          <span>{{ conflictWarning }}</span>
        </div>

        <!-- Teacher Selector -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Pilih Guru Pengajar
          </label>
          <select
            v-model="selectedTeacherId"
            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition font-medium"
          >
            <option :value="null">-- Tidak Ada Guru / Kosongkan --</option>
            <option
              v-for="t in teachers"
              :key="t.id"
              :value="t.id"
            >
              No. {{ t.id }} — {{ t.name }} {{ (!(t as any).subjects || (t as any).subjects.length === 0) ? '(Non-Pengajar / Tanpa Mapel)' : '' }} {{ busyTeacherIds.includes(t.id) && t.id !== slotInfo.currentTeacherId ? '(Sedang Mengajar di Kelas Lain)' : '' }}
            </option>
          </select>
        </div>

        <!-- Subject Selection (Auto from Teacher's registered subjects) -->
        <div v-if="selectedTeacherId" class="space-y-2">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Pilih Mata Pelajaran Guru *</span>
            <span v-if="selectedTeacher?.subjects && selectedTeacher.subjects.length > 0" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
              Klik salah satu mapel di bawah:
            </span>
          </label>

          <!-- Registered subjects buttons -->
          <div
            v-if="selectedTeacher?.subjects && selectedTeacher.subjects.length > 0"
            class="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            <button
              v-for="sub in selectedTeacher.subjects"
              :key="sub.id"
              type="button"
              :class="[
                'p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2',
                subjectCode.toLowerCase() === sub.code.toLowerCase()
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-300'
              ]"
              @click="subjectCode = sub.code"
            >
              <div class="flex items-center gap-2 truncate">
                <span class="w-6 h-6 rounded-md bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {{ sub.code }}
                </span>
                <div class="truncate">
                  <span class="text-xs truncate block font-medium">{{ sub.name }}</span>
                  <span class="text-[10px] text-slate-400 block font-normal">
                    Terisi {{ getSubjectJpStats(sub).scheduled }}/{{ getSubjectJpStats(sub).target }} JP
                  </span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <span
                  :class="[
                    'text-[10px] px-2 py-0.5 rounded-full font-bold inline-block whitespace-nowrap',
                    getSubjectJpStats(sub).remaining > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : getSubjectJpStats(sub).remaining === 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                  ]"
                >
                  <span v-if="getSubjectJpStats(sub).remaining > 0">Sisa {{ getSubjectJpStats(sub).remaining }} JP</span>
                  <span v-else-if="getSubjectJpStats(sub).remaining === 0">✓ Lengkap</span>
                  <span v-else>+{{ Math.abs(getSubjectJpStats(sub).remaining) }} JP</span>
                </span>
              </div>
            </button>
          </div>

          <!-- Info if teacher has NO subjects (Non-Pengajar / Kepsek / TU) -->
          <div
            v-else
            class="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5"
          >
            <span class="text-base shrink-0">ℹ️</span>
            <div>
              <p class="font-bold">Guru Terdaftar Sebagai Non-Pengajar (Kepsek / Staf TU)</p>
              <p class="text-[11px] mt-0.5 leading-relaxed text-blue-800 dark:text-blue-300">
                Guru ini tidak memiliki mata pelajaran mengajar di kelas. Untuk menjadwalkan penugasan khusus (misal: Pembina Apel, Upacara, dll.), silakan isi kolom <strong>Teks Kustom</strong> di bawah. Atau tambahkan mapel di menu Pengaturan jika guru ini juga mengajar kelas.
              </p>
            </div>
          </div>
        </div>

        <!-- Manual Subject Code & Preview -->
        <div v-if="!hasNoSubjects" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Kode Mapel Terpilih
            </label>
            <input
              v-model="subjectCode"
              type="text"
              maxlength="3"
              placeholder="Pilih mapel di atas"
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition font-bold uppercase"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              Kode di sel: <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ selectedTeacherId ? `${selectedTeacherId}${subjectCode}` : '-' }}</span>
            </p>
          </div>

          <!-- Preview Result -->
          <div class="flex flex-col justify-end">
            <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700">
              <span class="text-xs text-slate-500">Tampilan Sel:</span>
              <span class="font-mono font-bold text-base px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                {{ selectedTeacherId ? `${selectedTeacherId}${subjectCode}` : (customText || '-') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Custom Label Override -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Teks Kustom (Opsional / Non-Pelajaran)
          </label>
          <input
            v-model="customText"
            type="text"
            placeholder="Contoh: UPACARA, APEL, WORKSHOP..."
            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
          />
          <p class="text-[11px] text-slate-400 mt-1">
            Jika diisi, teks ini akan ditampilkan menggantikan kode guru.
          </p>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
          @click="clearSlot"
        >
          Kosongkan Slot
        </button>

        <div class="flex items-center gap-2.5">
          <div v-if="selectedTeacherId && !canSave" class="text-xs text-amber-600 dark:text-amber-400 font-semibold text-right max-w-[220px] leading-tight">
            <span v-if="hasNoSubjects">💡 Isi Teks Kustom di atas</span>
            <span v-else-if="!subjectCode">⚠️ Wajib pilih mapel di atas</span>
          </div>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            @click="emit('update:modelValue', false)"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isSubmitting || !canSave"
            class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
            @click="saveSlot(false)"
          >
            <span v-if="isSubmitting" class="animate-spin">⏳</span>
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
