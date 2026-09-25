<script setup lang="ts">
// Fetch full schedule state
const { data, refresh, pending } = await useFetch('/api/schedule/full')

const currentTab = ref<'master' | 'teacher' | 'classroom' | 'settings'>('master')

// Modals
const showEditModal = ref(false)
const selectedSlotForEdit = ref<any>(null)
const showConflictModal = ref(false)
const isGenerating = ref(false)
const isResetting = ref(false)
const actionNotification = ref<{ type: 'success' | 'error'; message: string } | null>(null)

function showToast(type: 'success' | 'error', message: string) {
  actionNotification.value = { type, message }
  setTimeout(() => {
    actionNotification.value = null
  }, 4500)
}

// Compute busy teachers in current slot being edited
const busyTeachersInCurrentSlot = computed(() => {
  if (!selectedSlotForEdit.value || !data.value?.data?.scheduleItems) return []
  const slotId = selectedSlotForEdit.value.timeSlotId
  return data.value.data.scheduleItems
    .filter((i: any) => i.timeSlotId === slotId && i.teacherId)
    .map((i: any) => i.teacherId)
})

// Theme Mode (Light / Dark)
const colorMode = useColorMode()
const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(val: boolean) {
    colorMode.preference = val ? 'dark' : 'light'
    if (typeof document !== 'undefined') {
      if (val) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }
})

function toggleColorMode() {
  isDark.value = !isDark.value
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    if (colorMode.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
})

