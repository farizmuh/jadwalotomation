<script setup lang="ts">
const props = defineProps<{
  teachers: any[]
  days: any[]
  classrooms: any[]
  scheduleItems: any[]
  schoolSetting: any
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const selectedTeacherId = ref<number>(props.teachers[0]?.id || 1)

const currentTeacher = computed(() =>
  props.teachers.find((t) => t.id === selectedTeacherId.value)
)

// Filter schedules for the selected teacher
const teacherSchedules = computed(() => {
  return props.scheduleItems.filter((i) => i.teacherId === selectedTeacherId.value)
})

// Calculate total hours per week
const totalTeachingHours = computed(() => {
  return teacherSchedules.value.length
})

const totalTargetJp = computed(() => {
  if (!currentTeacher.value?.subjects) return 0
  return currentTeacher.value.subjects.reduce((sum: number, s: any) => sum + (s.targetJp || 0), 0)
})

const remainingJp = computed(() => {
  return totalTargetJp.value - totalTeachingHours.value
})

function getSubjectJpStats(sub: any) {
  const target = sub.targetJp || 0
  const scheduled = teacherSchedules.value.filter((i) => i.subjectCode?.toLowerCase() === sub.code.toLowerCase()).length
  return {
    scheduled,
    target,
    remaining: target - scheduled
  }
}

// Build matrix per day & period for this teacher
const weeklyGrid = computed(() => {
  const result: any[] = []

  for (const day of props.days) {
    const daySlots: any[] = []
    for (const slot of day.timeSlots) {
      if (slot.slotType === 'BREAK') {
        daySlots.push({
          slot,
          isBreak: true,
          content: slot.label || 'ISTIRAHAT'
        })
      } else {
        const item = teacherSchedules.value.find((s) => s.timeSlotId === slot.id)
        daySlots.push({
          slot,
          isBreak: false,
          item,
          classroom: item ? props.classrooms.find((c) => c.id === item.classroomId) : null
        })
      }
    }
    result.push({
      day,
      slots: daySlots
    })
  }

  return result
})

// Notification State
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)
function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 4000)
}

// Modal State for Direct Slot Editing in TeacherView
const selectedSlotForEdit = ref<any>(null)
const editMode = ref<'assign' | 'edit' | 'move'>('assign')
const editForm = reactive({
  classroomId: null as number | null,
  subjectCode: '',
  customLabel: '',
  targetSlotId: null as number | null
})

const isSaving = ref(false)
const errorMessage = ref('')
const conflictWarning = ref('')

// Check classroom status in a specific timeslot (free vs occupied by someone else)
function getClassroomsStatusForSlot(timeSlotId: number) {
  const itemsInSlot = props.scheduleItems.filter((i) => i.timeSlotId === timeSlotId)
  return props.classrooms.map((cls) => {
    const item = itemsInSlot.find((i) => i.classroomId === cls.id)
    const isOccupied = Boolean(item && item.teacherId)
    const teacher = isOccupied ? props.teachers.find((t) => t.id === item.teacherId) : null
    const isCurrentTeacher = isOccupied && item.teacherId === selectedTeacherId.value
    return {
      classroom: cls,
      isOccupied,
      isCurrentTeacher,
      teacher,
      item
    }
  })
}

// Free slots across all days for moving
const freeSlotsForTeacher = computed(() => {
  const freeList: any[] = []
  for (const d of props.days) {
    for (const slot of d.timeSlots) {
      if (slot.slotType !== 'BREAK' && slot.period) {
        const isScheduled = teacherSchedules.value.some((s) => s.timeSlotId === slot.id)
        if (!isScheduled) {
          freeList.push({
            day: d,
            slot,
            label: `${d.name} • Jam ke-${slot.period} (${slot.timeDisplay})`
          })
        }
      }
    }
  }
  return freeList
})

function openSlotModal(day: any, s: any) {
  if (s.isBreak) return

  selectedSlotForEdit.value = {
    day,
    slot: s.slot,
    item: s.item || null,
    classroom: s.classroom || null
  }

  errorMessage.value = ''
  conflictWarning.value = ''

  if (s.item) {
    editMode.value = 'edit'
    editForm.classroomId = s.item.classroomId
    editForm.subjectCode = s.item.subjectCode || ''
    editForm.customLabel = s.item.customLabel || ''
    editForm.targetSlotId = null
  } else {
    editMode.value = 'assign'
    const statuses = getClassroomsStatusForSlot(s.slot.id)
    const firstFree = statuses.find((st) => !st.isOccupied)
    editForm.classroomId = firstFree ? firstFree.classroom.id : props.classrooms[0]?.id || null
    editForm.subjectCode = currentTeacher.value?.subjects?.[0]?.code || ''
    editForm.customLabel = ''
    editForm.targetSlotId = null
  }
}

