<script setup lang="ts">
const props = defineProps<{
  schoolSetting: any
  teachers: any[]
  classrooms: any[]
  days: any[]
  extracurriculars: any[]
  scheduleItems?: any[]
}>()

const emit = defineEmits<{
  (e: 'refreshed'): void
}>()

const activeTab = useState<'school' | 'teachers' | 'classrooms' | 'timeslots' | 'piket'>('settings_active_tab', () => 'school')

onMounted(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('settings_active_tab')
    if (saved && ['school', 'teachers', 'classrooms', 'timeslots', 'piket'].includes(saved)) {
      activeTab.value = saved as any
    }
  }
})

watch(activeTab, (newTab) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('settings_active_tab', newTab)
  }
})

const isSaving = ref(false)
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 4000)
}

// 1. School Settings Form
const formSchool = reactive({
  schoolName: props.schoolSetting?.schoolName || 'SMKS ISLAM DONOMULYO',
  semester: props.schoolSetting?.semester || 'SEMESTER GANJIL',
  academicYear: props.schoolSetting?.academicYear || 'TAHUN AJARAN 2026-2027',
  headmasterName: props.schoolSetting?.headmasterName || "IMAM SAFI'I, S.Pd., M.Si",
  curriculumHeadName: props.schoolSetting?.curriculumHeadName || 'WAHYU DIAN PERMANA, S.Pd',
  dateLocation: props.schoolSetting?.dateLocation || 'Donomulyo, 13 Juni 2026'
})