watch(() => colorMode.value, (newVal) => {
  if (typeof document !== 'undefined') {
    if (newVal === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
})

function handleCellClick(payload: any) {
  selectedSlotForEdit.value = payload
  showEditModal.value = true
}

function handleResolveSlot(payload: { timeSlotId: number; classroomId: number }) {
  showConflictModal.value = false
  const cls = data.value?.data?.classrooms.find((c: any) => c.id === payload.classroomId)
  const slot = data.value?.data?.days
    .flatMap((d: any) => d.timeSlots)
    .find((s: any) => s.id === payload.timeSlotId)
  const item = data.value?.data?.scheduleItems.find(
    (i: any) => i.timeSlotId === payload.timeSlotId && i.classroomId === payload.classroomId
  )

  if (slot && cls) {
    selectedSlotForEdit.value = {
      timeSlotId: slot.id,
      classroomId: cls.id,
      dayName: slot.day?.name || '',
      period: slot.period,
      timeDisplay: slot.timeDisplay,
      classroomName: cls.name,
      currentTeacherId: item?.teacherId || null,
      currentSubjectCode: item?.subjectCode || null,
      customLabel: item?.customLabel || null
    }
    showEditModal.value = true
  }
}

async function onSlotSaved() {
  await refresh()
  showToast('success', 'Perubahan slot jadwal berhasil disimpan!')
}

async function triggerAutoGenerate(overwriteAll = false) {
  if (overwriteAll && !confirm('Apakah Anda yakin ingin men-generate ulang seluruh jadwal? Jadwal saat ini akan ditimpa dengan susunan acak bebas tabrakan.')) {
    return
  }

  isGenerating.value = true
  try {
    const res: any = await $fetch('/api/schedule/generate', {
      method: 'POST',
      body: { overwriteAll }
    })
    if (res.success) {
      await refresh()
      showToast('success', res.message || 'Auto-generate berhasil tanpa bentrok!')
    } else {
      showToast('error', res.error || 'Gagal generate jadwal')
    }
  } catch (err: any) {
    showToast('error', err.message || 'Terjadi kesalahan sistem')
  } finally {
    isGenerating.value = false
  }
}

async function triggerResetTemplate() {
  if (!confirm('Yakin ingin mereset seluruh data jadwal kembali persis seperti pada foto template SMKS Islam Donomulyo?')) {
    return
  }

  isResetting.value = true
  try {
    const res: any = await $fetch('/api/schedule/reset', { method: 'POST' })
    if (res.success) {
      await refresh()
      showToast('success', 'Jadwal berhasil dipulihkan sesuai template foto asli!')
    } else {
      showToast('error', res.error || 'Gagal reset jadwal')
    }
  } catch (err: any) {
    showToast('error', err.message || 'Terjadi kesalahan')
  } finally {
    isResetting.value = false
  }
}

function printTimetable() {
  window.print()
}

function exportExcel() {
  window.open('/api/export/excel', '_blank')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100/70 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 space-y-6 print:p-0 print:m-0 print:space-y-0 print:min-h-0 print:bg-white">
    <!-- Notification Banner -->
    <div
      v-if="actionNotification"
      :class="[
        'no-print fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl shadow-xl text-xs font-bold border flex items-center justify-between gap-3 animate-bounce',
        actionNotification.type === 'success'
          ? 'bg-emerald-600 text-white border-emerald-500'
          : 'bg-red-600 text-white border-red-500'
      ]"
    >
      <span>{{ actionNotification.message }}</span>
      <button class="p-1 hover:opacity-75" @click="actionNotification = null">✕</button>
    </div>

    <!-- Top Action Bar & Header Controls -->
    <header class="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <!-- Brand & School Info -->
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
            SMK
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                {{ data?.data?.schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO' }}
              </h1>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px]">
                {{ data?.data?.schoolSetting?.semester || 'GANJIL' }} {{ data?.data?.schoolSetting?.academicYear || '2026-2027' }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sistem Otomasi & Editor Penjadwalan Pelajaran Anti-Bentrok
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Conflict Alert Button -->
          <button
            type="button"
            :class="[
              'px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs border',
              data?.data?.conflicts?.length > 0
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-400 animate-pulse'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            ]"
            @click="showConflictModal = true"
          >
            <span v-if="data?.data?.conflicts?.length > 0">⚠️</span>
            <span v-else>✅</span>
            <span>
              {{ data?.data?.conflicts?.length > 0 ? `${data?.data?.conflicts?.length} Tabrakan Jadwal` : '0 Bentrok (Aman)' }}
            </span>
          </button>

          <!-- Auto-Generate Button -->
          <button
            type="button"
            :disabled="isGenerating"
            class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
            @click="triggerAutoGenerate(true)"
          >
            <span v-if="isGenerating" class="animate-spin">⏳</span>
            <span v-else>⚡</span>
            <span>Auto-Generate</span>
          </button>

          <!-- Export Excel -->
          <button
            type="button"
            class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            @click="exportExcel"
          >
            <span>📥</span>
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <!-- Print PDF -->
          <button
            type="button"
            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            @click="printTimetable"
          >
            <span>🖨️</span>
            <span>Cetak / PDF</span>
          </button>

          <!-- Reset Template -->
          <button
            type="button"
            :disabled="isResetting"
            class="px-3 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Reset ke Template Asli dari Gambar"
            @click="triggerResetTemplate"
          >
            <span>🔄</span>
            <span class="hidden sm:inline ml-1">Reset Template</span>
          </button>

          <!-- Light / Dark Mode Toggle Button -->
          <button
            type="button"
            @click="toggleColorMode"
            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            :title="isDark ? 'Beralih ke Tampilan Terang (Light Mode)' : 'Beralih ke Tampilan Gelap (Dark Mode)'"
          >
            <span v-if="isDark" class="text-amber-500 text-sm">☀️</span>
            <span v-else class="text-indigo-600 dark:text-indigo-400 text-sm">🌙</span>
            <span>{{ isDark ? 'Mode Terang' : 'Mode Gelap' }}</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 overflow-x-auto">
        <button
          v-for="tab in [
            { key: 'master', label: 'Matriks Master (Seperti di Foto)', icon: '📊' },
            { key: 'teacher', label: 'Jadwal per Guru', icon: '👨‍🏫' },
            { key: 'classroom', label: 'Jadwal per Kelas', icon: '🏫' },
            { key: 'settings', label: 'Pengaturan & Master Data', icon: '⚙️' }
          ]"
          :key="tab.key"
          :class="[
            'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap',
            currentTab === tab.key
              ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="currentTab = (tab.key as any)"
        >
          <span>{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main>
      <div v-if="pending && !data?.data" class="text-center py-20">
        <span class="text-4xl animate-spin inline-block">⏳</span>
        <p class="text-sm font-bold text-slate-500 mt-3">Memuat Jadwal...</p>
      </div>

      <template v-if="data?.data">
        <!-- 1. Master Timetable View -->
        <MasterTimetable
          v-if="currentTab === 'master'"
          :school-setting="data.data.schoolSetting"
          :days="data.data.days"
          :classrooms="data.data.classrooms"
          :teachers="data.data.teachers"
          :extracurriculars="data.data.extracurriculars"
          :schedule-items="data.data.scheduleItems"
          :conflicts="data.data.conflicts"
          @cell-click="handleCellClick"
        />

        <!-- 2. Teacher Personal View -->
        <TeacherView
          v-else-if="currentTab === 'teacher'"
          :teachers="data.data.teachers"
          :days="data.data.days"
          :classrooms="data.data.classrooms"
          :schedule-items="data.data.scheduleItems"
          :school-setting="data.data.schoolSetting"
          @saved="refresh"
        />

        <!-- 3. Classroom View -->
        <ClassroomView
          v-else-if="currentTab === 'classroom'"
          :classrooms="data.data.classrooms"
          :days="data.data.days"
          :teachers="data.data.teachers"
          :schedule-items="data.data.scheduleItems"
          :school-setting="data.data.schoolSetting"
        />

        <!-- 4. Settings View -->
        <SettingsView
          v-else-if="currentTab === 'settings'"
          :school-setting="data.data.schoolSetting"
          :teachers="data.data.teachers"
          :classrooms="data.data.classrooms"
          :days="data.data.days"
          :extracurriculars="data.data.extracurriculars"
          :schedule-items="data.data.scheduleItems"
          @refreshed="refresh"
        />
      </template>
    </main>

    <!-- Slot Edit Modal -->
    <SlotEditModal
      v-model="showEditModal"
      :slot-info="selectedSlotForEdit"
      :teachers="data?.data?.teachers || []"
      :busy-teacher-ids="busyTeachersInCurrentSlot"
      :schedule-items="data?.data?.scheduleItems || []"
      @saved="onSlotSaved"
    />

    <!-- Conflict Inspector Modal -->
    <ConflictModal
      v-model="showConflictModal"
      :conflicts="data?.data?.conflicts || []"
      @resolve-slot="handleResolveSlot"
    />
  </div>
</template>