const canSave = computed(() => {
  if (isSaving.value) return false
  if (!editForm.classroomId) return false
  if (!currentTeacher.value?.subjects || currentTeacher.value.subjects.length === 0) {
    // Non-teaching teacher: requires customLabel
    return Boolean(editForm.customLabel && editForm.customLabel.trim())
  }
  return Boolean(editForm.subjectCode && editForm.subjectCode.trim())
})

async function saveSlot(allowConflict = false) {
  if (!selectedSlotForEdit.value || !editForm.classroomId) return
  isSaving.value = true
  errorMessage.value = ''

  try {
    const res: any = await $fetch('/api/schedule/slot', {
      method: 'POST',
      body: {
        timeSlotId: selectedSlotForEdit.value.slot.id,
        classroomId: editForm.classroomId,
        teacherId: selectedTeacherId.value,
        subjectCode: editForm.subjectCode || null,
        customLabel: editForm.customLabel || null,
        allowConflict
      }
    })

    if (res.conflict && !allowConflict) {
      errorMessage.value = res.message
      return
    }

    if (res.success) {
      showNotification('success', `Jadwal ${currentTeacher.value?.name} berhasil disimpan!`)
      selectedSlotForEdit.value = null
      emit('saved')
    } else {
      errorMessage.value = res.error || 'Gagal menyimpan slot jadwal'
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Terjadi kesalahan sistem'
  } finally {
    isSaving.value = false
  }
}

async function moveSlot() {
  if (!selectedSlotForEdit.value?.item || !editForm.targetSlotId) {
    errorMessage.value = 'Pilih jam tujuan terlebih dahulu'
    return
  }
  isSaving.value = true
  errorMessage.value = ''

  try {
    const currentItem = selectedSlotForEdit.value.item
    const targetSlotId = editForm.targetSlotId
    const classroomId = editForm.classroomId || currentItem.classroomId
    const subjectCode = editForm.subjectCode || currentItem.subjectCode

    // 1. Assign to new slot
    const resAssign: any = await $fetch('/api/schedule/slot', {
      method: 'POST',
      body: {
        timeSlotId: targetSlotId,
        classroomId,
        teacherId: selectedTeacherId.value,
        subjectCode,
        customLabel: editForm.customLabel || null,
        allowConflict: true
      }
    })

    if (!resAssign.success) {
      errorMessage.value = resAssign.error || 'Gagal memindahkan jadwal ke jam tujuan'
      return
    }

    // 2. Clear old slot
    await $fetch('/api/schedule/slot', {
      method: 'POST',
      body: {
        timeSlotId: currentItem.timeSlotId,
        classroomId: currentItem.classroomId,
        teacherId: null,
        subjectCode: null,
        customLabel: null,
        allowConflict: true
      }
    })

    showNotification('success', `Jadwal ${currentTeacher.value?.name} berhasil dipindahkan ke jam baru!`)
    selectedSlotForEdit.value = null
    emit('saved')
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Terjadi kesalahan saat memindahkan jadwal'
  } finally {
    isSaving.value = false
  }
}

async function clearSlot() {
  if (!selectedSlotForEdit.value?.item) return
  if (!confirm(`Kosongkan jadwal mengajar di kelas ${selectedSlotForEdit.value.classroom?.name || ''} pada jam ini?`)) return
  isSaving.value = true
  errorMessage.value = ''

  try {
    const item = selectedSlotForEdit.value.item
    const res: any = await $fetch('/api/schedule/slot', {
      method: 'POST',
      body: {
        timeSlotId: item.timeSlotId,
        classroomId: item.classroomId,
        teacherId: null,
        subjectCode: null,
        customLabel: null,
        allowConflict: true
      }
    })

    if (res.success) {
      showNotification('success', 'Jadwal jam ini berhasil dikosongkan')
      selectedSlotForEdit.value = null
      emit('saved')
    } else {
      errorMessage.value = res.error || 'Gagal mengosongkan jam'
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Terjadi kesalahan'
  } finally {
    isSaving.value = false
  }
}

function printTeacherSchedule() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Notification Banner -->
    <div
      v-if="notification"
      :class="[
        'no-print p-4 rounded-xl text-sm font-semibold flex items-center justify-between border transition',
        notification.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
      ]"
    >
      <span>{{ notification.message }}</span>
      <button @click="notification = null">✕</button>
    </div>

    <!-- Controls Bar -->
    <div class="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <!-- Teacher Selector -->
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
            Pilih Guru :
          </label>
          <select
            v-model="selectedTeacherId"
            class="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          >
            <option
              v-for="t in teachers"
              :key="t.id"
              :value="t.id"
            >
              [{{ t.id }}] {{ t.name }} {{ (!t.subjects || t.subjects.length === 0) ? '(Non-Pengajar)' : '' }}
            </option>
          </select>
        </div>

        <!-- Stats & Actions -->
        <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <div class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
            Terjadwal: {{ totalTeachingHours }} JP
          </div>

          <div
            v-if="totalTargetJp > 0"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold border',
              remainingJp > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : remainingJp === 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
            ]"
          >
            <span v-if="remainingJp > 0">Sisa {{ remainingJp }} JP Belum Masuk</span>
            <span v-else-if="remainingJp === 0">✓ Sesuai Target ({{ totalTargetJp }} JP)</span>
            <span v-else>+{{ Math.abs(remainingJp) }} JP (Kelebihan)</span>
          </div>

          <button
            type="button"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            @click="printTeacherSchedule"
          >
            <span>🖨️</span>
            <span>Cetak Jadwal</span>
          </button>
        </div>
      </div>

      <!-- Quick Subjects Remaining Badge Bar -->
      <div v-if="currentTeacher?.subjects && currentTeacher.subjects.length > 0" class="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mapel Guru Ini:</span>
        <div
          v-for="sub in currentTeacher.subjects"
          :key="sub.id"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
        >
          <span class="w-4 h-4 rounded bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
            {{ sub.code }}
          </span>
          <span class="font-semibold text-slate-800 dark:text-slate-200 text-xs">{{ sub.name }}</span>
          <span
            :class="[
              'text-[10px] px-1.5 py-0.2 rounded font-bold',
              getSubjectJpStats(sub).remaining > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            ]"
          >
            {{ getSubjectJpStats(sub).scheduled }}/{{ getSubjectJpStats(sub).target }} JP
          </span>
        </div>
      </div>
    </div>

    <!-- Teacher Printable Schedule Card -->
    <div class="printable-area bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md text-slate-900 dark:text-white space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:space-y-1.5">
      <!-- Header -->
      <div class="border-b border-slate-200 dark:border-slate-800 pb-4 print:pb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:flex-row">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 print:text-[9px]">
            Jadwal Mengajar Personal
          </span>
          <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 print:text-sm print:mt-0">
            {{ currentTeacher?.name }}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5 print:text-[9px]">
            Kode Guru: <span class="font-bold font-mono text-emerald-600">[{{ currentTeacher?.id }}]</span> • {{ schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
          </p>
        </div>

        <div class="text-right">
          <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold print:text-[9px]">
            {{ schoolSetting?.semester || 'SEMESTER GANJIL' }}
          </p>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300 print:text-[9.5px]">
            {{ schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027' }}
          </p>
        </div>
      </div>

      <!-- Quick Interactive Hint -->
      <div class="no-print p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
        <span class="flex items-center gap-1.5 font-medium">
          <span>💡</span>
          <span><strong>Pengaturan Cepat Jadwal:</strong> Klik pada jam bebas untuk menjadwalkan kelas, atau klik pada jam mengajar untuk mengubah kelas atau memindahkan jam sesuai permintaan guru.</span>
        </span>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 print:grid-cols-5 print:gap-1.5">
        <div
          v-for="d in weeklyGrid"
          :key="'wg-day-' + d.day.id"
          class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 flex flex-col shadow-xs print:rounded-lg print:border-slate-400"
        >
          <!-- Day Name -->
          <div class="bg-slate-800 text-white font-extrabold text-center py-2.5 text-xs uppercase tracking-wider print:py-0.5 print:text-[9px]">
            {{ d.day.name }}
          </div>

          <!-- Slots -->
          <div class="p-2 space-y-1.5 flex-1 print:p-0.5 print:space-y-0.5">
            <template v-for="(s, sIdx) in d.slots" :key="'slot-t-' + sIdx">
              <!-- Break Slot -->
              <div
                v-if="s.isBreak"
                class="px-2 py-1.5 bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-[10px] font-bold text-center rounded-lg"
              >
                {{ s.content }} ({{ s.slot.timeDisplay }})
              </div>

              <!-- Teaching Slot (Occupied) -->
              <div
                v-else-if="s.item"
                class="group p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500 text-emerald-950 dark:text-emerald-100 rounded-xl text-xs transition cursor-pointer shadow-xs relative"
                title="Klik untuk mengubah kelas, ganti mapel, atau memindahkan jadwal ini"
                @click="openSlotModal(d.day, s)"
              >
                <div class="flex items-center justify-between font-bold">
                  <span class="text-xs">Jam ke-{{ s.slot.period }}</span>
                  <span class="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold shadow-xs">
                    {{ s.classroom?.name }}
                  </span>
                </div>
                <div class="text-[10px] text-slate-700 dark:text-slate-200 mt-1 font-semibold flex items-center justify-between">
                  <span class="truncate max-w-[130px]" :title="s.item.customLabel || s.classroom?.name">
                    {{ s.item.customLabel || currentTeacher?.subjects?.find(sub => sub.code.toLowerCase() === s.item.subjectCode?.toLowerCase())?.name || 'Pelajaran' }}
                  </span>
                  <span class="font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                    {{ s.item.teacherId }}{{ s.item.subjectCode || '' }}
                  </span>
                </div>
                <div class="text-[9px] text-slate-400 mt-0.5 flex justify-between items-center">
                  <span>{{ s.slot.timeDisplay }}</span>
                  <span class="text-emerald-600 dark:text-emerald-400 group-hover:inline-block hidden font-bold">✏️ Ubah / Pindah</span>
                </div>
              </div>

              <!-- Free Slot -->
              <div
                v-else-if="s.slot.period"
                class="group px-2 py-2 text-[10px] text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 border border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[44px]"
                title="Klik untuk menjadwalkan guru ini di jam ini"
                @click="openSlotModal(d.day, s)"
              >
                <span class="font-semibold block">Jam {{ s.slot.period }} • Bebas</span>
                <span class="text-[9px] text-emerald-600 dark:text-emerald-400 hidden group-hover:inline-block font-bold mt-0.5">
                  + Jadwalkan di Jam Ini
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL EDIT / TUGASKAN / PINDAH JADWAL GURU -->
    <div
      v-if="selectedSlotForEdit"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs">
                {{ currentTeacher?.id }}
              </span>
              <span>{{ selectedSlotForEdit.item ? 'Ubah / Pindah Jadwal Mengajar' : 'Tugaskan Jam Mengajar' }}</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5 font-semibold">
              {{ currentTeacher?.name }} • {{ selectedSlotForEdit.day.name }}, Jam ke-{{ selectedSlotForEdit.slot.period }} ({{ selectedSlotForEdit.slot.timeDisplay }})
            </p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            @click="selectedSlotForEdit = null"
          >
            ✕
          </button>
        </div>

        <!-- Mode Switcher (If slot already occupied, can toggle between Edit or Move) -->
        <div v-if="selectedSlotForEdit.item" class="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-1.5 gap-1.5">
          <button
            type="button"
            :class="[
              'flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center',
              editMode === 'edit'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            ]"
            @click="editMode = 'edit'"
          >
            📝 Ubah Kelas / Mapel
          </button>
          <button
            type="button"
            :class="[
              'flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center',
              editMode === 'move'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            ]"
            @click="editMode = 'move'"
          >
            🔀 Pindahkan ke Jam Lain
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto space-y-4">
          <!-- Error & Conflict Alert -->
          <div
            v-if="errorMessage"
            class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
          >
            <span class="text-base font-bold shrink-0">⚠️</span>
            <div class="flex-1">
              <p class="font-bold">Pemberitahuan</p>
              <p class="mt-0.5 leading-relaxed">{{ errorMessage }}</p>
              <div v-if="errorMessage.includes('TABRAKAN')" class="mt-2 flex gap-2">
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition"
                  @click="saveSlot(true)"
                >
                  Tetap Simpan (Paksa Bentrok)
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 1: ASSIGN / EDIT -->
          <div v-if="editMode === 'assign' || editMode === 'edit'" class="space-y-4">
            <!-- Classroom Selector with availability badges -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Kelas Sasaran *
              </label>
              <select
                v-model="editForm.classroomId"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option
                  v-for="st in getClassroomsStatusForSlot(selectedSlotForEdit.slot.id)"
                  :key="st.classroom.id"
                  :value="st.classroom.id"
                >
                  {{ st.classroom.name }} — {{ st.isCurrentTeacher ? '(Sedang mengajar di sini)' : st.isOccupied ? `(Diisi guru [${st.teacher?.id}] ${st.teacher?.name})` : '(Tersedia / Kosong)' }}
                </option>
              </select>
            </div>

            <!-- Subject Selection -->
            <div v-if="currentTeacher?.subjects && currentTeacher.subjects.length > 0" class="space-y-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pilih Mata Pelajaran Guru *
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  v-for="sub in currentTeacher.subjects"
                  :key="sub.id"
                  type="button"
                  :class="[
                    'p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2',
                    editForm.subjectCode.toLowerCase() === sub.code.toLowerCase()
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-300'
                  ]"
                  @click="editForm.subjectCode = sub.code"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span class="w-6 h-6 rounded-md bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {{ sub.code }}
                    </span>
                    <span class="text-xs truncate font-medium">{{ sub.name }}</span>
                  </div>
                  <span
                    :class="[
                      'text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0',
                      getSubjectJpStats(sub).remaining > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    ]"
                  >
                    Sisa {{ getSubjectJpStats(sub).remaining }} JP
                  </span>
                </button>
              </div>
            </div>

            <!-- Notice for Non-Teaching teacher -->
            <div
              v-else
              class="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-900 dark:text-blue-300"
            >
              <p class="font-bold">Guru Non-Pengajar (Kepala Sekolah / TU)</p>
              <p class="text-[11px] mt-0.5">
                Guru ini tidak memiliki mata pelajaran mengajar. Jika menjadwalkan penugasan khusus, silakan isi kolom Teks Kustom di bawah (misal: PEMBINA APEL).
              </p>
            </div>

            <!-- Custom Label (Optional) -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Teks Kustom (Opsional / Non-Pelajaran)
              </label>
              <input
                v-model="editForm.customLabel"
                type="text"
                placeholder="Contoh: PEMBINA APEL, WORKSHOP..."
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <!-- Preview of cell -->
            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <span class="text-xs text-slate-500">Tampilan Sel di Matriks:</span>
              <span class="font-mono font-bold text-base px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                {{ selectedTeacherId }}{{ editForm.subjectCode || '' }}
              </span>
            </div>
          </div>

          <!-- TAB 2: MOVE TO ANOTHER SLOT -->
          <div v-else-if="editMode === 'move'" class="space-y-4">
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
              <p class="font-bold flex items-center gap-1.5">
                <span>🔀</span>
                <span>Pindahkan Jam Mengajar Ini</span>
              </p>
              <p class="text-[11px] mt-1 leading-relaxed">
                Jadwal mengajar di kelas <strong>{{ selectedSlotForEdit.classroom?.name }}</strong> pada hari <strong>{{ selectedSlotForEdit.day.name }} jam ke-{{ selectedSlotForEdit.slot.period }}</strong> akan dikosongkan dan dialihkan ke jam bebas yang Anda pilih di bawah.
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Jam Tujuan (Jam Bebas Guru Ini) *
              </label>
              <select
                v-model="editForm.targetSlotId"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option :value="null">-- Pilih Jam Bebas Tujuan --</option>
                <option
                  v-for="fs in freeSlotsForTeacher"
                  :key="fs.slot.id"
                  :value="fs.slot.id"
                >
                  {{ fs.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <button
              v-if="selectedSlotForEdit.item && editMode !== 'move'"
              type="button"
              class="px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              @click="clearSlot"
            >
              🗑️ Kosongkan Jam Ini
            </button>
          </div>

          <div class="flex items-center gap-2.5">
            <button
              type="button"
              class="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              @click="selectedSlotForEdit = null"
            >
              Batal
            </button>

            <!-- Save for Edit/Assign -->
            <button
              v-if="editMode !== 'move'"
              type="button"
              :disabled="isSaving || !canSave"
              class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-1.5"
              @click="saveSlot(false)"
            >
              <span v-if="isSaving" class="animate-spin">⏳</span>
              <span>Simpan Jadwal</span>
            </button>

            <!-- Confirm for Move -->
            <button
              v-else
              type="button"
              :disabled="isSaving || !editForm.targetSlotId"
              class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-1.5"
              @click="moveSlot"
            >
              <span v-if="isSaving" class="animate-spin">⏳</span>
              <span>🔀 Pindahkan Jadwal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