async function saveSchoolSettings() {
  isSaving.value = true
  try {
    const res: any = await $fetch('/api/settings', {
      method: 'PUT',
      body: formSchool
    })
    if (res.success) {
      showNotification('success', 'Pengaturan profil sekolah berhasil disimpan!')
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal menyimpan pengaturan')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

// 2. Teachers Form & List
const newTeacher = reactive({
  id: '',
  name: '',
  subjectName: '',
  subjectJp: 4,
  maxHoursPerWeek: 30
})

async function addTeacher() {
  if (!newTeacher.name.trim()) return
  isSaving.value = true
  try {
    const res: any = await $fetch('/api/teachers', {
      method: 'POST',
      body: {
        id: newTeacher.id ? Number(newTeacher.id) : null,
        name: newTeacher.name.trim(),
        initialSubjectName: newTeacher.subjectName.trim() || 'Mata Pelajaran Utama / Kejuruan',
        initialSubjectJp: Number(newTeacher.subjectJp) || 4,
        maxHoursPerWeek: Number(newTeacher.maxHoursPerWeek)
      }
    })
    if (res.success) {
      showNotification('success', `Guru ${newTeacher.name} berhasil ditambahkan beserta mata pelajarannya!`)
      newTeacher.id = ''
      newTeacher.name = ''
      newTeacher.subjectName = ''
      newTeacher.subjectJp = 4
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal menambah guru')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

// Teacher Edit State & Actions (Name and Teacher Code / ID)
const editingTeacher = ref<any>(null)
const editTeacherForm = reactive({
  id: 0,
  newId: '',
  name: '',
  maxHoursPerWeek: 30
})

function openEditTeacher(t: any) {
  editingTeacher.value = t
  editTeacherForm.id = t.id
  editTeacherForm.newId = String(t.id)
  editTeacherForm.name = t.name
  editTeacherForm.maxHoursPerWeek = t.maxHoursPerWeek || 30
}

async function saveEditTeacher() {
  if (!editingTeacher.value) return
  if (!editTeacherForm.name.trim()) {
    showNotification('error', 'Nama guru tidak boleh kosong')
    return
  }
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/teachers/${editTeacherForm.id}`, {
      method: 'PUT',
      body: {
        newId: editTeacherForm.newId ? Number(editTeacherForm.newId) : undefined,
        name: editTeacherForm.name.trim(),
        maxHoursPerWeek: Number(editTeacherForm.maxHoursPerWeek)
      }
    })
    if (res.success) {
      showNotification('success', res.message || 'Data & kode guru berhasil diperbarui!')
      editingTeacher.value = null
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal memperbarui data guru')
    }
  } catch (err: any) {
    showNotification('error', err.data?.message || err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

async function deleteTeacher(id: number) {
  if (!confirm(`Yakin ingin menghapus guru dengan Kode ${id}? Seluruh jadwal yang menggunakan guru ini akan dikosongkan.`)) return
  try {
    const res: any = await $fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    if (res.success) {
      showNotification('success', 'Guru berhasil dihapus')
      emit('refreshed')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Gagal menghapus')
  }
}

// Teacher Subject & JP Allocation Management
const activeSubjectTeacherId = ref<number | null>(null)
const currentManagingTeacher = computed(() => {
  if (!activeSubjectTeacherId.value) return null
  return props.teachers.find((t) => t.id === activeSubjectTeacherId.value) || null
})

function openManageSubjects(teacher: any) {
  activeSubjectTeacherId.value = teacher.id
  newSubjectForm.code = ''
  newSubjectForm.name = ''
  newSubjectForm.targetJp = 4
  newSubjectForm.classroomId = ''
  editingSubject.value = null
}

const newSubjectForm = reactive({
  code: '',
  name: '',
  targetJp: 4,
  classroomId: ''
})

async function addSubject() {
  if (!currentManagingTeacher.value) return
  if (!newSubjectForm.code.trim() || !newSubjectForm.name.trim()) {
    showNotification('error', 'Kode sub-mapel dan nama mata pelajaran harus diisi!')
    return
  }
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/teachers/${currentManagingTeacher.value.id}/subjects`, {
      method: 'POST',
      body: {
        code: newSubjectForm.code.trim().toLowerCase(),
        name: newSubjectForm.name.trim(),
        targetJp: Number(newSubjectForm.targetJp) || 4,
        classroomId: newSubjectForm.classroomId ? Number(newSubjectForm.classroomId) : null
      }
    })
    if (res.success) {
      showNotification('success', `Mata pelajaran '${res.data.name}' berhasil ditambahkan!`)
      newSubjectForm.code = ''
      newSubjectForm.name = ''
      newSubjectForm.targetJp = 4
      newSubjectForm.classroomId = ''
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal menambah mata pelajaran')
    }
  } catch (err: any) {
    showNotification('error', err.data?.message || err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

const editingSubject = ref<any>(null)
const editSubjectForm = reactive({
  code: '',
  name: '',
  targetJp: 4,
  classroomId: ''
})

function openEditSubject(sub: any) {
  editingSubject.value = sub
  editSubjectForm.code = sub.code
  editSubjectForm.name = sub.name
  editSubjectForm.targetJp = sub.targetJp || 4
  editSubjectForm.classroomId = sub.classroomId ? String(sub.classroomId) : ''
}

async function saveEditSubject() {
  if (!editingSubject.value) return
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/subjects/${editingSubject.value.id}`, {
      method: 'PUT',
      body: {
        code: editSubjectForm.code.trim().toLowerCase(),
        name: editSubjectForm.name.trim(),
        targetJp: Number(editSubjectForm.targetJp) || 4,
        classroomId: editSubjectForm.classroomId ? Number(editSubjectForm.classroomId) : null
      }
    })
    if (res.success) {
      showNotification('success', 'Mata pelajaran berhasil diperbarui!')
      editingSubject.value = null
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal memperbarui mata pelajaran')
    }
  } catch (err: any) {
    showNotification('error', err.data?.message || err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

async function deleteSubject(subjectId: number, code: string) {
  if (!confirm(`Hapus mata pelajaran dengan kode '${code}'?`)) return
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/subjects/${subjectId}`, { method: 'DELETE' })
    if (res.success) {
      showNotification('success', 'Mata pelajaran berhasil dihapus')
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal menghapus')
    }
  } catch (err: any) {
    showNotification('error', err.data?.message || err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

// Helpers for JP calculations
function getSubjectScheduledJp(teacherId: number, subjectCode: string, classroomId?: number | null) {
  if (!props.scheduleItems) return 0
  return props.scheduleItems.filter((i: any) => {
    const matchTeacher = i.teacherId === teacherId
    const matchSubject = i.subjectCode?.toLowerCase() === subjectCode.toLowerCase()
    if (classroomId) {
      return matchTeacher && matchSubject && i.classroomId === classroomId
    }
    return matchTeacher && matchSubject
  }).length
}

function getTeacherTotalScheduledJp(teacherId: number) {
  if (!props.scheduleItems) return 0
  return props.scheduleItems.filter((i: any) => i.teacherId === teacherId).length
}

function getTeacherTotalTargetJp(teacher: any) {
  if (!teacher?.subjects) return 0
  return teacher.subjects.reduce((acc: number, s: any) => acc + (s.targetJp || 0), 0)
}

// 3. Classrooms Form
const newClassroom = reactive({
  grade: 'X',
  major: '',
  name: ''
})

async function addClassroom() {
  if (!newClassroom.major.trim()) return
  isSaving.value = true
  try {
    const res: any = await $fetch('/api/classrooms', {
      method: 'POST',
      body: {
        grade: newClassroom.grade,
        major: newClassroom.major.trim(),
        name: newClassroom.name.trim() || `${newClassroom.grade} ${newClassroom.major.trim().toUpperCase()}`
      }
    })
    if (res.success) {
      showNotification('success', 'Kelas berhasil ditambahkan!')
      newClassroom.major = ''
      newClassroom.name = ''
      emit('refreshed')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Gagal menambah kelas')
  } finally {
    isSaving.value = false
  }
}

async function deleteClassroom(id: number) {
  if (!confirm('Yakin ingin menghapus kelas ini?')) return
  try {
    const res: any = await $fetch(`/api/classrooms/${id}`, { method: 'DELETE' })
    if (res.success) {
      showNotification('success', 'Kelas berhasil dihapus')
      emit('refreshed')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Gagal menghapus kelas')
  }
}

// 4. Piket Form
const piketForm = ref(
  props.days.map((d) => ({
    dayId: d.id,
    dayName: d.name,
    teacher1Id: d.piket?.teacher1Id || null,
    teacher2Id: d.piket?.teacher2Id || null
  }))
)

async function savePiket() {
  isSaving.value = true
  try {
    for (const p of piketForm.value) {
      await $fetch('/api/piket', {
        method: 'PUT',
        body: p
      })
    }
    showNotification('success', 'Jadwal guru piket berhasil disimpan!')
    emit('refreshed')
  } catch (err: any) {
    showNotification('error', err.message || 'Gagal menyimpan guru piket')
  } finally {
    isSaving.value = false
  }
}

// Day management
const newDayName = ref('')

async function addDay() {
  if (!newDayName.value.trim()) return
  isSaving.value = true
  try {
    const res: any = await $fetch('/api/days', {
      method: 'POST',
      body: { name: newDayName.value.trim() }
    })
    if (res.success) {
      showNotification('success', `Hari ${newDayName.value.toUpperCase()} berhasil ditambahkan!`)
      newDayName.value = ''
      emit('refreshed')
      selectedDayId.value = res.data.id
    } else {
      showNotification('error', res.error || 'Gagal menambah hari')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

async function deleteDay(id: number, name: string) {
  if (!confirm(`Yakin ingin menghapus hari ${name}? Seluruh jam pelajaran dan jadwal di hari ini akan ikut terhapus!`)) {
    return
  }
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/days/${id}`, { method: 'DELETE' })
    if (res.success) {
      showNotification('success', `Hari ${name} berhasil dihapus`)
      emit('refreshed')
      const remaining = props.days.filter((d) => d.id !== id)
      if (remaining.length > 0) {
        selectedDayId.value = remaining[0].id
      }
    } else {
      showNotification('error', res.error || 'Gagal menghapus hari')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

// 5. TimeSlot form for selected day
const selectedDayId = useState<number>('settings_selected_day_id', () => props.days[0]?.id || 1)
const selectedDay = computed(() => props.days.find((d) => d.id === selectedDayId.value))

const newSlot = reactive({
  period: '',
  timeStart: '07.00',
  timeEnd: '07.45',
  slotType: 'LESSON',
  label: ''
})

async function addTimeSlot() {
  if (!newSlot.timeStart || !newSlot.timeEnd) return
  isSaving.value = true
  try {
    const res: any = await $fetch('/api/timeslots', {
      method: 'POST',
      body: {
        dayId: selectedDayId.value,
        period: newSlot.period ? Number(newSlot.period) : null,
        timeStart: newSlot.timeStart,
        timeEnd: newSlot.timeEnd,
        slotType: newSlot.slotType,
        label: newSlot.label || null
      }
    })
    if (res.success) {
      showNotification('success', 'Jam/Istirahat berhasil ditambahkan!')
      emit('refreshed')
      newSlot.period = ''
      newSlot.label = ''
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Gagal menambah slot waktu')
  } finally {
    isSaving.value = false
  }
}

async function deleteTimeSlot(id: number) {
  if (!confirm('Yakin ingin menghapus jam waktu ini?')) return
  try {
    const res: any = await $fetch(`/api/timeslots/${id}`, { method: 'DELETE' })
    if (res.success) {
      showNotification('success', 'Jam waktu berhasil dihapus')
      emit('refreshed')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Gagal menghapus jam waktu')
  }
}

// TimeSlot Edit Modal State
const editingSlot = ref<any>(null)
const editSlotForm = reactive({
  period: '',
  timeStart: '',
  timeEnd: '',
  slotType: 'LESSON',
  label: ''
})

function openEditSlot(slot: any) {
  editingSlot.value = slot
  editSlotForm.period = slot.period !== null ? String(slot.period) : ''
  editSlotForm.timeStart = slot.timeStart || ''
  editSlotForm.timeEnd = slot.timeEnd || ''
  editSlotForm.slotType = slot.slotType || 'LESSON'
  editSlotForm.label = slot.label || ''
}

async function saveEditSlot() {
  if (!editingSlot.value) return
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/timeslots/${editingSlot.value.id}`, {
      method: 'PUT',
      body: {
        period: editSlotForm.period ? Number(editSlotForm.period) : null,
        timeStart: editSlotForm.timeStart,
        timeEnd: editSlotForm.timeEnd,
        slotType: editSlotForm.slotType,
        label: editSlotForm.label || null
      }
    })
    if (res.success) {
      showNotification('success', 'Jam waktu berhasil diperbarui!')
      editingSlot.value = null
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal memperbarui jam waktu')
    }
  } catch (err: any) {
    showNotification('error', err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Notification Banner -->
    <div
      v-if="notification"
      :class="[
        'p-4 rounded-xl text-sm font-semibold flex items-center justify-between border transition',
        notification.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
      ]"
    >
      <span>{{ notification.message }}</span>
      <button @click="notification = null">✕</button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      <button
        v-for="tab in [
          { key: 'school', label: 'Profil Sekolah & TTD', icon: '🏫' },
          { key: 'teachers', label: 'Daftar & Kode Guru', icon: '👨‍🏫' },
          { key: 'classrooms', label: 'Kelas & Jurusan', icon: '👥' },
          { key: 'timeslots', label: 'Hari, Jam & Istirahat', icon: '⏰' },
          { key: 'piket', label: 'Guru Piket Harian', icon: '📋' }
        ]"
        :key="tab.key"
        :class="[
          'px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap',
          activeTab === tab.key
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
        @click="activeTab = (tab.key as any)"
      >
        <span>{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- TAB 1: SCHOOL PROFILE -->
    <div v-if="activeTab === 'school'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 class="font-extrabold text-lg text-slate-900 dark:text-white mb-1">
        Pengaturan Kop Sekolah & Tanda Tangan
      </h3>
      <p class="text-xs text-slate-500 mb-6">
        Informasi ini ditampilkan pada bagian atas dokumen jadwal dan lembar tanda tangan resmi.
      </p>

      <form @submit.prevent="saveSchoolSettings" class="space-y-4 max-w-2xl">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Nama Sekolah
          </label>
          <input
            v-model="formSchool.schoolName"
            type="text"
            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Semester
            </label>
            <input
              v-model="formSchool.semester"
              type="text"
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tahun Ajaran
            </label>
            <input
              v-model="formSchool.academicYear"
              type="text"
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Nama Kepala Sekolah & Gelar
            </label>
            <input
              v-model="formSchool.headmasterName"
              type="text"
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Nama Wakakur & Gelar
            </label>
            <input
              v-model="formSchool.curriculumHeadName"
              type="text"
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Titimangsa (Tempat & Tanggal)
          </label>
          <input
            v-model="formSchool.dateLocation"
            type="text"
            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="isSaving"
            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
          >
            Simpan Pengaturan Profil
          </button>
        </div>
      </form>
    </div>

    <!-- TAB 2: TEACHERS MANAGEMENT -->
    <div v-if="activeTab === 'teachers'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
            Kelola Guru & Kode Guru
          </h3>
          <p class="text-xs text-slate-500">
            Total: {{ teachers.length }} Guru terdaftar di sistem.
          </p>
        </div>
      </div>

      <!-- Add Teacher Form -->
      <form @submit.prevent="addTeacher" class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Kode Guru (Angka)
          </label>
          <input
            v-model="newTeacher.id"
            type="number"
            placeholder="Otomatis"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
          />
        </div>

        <div class="sm:col-span-4">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Nama Lengkap & Gelar *
          </label>
          <input
            v-model="newTeacher.name"
            type="text"
            required
            placeholder="Contoh: Budi Santoso, S.Pd"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
          />
        </div>

        <div class="sm:col-span-3">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Mata Pelajaran Utama (Opsional)
          </label>
          <input
            v-model="newTeacher.subjectName"
            type="text"
            placeholder="Kosongkan jika Kepsek / TU / Non-Pengajar"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
          />
        </div>

        <div class="sm:col-span-1">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            JP
          </label>
          <input
            v-model="newTeacher.subjectJp"
            type="number"
            min="1"
            max="40"
            class="w-full px-2 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
          />
        </div>

        <div class="sm:col-span-2">
          <button
            type="submit"
            :disabled="isSaving"
            class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
          >
            + Tambah Guru
          </button>
        </div>
      </form>

      <!-- Teachers Table -->
      <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th class="px-3 py-2.5 w-16 text-center">Kode</th>
              <th class="px-4 py-2.5 w-52">Nama Guru & Gelar</th>
              <th class="px-4 py-2.5">Mata Pelajaran & Alokasi JP</th>
              <th class="px-4 py-2.5 w-44 text-center">Beban Mengajar</th>
              <th class="px-3 py-2.5 w-48 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr
              v-for="t in teachers"
              :key="t.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <td class="px-3 py-2.5 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs border border-emerald-200 dark:border-emerald-800">
                  {{ t.id }}
                </span>
              </td>
              <td class="px-4 py-2.5">
                <div class="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {{ t.name }}
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  Batas Max: {{ t.maxHoursPerWeek || 30 }} JP/minggu
                </div>
              </td>
              <td class="px-4 py-2.5">
                <div class="flex flex-wrap items-center gap-1.5">
                  <div
                    v-for="sub in t.subjects"
                    :key="sub.id"
                    class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]"
                  >
                    <span class="w-4 h-4 rounded bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                      {{ sub.code }}
                    </span>
                    <span class="font-medium text-slate-800 dark:text-slate-200 max-w-[120px] truncate" :title="sub.name">
                      {{ sub.name }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-semibold">
                      ({{ sub.targetJp }} JP)
                    </span>
                  </div>

                  <span
                    v-if="!t.subjects || t.subjects.length === 0"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px] border border-slate-200 dark:border-slate-700"
                  >
                    <span>📋</span>
                    <span>Non-Pengajar / Tanpa Mapel</span>
                  </span>

                  <button
                    type="button"
                    class="px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-md border border-dashed border-emerald-300 dark:border-emerald-700 transition ml-1"
                    @click="openManageSubjects(t)"
                  >
                    + Mapel
                  </button>
                </div>
              </td>
              <td class="px-4 py-2.5 text-center">
                <div class="inline-flex flex-col items-center">
                  <span class="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {{ getTeacherTotalScheduledJp(t.id) }} / {{ getTeacherTotalTargetJp(t) }} JP
                  </span>
                  <div class="mt-1">
                    <span
                      v-if="!t.subjects || t.subjects.length === 0"
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    >
                      Non-Pengajar
                    </span>
                    <span
                      v-else-if="getTeacherTotalTargetJp(t) > getTeacherTotalScheduledJp(t.id)"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    >
                      Sisa {{ getTeacherTotalTargetJp(t) - getTeacherTotalScheduledJp(t.id) }} JP
                    </span>
                    <span
                      v-else-if="getTeacherTotalTargetJp(t) > 0 && getTeacherTotalTargetJp(t) === getTeacherTotalScheduledJp(t.id)"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    >
                      ✓ Pas (Lengkap)
                    </span>
                    <span
                      v-else-if="getTeacherTotalScheduledJp(t.id) > getTeacherTotalTargetJp(t) && getTeacherTotalTargetJp(t) > 0"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                    >
                      +{{ getTeacherTotalScheduledJp(t.id) - getTeacherTotalTargetJp(t) }} JP
                    </span>
                    <span
                      v-else
                      class="text-[10px] text-slate-400"
                    >
                      {{ getTeacherTotalScheduledJp(t.id) }} jam terisi
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2.5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded-lg text-xs font-semibold transition"
                    title="Edit Nama dan Kode Guru"
                    @click="openEditTeacher(t)"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition"
                    title="Kelola Mata Pelajaran dan Alokasi JP"
                    @click="openManageSubjects(t)"
                  >
                    📚 Mapel & JP
                  </button>
                  <button
                    type="button"
                    class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-xs font-bold transition"
                    title="Hapus Guru"
                    @click="deleteTeacher(t.id)"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MODAL 1: EDIT GURU & KODE GURU -->
      <div
        v-if="editingTeacher"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <h4 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>✏️</span>
              <span>Edit Guru & Kode Guru</span>
            </h4>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              @click="editingTeacher = null"
            >
              ✕
            </button>
          </div>

          <form @submit.prevent="saveEditTeacher" class="p-6 space-y-4">
            <!-- Notice on Kode Guru change -->
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
              <p class="font-bold flex items-center gap-1.5">
                <span>💡</span>
                <span>Perubahan Kode Guru Aman Terintegrasi</span>
              </p>
              <p class="mt-1 text-[11px] leading-relaxed">
                Jika Anda mengubah angka Kode Guru, sistem akan otomatis memperbarui seluruh jadwal kelas, mata pelajaran, dan jadwal piket yang terdaftar tanpa menghilangkan data.
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Kode Guru (Angka Unik) *
              </label>
              <input
                v-model="editTeacherForm.newId"
                type="number"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span class="text-[10px] text-slate-400 mt-1 block">
                Kode saat ini: <strong class="font-mono text-emerald-600">{{ editTeacherForm.id }}</strong>
              </span>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                v-model="editTeacherForm.name"
                type="text"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Target Beban Mengajar Maksimal (JP/Minggu)
              </label>
              <input
                v-model="editTeacherForm.maxHoursPerWeek"
                type="number"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                class="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                @click="editingTeacher = null"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 2: KELOLA MATA PELAJARAN & ALOKASI WAKTU (JP) -->
      <div
        v-if="currentManagingTeacher"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div>
              <h4 class="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs">
                  {{ currentManagingTeacher.id }}
                </span>
                <span>Kelola Mata Pelajaran & Alokasi JP</span>
              </h4>
              <p class="text-xs text-slate-500 mt-0.5 font-semibold">
                Guru: {{ currentManagingTeacher.name }}
              </p>
            </div>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              @click="activeSubjectTeacherId = null"
            >
              ✕
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto space-y-6">
            <!-- Summary Stats Card -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Mapel</span>
                <span class="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {{ currentManagingTeacher.subjects?.length || 0 }}
                </span>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Beban (JP)</span>
                <span class="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {{ getTeacherTotalTargetJp(currentManagingTeacher) }} JP
                </span>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terjadwal di Matriks</span>
                <span class="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {{ getTeacherTotalScheduledJp(currentManagingTeacher.id) }} JP
                </span>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jam Belum Masuk</span>
                <span
                  :class="[
                    'text-lg font-black mt-0.5 block',
                    getTeacherTotalTargetJp(currentManagingTeacher) > getTeacherTotalScheduledJp(currentManagingTeacher.id)
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400'
                  ]"
                >
                  {{ Math.max(0, getTeacherTotalTargetJp(currentManagingTeacher) - getTeacherTotalScheduledJp(currentManagingTeacher.id)) }} JP
                </span>
              </div>
            </div>

            <!-- Form Add Subject -->
            <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <h5 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>➕</span>
                <span>Tambah Mata Pelajaran Baru</span>
              </h5>

              <form @submit.prevent="addSubject" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Sub-Kode *
                  </label>
                  <input
                    v-model="newSubjectForm.code"
                    type="text"
                    required
                    maxlength="5"
                    placeholder="mis: a, b"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div class="sm:col-span-5">
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Nama Mata Pelajaran *
                  </label>
                  <input
                    v-model="newSubjectForm.name"
                    type="text"
                    required
                    placeholder="Contoh: Pemrograman Web & Bergerak"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Alokasi (JP) *
                  </label>
                  <input
                    v-model="newSubjectForm.targetJp"
                    type="number"
                    required
                    min="1"
                    max="40"
                    class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div class="sm:col-span-3">
                  <button
                    type="submit"
                    :disabled="isSaving"
                    class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    + Simpan Mapel
                  </button>
                </div>
              </form>
            </div>

            <!-- Subject List Table -->
            <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div class="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                <span>Daftar Mata Pelajaran Guru Ini</span>
                <span class="text-[10px] text-slate-400 font-normal">
                  Klik mapel di jadwal untuk langsung memilih tanpa mengetik kode
                </span>
              </div>

              <div v-if="!currentManagingTeacher.subjects || currentManagingTeacher.subjects.length === 0" class="p-6 text-center text-slate-400 text-xs">
                Belum ada mata pelajaran terdaftar untuk guru ini. Tambahkan melalui form di atas.
              </div>

              <table v-else class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th class="px-3 py-2.5 w-16 text-center">Sub-Kode</th>
                    <th class="px-4 py-2.5">Nama Mata Pelajaran</th>
                    <th class="px-3 py-2.5 w-24 text-center">Alokasi (JP)</th>
                    <th class="px-3 py-2.5 w-24 text-center">Terjadwal</th>
                    <th class="px-4 py-2.5 w-44 text-center">Status Sisa Jam</th>
                    <th class="px-3 py-2.5 w-28 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr
                    v-for="sub in currentManagingTeacher.subjects"
                    :key="sub.id"
                    class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td class="px-3 py-2.5 text-center">
                      <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs uppercase shadow-xs">
                        {{ sub.code }}
                      </span>
                    </td>
                    <td class="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                      {{ sub.name }}
                      <span class="block text-[10px] font-mono text-slate-400 font-normal">
                        Kode di jadwal: {{ currentManagingTeacher.id }}{{ sub.code }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 text-center font-bold font-mono text-slate-700 dark:text-slate-300">
                      {{ sub.targetJp }} JP
                    </td>
                    <td class="px-3 py-2.5 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {{ getSubjectScheduledJp(currentManagingTeacher.id, sub.code, sub.classroomId) }} JP
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      <div v-if="sub.targetJp > getSubjectScheduledJp(currentManagingTeacher.id, sub.code, sub.classroomId)">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-block">
                          ⚠️ Sisa {{ sub.targetJp - getSubjectScheduledJp(currentManagingTeacher.id, sub.code, sub.classroomId) }} JP belum masuk
                        </span>
                      </div>
                      <div v-else-if="sub.targetJp === getSubjectScheduledJp(currentManagingTeacher.id, sub.code, sub.classroomId)">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block">
                          ✅ Lengkap ({{ sub.targetJp }} JP)
                        </span>
                      </div>
                      <div v-else>
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 inline-block">
                          ℹ️ Kelebihan {{ getSubjectScheduledJp(currentManagingTeacher.id, sub.code, sub.classroomId) - sub.targetJp }} JP
                        </span>
                      </div>
                    </td>
                    <td class="px-3 py-2.5 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Edit Mapel"
                          @click="openEditSubject(sub)"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                          title="Hapus Mapel"
                          @click="deleteSubject(sub.id, sub.code)"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Inline Edit Subject Sub-Modal -->
            <div
              v-if="editingSubject"
              class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  ✏️ Edit Mata Pelajaran: {{ editingSubject.name }}
                </span>
                <button
                  type="button"
                  class="text-xs text-slate-500 hover:text-slate-800"
                  @click="editingSubject = null"
                >
                  ✕ Batal
                </button>
              </div>

              <form @submit.prevent="saveEditSubject" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div class="sm:col-span-2">
                  <label class="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Sub-Kode
                  </label>
                  <input
                    v-model="editSubjectForm.code"
                    type="text"
                    required
                    class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold uppercase"
                  />
                </div>
                <div class="sm:col-span-6">
                  <label class="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Nama Mata Pelajaran
                  </label>
                  <input
                    v-model="editSubjectForm.name"
                    type="text"
                    required
                    class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Target (JP)
                  </label>
                  <input
                    v-model="editSubjectForm.targetJp"
                    type="number"
                    required
                    class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div class="sm:col-span-2">
                  <button
                    type="submit"
                    :disabled="isSaving"
                    class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
            <button
              type="button"
              class="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              @click="activeSubjectTeacherId = null"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: CLASSROOMS MANAGEMENT -->
    <div v-if="activeTab === 'classrooms'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
          Kelola Kelas & Jurusan
        </h3>
        <p class="text-xs text-slate-500">
          Kelas ini menentukan kolom pada matriks jadwal pelajaran.
        </p>
      </div>

      <!-- Add Classroom Form -->
      <form @submit.prevent="addClassroom" class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Tingkat *
          </label>
          <select
            v-model="newClassroom.grade"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
          >
            <option value="X">X (Sepuluh)</option>
            <option value="XI">XI (Sebelas)</option>
            <option value="XII">XII (Dua Belas)</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Jurusan / Singkatan *
          </label>
          <input
            v-model="newClassroom.major"
            type="text"
            required
            placeholder="Contoh: TKJ, BDP, MP..."
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold uppercase"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Nama Label Lengkap (Opsional)
          </label>
          <input
            v-model="newClassroom.name"
            type="text"
            placeholder="Otomatis"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
          />
        </div>

        <div>
          <button
            type="submit"
            :disabled="isSaving"
            class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
          >
            + Tambah Kelas
          </button>
        </div>
      </form>

      <!-- Classroom Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          v-for="c in classrooms"
          :key="c.id"
          class="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between"
        >
          <div>
            <span class="text-xs font-black text-slate-900 dark:text-white block">
              {{ c.name }}
            </span>
            <span class="text-[10px] text-slate-500">
              Tingkat {{ c.grade }} • {{ c.major }}
            </span>
          </div>
          <button
            type="button"
            class="text-red-500 hover:text-red-700 p-1 text-xs"
            @click="deleteClassroom(c.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 4: TIMESLOTS & BREAKS -->
    <div v-if="activeTab === 'timeslots'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
            Pengaturan Hari, Jam Pelajaran & Istirahat
          </h3>
          <p class="text-xs text-slate-500">
            Anda dapat menambah/menghapus hari (misal Sabtu), serta menambah, mengedit, dan menghapus jam pelajaran & istirahat.
          </p>
        </div>

        <!-- Add Day Form -->
        <form @submit.prevent="addDay" class="flex items-center gap-2">
          <input
            v-model="newDayName"
            type="text"
            placeholder="Nama hari baru (mis: SABTU)"
            class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            :disabled="isSaving || !newDayName.trim()"
            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap"
          >
            + Tambah Hari
          </button>
        </form>
      </div>

      <!-- Day Switcher & Day Delete -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-1.5 overflow-x-auto">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Hari:</span>
          <button
            v-for="d in days"
            :key="d.id"
            :class="[
              'px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition',
              selectedDayId === d.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            ]"
            @click="selectedDayId = d.id"
          >
            {{ d.name }}
          </button>
        </div>

        <div v-if="selectedDay" class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 transition flex items-center gap-1"
            @click="deleteDay(selectedDay.id, selectedDay.name)"
          >
            <span>🗑️</span>
            <span>Hapus Hari {{ selectedDay.name }}</span>
          </button>
        </div>
      </div>

      <!-- Add TimeSlot Form -->
      <form @submit.prevent="addTimeSlot" class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Jam Ke (Angka)
          </label>
          <input
            v-model="newSlot.period"
            type="number"
            placeholder="Kosongkan jika istirahat"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Waktu Mulai
          </label>
          <input
            v-model="newSlot.timeStart"
            type="text"
            required
            placeholder="07.00"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Waktu Selesai
          </label>
          <input
            v-model="newSlot.timeEnd"
            type="text"
            required
            placeholder="07.45"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
          />
        </div>

        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Tipe Slot
          </label>
          <select
            v-model="newSlot.slotType"
            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
          >
            <option value="LESSON">Pelajaran Biasa</option>
            <option value="BREAK">Istirahat</option>
            <option value="CEREMONY">Upacara / Apel</option>
            <option value="FRIDAY_PRAYER">Sholat Jumat / Keputrian</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isSaving"
            class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
          >
            + Tambah Slot ke {{ selectedDay?.name }}
          </button>
        </div>
      </form>

      <!-- Slot List for selected day -->
      <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div class="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <span>Daftar Jam & Istirahat Hari {{ selectedDay?.name }} (Total: {{ selectedDay?.timeSlots?.length || 0 }} Slot)</span>
          <span class="text-[10px] text-slate-400 font-normal">Klik "Edit" untuk mengubah jam atau tipe</span>
        </div>
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
            <tr>
              <th class="px-3 py-2.5 w-16 text-center">Jam Ke</th>
              <th class="px-4 py-2.5 w-36">Waktu</th>
              <th class="px-4 py-2.5">Tipe & Keterangan</th>
              <th class="px-3 py-2.5 w-32 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr
              v-for="slot in selectedDay?.timeSlots"
              :key="slot.id"
              :class="[
                'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition',
                slot.slotType === 'BREAK' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
              ]"
            >
              <td class="px-3 py-2.5 text-center font-bold font-mono">
                {{ slot.period || '-' }}
              </td>
              <td class="px-4 py-2.5 font-mono font-semibold">
                {{ slot.timeDisplay }}
              </td>
              <td class="px-4 py-2.5">
                <span
                  v-if="slot.slotType === 'BREAK'"
                  class="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold text-[10px]"
                >
                  {{ slot.label || 'ISTIRAHAT' }}
                </span>
                <span
                  v-else-if="slot.slotType === 'CEREMONY'"
                  class="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold text-[10px]"
                >
                  {{ slot.label || 'UPACARA/APEL' }}
                </span>
                <span
                  v-else-if="slot.slotType === 'FRIDAY_PRAYER'"
                  class="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold text-[10px]"
                >
                  {{ slot.label || "SHOLAT JUM'AT" }}
                </span>
                <span v-else class="text-slate-600 dark:text-slate-400 text-xs">
                  Jam Pelajaran {{ slot.label ? `(${slot.label})` : '' }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded text-xs font-semibold transition"
                    @click="openEditSlot(slot)"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-200 hover:text-rose-600 rounded text-xs font-semibold transition"
                    @click="deleteTimeSlot(slot.id)"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal Edit TimeSlot -->
      <div
        v-if="editingSlot"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <h4 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>✏️</span>
              <span>Edit Jam Waktu (Hari {{ selectedDay?.name }})</span>
            </h4>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              @click="editingSlot = null"
            >
              ✕
            </button>
          </div>

          <form @submit.prevent="saveEditSlot" class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Ke (Nomor)
              </label>
              <input
                v-model="editSlotForm.period"
                type="number"
                placeholder="Kosongkan jika istirahat"
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Waktu Mulai
                </label>
                <input
                  v-model="editSlotForm.timeStart"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Waktu Selesai
                </label>
                <input
                  v-model="editSlotForm.timeEnd"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipe Slot
              </label>
              <select
                v-model="editSlotForm.slotType"
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="LESSON">Pelajaran Biasa</option>
                <option value="BREAK">Istirahat</option>
                <option value="CEREMONY">Upacara / Apel</option>
                <option value="FRIDAY_PRAYER">Sholat Jumat / Keputrian</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan / Label Khusus
              </label>
              <input
                v-model="editSlotForm.label"
                type="text"
                placeholder="Contoh: ISTIRAHAT 1, SHOLAT JUM'AT, APEL PAGI..."
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                @click="editingSlot = null"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- TAB 5: PIKET & PEMBINA -->
    <div v-if="activeTab === 'piket'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div>
        <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
          Guru Piket Pengajar Harian
        </h3>
        <p class="text-xs text-slate-500">
          Atur 2 orang guru piket untuk setiap hari kerja (Senin - Jumat).
        </p>
      </div>

      <div class="space-y-3 max-w-2xl">
        <div
          v-for="p in piketForm"
          :key="p.dayId"
          class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-center"
        >
          <div class="font-extrabold text-sm uppercase text-slate-800 dark:text-white">
            {{ p.dayName }}
          </div>

          <div>
            <label class="block text-[10px] text-slate-500 mb-1">Guru Piket 1</label>
            <select
              v-model="p.teacher1Id"
              class="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
            >
              <option :value="null">-- Kosong --</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                [{{ t.id }}] {{ t.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] text-slate-500 mb-1">Guru Piket 2</label>
            <select
              v-model="p.teacher2Id"
              class="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
            >
              <option :value="null">-- Kosong --</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                [{{ t.id }}] {{ t.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="pt-2">
          <button
            type="button"
            :disabled="isSaving"
            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
            @click="savePiket"
          >
            Simpan Seluruh Guru Piket
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
