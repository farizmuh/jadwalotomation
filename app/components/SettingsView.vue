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

const activeTab = useState<'school' | 'teachers' | 'classrooms' | 'timeslots' | 'piket' | 'ekskul' | 'account'>('settings_active_tab', () => 'school')

onMounted(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('settings_active_tab')
    if (saved && ['school', 'teachers', 'classrooms', 'timeslots', 'piket', 'ekskul', 'account'].includes(saved)) {
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

// Account / Password Change
const isChangingPassword = ref(false)
const formPassword = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

async function changePassword() {
  if (!formPassword.currentPassword || !formPassword.newPassword || !formPassword.confirmPassword) {
    showNotification('error', 'Semua field password wajib diisi')
    return
  }
  if (formPassword.newPassword !== formPassword.confirmPassword) {
    showNotification('error', 'Konfirmasi password baru tidak cocok')
    return
  }
  if (formPassword.newPassword.length < 6) {
    showNotification('error', 'Password baru minimal 6 karakter')
    return
  }
  isChangingPassword.value = true
  try {
    const res: any = await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: formPassword.currentPassword,
        newPassword: formPassword.newPassword
      }
    })
    if (res.success) {
      showNotification('success', 'Password berhasil diubah!')
      formPassword.currentPassword = ''
      formPassword.newPassword = ''
      formPassword.confirmPassword = ''
    } else {
      showNotification('error', res.message || 'Gagal mengubah password')
    }
  } catch (err: any) {
    showNotification('error', err.data?.statusMessage || err.message || 'Terjadi kesalahan')
  } finally {
    isChangingPassword.value = false
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

// --- BULK CREATE TEACHERS & SUBJECTS ---
const showBulkTeacherModal = ref(false)
const bulkTeacherTab = ref<'paste' | 'table'>('paste')
const bulkTeacherText = ref('')
const isBulkSaving = ref(false)
const bulkError = ref('')

const bulkTeacherRows = ref<Array<{
  id: string
  name: string
  subjectStr: string
  targetJp: number
}>>([
  { id: '', name: '', subjectStr: '', targetJp: 4 },
  { id: '', name: '', subjectStr: '', targetJp: 4 },
  { id: '', name: '', subjectStr: '', targetJp: 4 }
])

function openBulkTeacherModal() {
  showBulkTeacherModal.value = true
  bulkError.value = ''
}

function addBulkRow(count = 1) {
  for (let i = 0; i < count; i++) {
    bulkTeacherRows.value.push({ id: '', name: '', subjectStr: '', targetJp: 4 })
  }
}

function removeBulkRow(index: number) {
  bulkTeacherRows.value.splice(index, 1)
  if (bulkTeacherRows.value.length === 0) {
    addBulkRow(1)
  }
}

function resetBulkRows() {
  bulkTeacherRows.value = [
    { id: '', name: '', subjectStr: '', targetJp: 4 },
    { id: '', name: '', subjectStr: '', targetJp: 4 },
    { id: '', name: '', subjectStr: '', targetJp: 4 }
  ]
}

function loadSampleBulkData() {
  bulkTeacherText.value = `30\tDrs. H. Mulyadi, M.Pd\tMatematika\t4
31\tDewi Sartika, S.Pd\tBahasa Inggris\t4
32\tRizal Firmansyah, S.Kom\tPemrograman Web, Basis Data\t4
33\tDra. Hj. Nurul Hidayah\t(Non-Pengajar)`
}

// Parse text into structured list
const parsedBulkFromText = computed(() => {
  if (!bulkTeacherText.value.trim()) return []
  const lines = bulkTeacherText.value.split('\n')
  const results: any[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Detect delimiter: tab, pipe, semicolon, or comma
    let delimiter = '\t'
    if (line.includes('\t')) delimiter = '\t'
    else if (line.includes('|')) delimiter = '|'
    else if (line.includes(';')) delimiter = ';'
    else if (line.includes(',')) delimiter = ','

    const parts = line.split(delimiter).map((p) => p.trim()).filter(Boolean)
    if (parts.length === 0) continue

    let id: string | null = null
    let name = ''
    let subjectStr = ''
    let targetJp = 4

    // Check if first column is numeric ID
    if (parts[0] && /^\d+$/.test(parts[0])) {
      id = parts[0]
      name = parts[1] || ''
      subjectStr = parts[2] || ''
      if (parts[3] && !isNaN(Number(parts[3]))) {
        targetJp = Number(parts[3])
      }
    } else {
      name = parts[0] || ''
      subjectStr = parts[1] || ''
      if (parts[2] && !isNaN(Number(parts[2]))) {
        targetJp = Number(parts[2])
      }
    }

    if (name) {
      results.push({
        id,
        name,
        subjectStr,
        targetJp: targetJp > 0 ? targetJp : 4
      })
    }
  }
  return results
})

// Combined active bulk list based on active tab
const activeBulkTeacherList = computed(() => {
  if (bulkTeacherTab.value === 'paste') {
    return parsedBulkFromText.value
  } else {
    return bulkTeacherRows.value
      .filter((r) => r.name.trim())
      .map((r) => ({
        id: r.id.trim() || null,
        name: r.name.trim(),
        subjectStr: r.subjectStr.trim(),
        targetJp: Number(r.targetJp) || 4
      }))
  }
})

// Helper to parse subject string like "Matematika, Fisika" or "(Non-Pengajar)"
function parseSubjectsFromStr(str: string, defaultJp: number) {
  if (!str) return []
  const clean = str.trim()
  if (
    clean.toLowerCase() === '(non-pengajar)' ||
    clean.toLowerCase() === 'non-pengajar' ||
    clean === '-' ||
    clean.toLowerCase() === 'non pengajar'
  ) {
    return []
  }

  // Split by comma or semicolon
  const subs = clean.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
  return subs.map((s) => {
    // Check if has JP annotation like "Matematika (4)" or "Matematika: 4"
    const jpMatch = s.match(/\((\d+)\s*(?:jp)?\)/i) || s.match(/:\s*(\d+)/)
    if (jpMatch) {
      const parsedJp = Number(jpMatch[1])
      const cleanName = s.replace(jpMatch[0], '').trim()
      return { name: cleanName, targetJp: parsedJp || defaultJp }
    }
    return { name: s, targetJp: defaultJp }
  })
}

// Compute preview with validation
const bulkTeachersPreview = computed(() => {
  const existingTeachers = props.teachers || []
  const existingIdSet = new Set(existingTeachers.map((t) => t.id))
  let maxId = existingTeachers.reduce((max, t) => Math.max(max, t.id), 0)

  const usedIdsInBatch = new Set<number>()

  return activeBulkTeacherList.value.map((item, idx) => {
    let resolvedId: number
    let isAutoId = false
    let hasConflict = false
    let conflictMsg = ''

    if (item.id) {
      resolvedId = Number(item.id)
      if (existingIdSet.has(resolvedId)) {
        hasConflict = true
        conflictMsg = `Kode ${resolvedId} sudah terpakai`
      } else if (usedIdsInBatch.has(resolvedId)) {
        hasConflict = true
        conflictMsg = `Kode ${resolvedId} duplikat di daftar massal`
      }
    } else {
      isAutoId = true
      do {
        maxId++
      } while (existingIdSet.has(maxId) || usedIdsInBatch.has(maxId))
      resolvedId = maxId
    }

    if (!hasConflict) {
      usedIdsInBatch.add(resolvedId)
    }

    const parsedSubjects = parseSubjectsFromStr(item.subjectStr, item.targetJp)

    return {
      index: idx + 1,
      id: resolvedId,
      isAutoId,
      name: item.name,
      subjects: parsedSubjects,
      hasConflict,
      conflictMsg
    }
  })
})

const canSaveBulkTeachers = computed(() => {
  if (bulkTeachersPreview.value.length === 0) return false
  return !bulkTeachersPreview.value.some((p) => p.hasConflict)
})

async function saveBulkTeachers() {
  if (!canSaveBulkTeachers.value) return
  isBulkSaving.value = true
  bulkError.value = ''

  try {
    const payload = bulkTeachersPreview.value.map((item) => ({
      id: item.id,
      name: item.name,
      subjects: item.subjects
    }))

    const res: any = await $fetch('/api/teachers/bulk', {
      method: 'POST',
      body: { teachers: payload }
    })

    if (res.success) {
      showNotification('success', res.message || `Berhasil menambahkan ${payload.length} guru massal!`)
      showBulkTeacherModal.value = false
      bulkTeacherText.value = ''
      resetBulkRows()
      emit('refreshed')
    } else {
      bulkError.value = res.error || 'Gagal menyimpan guru massal'
    }
  } catch (err: any) {
    bulkError.value = err.data?.message || err.message || 'Terjadi kesalahan saat menyimpan'
  } finally {
    isBulkSaving.value = false
  }
}

// --- BULK CREATE SUBJECTS FOR SINGLE TEACHER ---
const subjectAddTab = ref<'single' | 'bulk'>('single')
const bulkSubjectText = ref('')
const isBulkSubjectSaving = ref(false)
const bulkSubjectError = ref('')

function loadSampleBulkSubjects() {
  bulkSubjectText.value = `Pemrograman Web Lanjut\t4
Basis Data Relasional\t4
Dasar Desain Grafis\t2`
}

const parsedBulkSubjects = computed(() => {
  if (!bulkSubjectText.value.trim()) return []
  const lines = bulkSubjectText.value.split('\n')
  const results: any[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    let delimiter = '\t'
    if (line.includes('\t')) delimiter = '\t'
    else if (line.includes('|')) delimiter = '|'
    else if (line.includes(';')) delimiter = ';'
    else if (line.includes(',')) delimiter = ','

    const parts = line.split(delimiter).map((p) => p.trim()).filter(Boolean)
    if (parts.length === 0) continue

    let name = ''
    let targetJp = 4

    if (parts.length >= 2) {
      const num = Number(parts[1])
      if (!isNaN(num) && num > 0) {
        name = parts[0] || ''
        targetJp = num
      } else {
        name = parts.join(' - ')
      }
    } else {
      name = parts[0] || ''
    }

    if (name) {
      results.push({ name, targetJp })
    }
  }
  return results
})

async function saveBulkSubjects() {
  if (!currentManagingTeacher.value || parsedBulkSubjects.value.length === 0) return
  isBulkSubjectSaving.value = true
  bulkSubjectError.value = ''

  try {
    const res: any = await $fetch(`/api/teachers/${currentManagingTeacher.value.id}/subjects-bulk`, {
      method: 'POST',
      body: { subjects: parsedBulkSubjects.value }
    })

    if (res.success) {
      showNotification('success', res.message || 'Berhasil menambahkan mata pelajaran massal!')
      bulkSubjectText.value = ''
      subjectAddTab.value = 'single'
      emit('refreshed')
    } else {
      bulkSubjectError.value = res.error || 'Gagal menambahkan mata pelajaran'
    }
  } catch (err: any) {
    bulkSubjectError.value = err.data?.message || err.message || 'Terjadi kesalahan'
  } finally {
    isBulkSubjectSaving.value = false
  }
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

// --- 6. EXTRACURRICULAR (EKSKUL) & PEMBINA MANAGEMENT ---
function parseLeaders(leaderStr: string): string[] {
  if (!leaderStr || leaderStr.trim() === '-' || leaderStr.trim() === '') return []
  return leaderStr.split('/').map((s) => s.trim()).filter(Boolean)
}

const newEkskul = reactive({
  name: '',
  orderIndex: 1,
  leaders: [] as string[],
  selectedTeacherId: '' as string | number,
  customLeaderName: ''
})

function addTeacherToNewEkskul() {
  if (!newEkskul.selectedTeacherId) return
  const teacher = props.teachers.find((t) => t.id === Number(newEkskul.selectedTeacherId))
  if (teacher && !newEkskul.leaders.includes(teacher.name)) {
    newEkskul.leaders.push(teacher.name)
  }
  newEkskul.selectedTeacherId = ''
}

function addCustomLeaderToNewEkskul() {
  const name = newEkskul.customLeaderName.trim()
  if (name && !newEkskul.leaders.includes(name)) {
    newEkskul.leaders.push(name)
  }
  newEkskul.customLeaderName = ''
}

function removeLeaderFromNewEkskul(index: number) {
  newEkskul.leaders.splice(index, 1)
}

async function addEkskul() {
  if (!newEkskul.name.trim()) {
    showNotification('error', 'Nama ekstrakurikuler harus diisi')
    return
  }
  isSaving.value = true
  try {
    const res: any = await $fetch('/api/extracurriculars', {
      method: 'POST',
      body: {
        name: newEkskul.name.trim(),
        orderIndex: Number(newEkskul.orderIndex) || (props.extracurriculars?.length || 0) + 1,
        leaders: newEkskul.leaders
      }
    })
    if (res.success) {
      showNotification('success', `Ekstrakurikuler '${newEkskul.name}' berhasil ditambahkan!`)
      newEkskul.name = ''
      newEkskul.leaders = []
      newEkskul.orderIndex = (props.extracurriculars?.length || 0) + 2
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal menambahkan ekstrakurikuler')
    }
  } catch (err: any) {
    showNotification('error', err.data?.message || err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

// Edit Ekskul Modal
const editingEkskul = ref<any>(null)
const editEkskulForm = reactive({
  name: '',
  orderIndex: 1,
  leaders: [] as string[],
  selectedTeacherId: '' as string | number,
  customLeaderName: ''
})

function openEditEkskul(item: any) {
  editingEkskul.value = item
  editEkskulForm.name = item.name
  editEkskulForm.orderIndex = item.orderIndex || 1
  editEkskulForm.leaders = parseLeaders(item.leader)
  editEkskulForm.selectedTeacherId = ''
  editEkskulForm.customLeaderName = ''
}

function addTeacherToEditEkskul() {
  if (!editEkskulForm.selectedTeacherId) return
  const teacher = props.teachers.find((t) => t.id === Number(editEkskulForm.selectedTeacherId))
  if (teacher && !editEkskulForm.leaders.includes(teacher.name)) {
    editEkskulForm.leaders.push(teacher.name)
  }
  editEkskulForm.selectedTeacherId = ''
}

function addCustomLeaderToEditEkskul() {
  const name = editEkskulForm.customLeaderName.trim()
  if (name && !editEkskulForm.leaders.includes(name)) {
    editEkskulForm.leaders.push(name)
  }
  editEkskulForm.customLeaderName = ''
}

function removeLeaderFromEditEkskul(index: number) {
  editEkskulForm.leaders.splice(index, 1)
}

async function saveEditEkskul() {
  if (!editingEkskul.value || !editEkskulForm.name.trim()) return
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/extracurriculars/${editingEkskul.value.id}`, {
      method: 'PUT',
      body: {
        name: editEkskulForm.name.trim(),
        orderIndex: Number(editEkskulForm.orderIndex),
        leaders: editEkskulForm.leaders
      }
    })
    if (res.success) {
      showNotification('success', 'Ekstrakurikuler berhasil diperbarui!')
      editingEkskul.value = null
      emit('refreshed')
    } else {
      showNotification('error', res.error || 'Gagal memperbarui ekstrakurikuler')
    }
  } catch (err: any) {
    showNotification('error', err.data?.message || err.message || 'Terjadi kesalahan')
  } finally {
    isSaving.value = false
  }
}

async function deleteEkskul(item: any) {
  if (!confirm(`Hapus ekstrakurikuler '${item.name}'?`)) return
  isSaving.value = true
  try {
    const res: any = await $fetch(`/api/extracurriculars/${item.id}`, {
      method: 'DELETE'
    })
    if (res.success) {
      showNotification('success', `Ekstrakurikuler '${item.name}' berhasil dihapus`)
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
          { key: 'piket', label: 'Guru Piket Harian', icon: '📋' },
          { key: 'ekskul', label: 'Ekstrakurikuler & Pembina', icon: '🏆' },
          { key: 'account', label: 'Akun Admin', icon: '🔐' }
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
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openBulkTeacherModal"
            class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span class="text-sm">⚡</span>
            <span>Tambah Guru Massal (Bulk Create)</span>
          </button>
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
              <div class="flex items-center justify-between">
                <h5 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>➕</span>
                  <span>Tambah Mata Pelajaran</span>
                </h5>
                <div class="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <button
                    type="button"
                    :class="[
                      'px-2.5 py-1 rounded-md transition',
                      subjectAddTab === 'single'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    ]"
                    @click="subjectAddTab = 'single'"
                  >
                    Input Satuan
                  </button>
                  <button
                    type="button"
                    :class="[
                      'px-2.5 py-1 rounded-md transition flex items-center gap-1',
                      subjectAddTab === 'bulk'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    ]"
                    @click="subjectAddTab = 'bulk'"
                  >
                    <span>⚡</span>
                    <span>Massal (Banyak Sekaligus)</span>
                  </button>
                </div>
              </div>

              <!-- Single Form -->
              <form v-if="subjectAddTab === 'single'" @submit.prevent="addSubject" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
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

              <!-- Bulk Form -->
              <div v-else class="space-y-3 pt-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400 text-[11px]">
                    Ketik atau Paste daftar mapel dan JP (1 baris per mapel). Format: <b>Nama Mapel [Tab/Koma] JP</b>
                  </span>
                  <button
                    type="button"
                    @click="loadSampleBulkSubjects"
                    class="text-emerald-600 hover:text-emerald-700 font-bold text-[11px] underline cursor-pointer"
                  >
                    📋 Muat Contoh
                  </button>
                </div>

                <textarea
                  v-model="bulkSubjectText"
                  rows="3"
                  placeholder="Contoh:&#10;Pemrograman Web Lanjut	4&#10;Basis Data Relasional	4&#10;Dasar Desain Grafis	2"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                ></textarea>

                <div v-if="parsedBulkSubjects.length > 0" class="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                  <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Preview ({{ parsedBulkSubjects.length }} Mapel Baru):</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="(sub, sIdx) in parsedBulkSubjects"
                      :key="sIdx"
                      class="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{{ sub.name }}</span>
                      <span class="font-mono font-bold bg-emerald-200/60 dark:bg-emerald-800/60 px-1 rounded text-[11px]">{{ sub.targetJp }} JP</span>
                    </span>
                  </div>
                </div>

                <div v-if="bulkSubjectError" class="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-lg font-semibold">
                  {{ bulkSubjectError }}
                </div>

                <div class="flex justify-end pt-1">
                  <button
                    type="button"
                    :disabled="isBulkSubjectSaving || parsedBulkSubjects.length === 0"
                    @click="saveBulkSubjects"
                    class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span v-if="isBulkSubjectSaving" class="animate-spin">⏳</span>
                    <span>Simpan {{ parsedBulkSubjects.length }} Mata Pelajaran Sekaligus</span>
                  </button>
                </div>
              </div>
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

    <!-- TAB 6: EXTRACURRICULAR (EKSKUL) & PEMBINA -->
    <div v-if="activeTab === 'ekskul'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <span>🏆</span>
            <span>Kelola Ekstrakurikuler & Pembina</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Daftar kegiatan ekstrakurikuler sekolah beserta pembina penanggung jawab. Mendukung lebih dari 1 pembina per ekskul.
          </p>
        </div>
        <div class="text-xs text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
          Total: {{ extracurriculars?.length || 0 }} Ekstrakurikuler
        </div>
      </div>

      <!-- Form Add Ekskul -->
      <form @submit.prevent="addEkskul" class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
        <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span>➕</span>
          <span>Tambah Ekstrakurikuler Baru</span>
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
          <div class="sm:col-span-6">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Nama Ekstrakurikuler *
            </label>
            <input
              v-model="newEkskul.name"
              type="text"
              required
              placeholder="Contoh: Pramuka, PMR, Futsal, Tari, Banjari"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Urutan Slot
            </label>
            <input
              v-model="newEkskul.orderIndex"
              type="number"
              min="1"
              max="20"
              class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-center"
            />
          </div>

          <div class="sm:col-span-4 self-end">
            <button
              type="submit"
              :disabled="isSaving"
              class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>+ Simpan Ekstrakurikuler</span>
            </button>
          </div>
        </div>

        <!-- Multi Pembina Selector -->
        <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <div class="flex items-center justify-between">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Atur Pembina Penanggung Jawab (Boleh Lebih dari 1 Pembina):
            </label>
            <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {{ newEkskul.leaders.length }} Pembina Dipilih
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Option 1: Pick from Teachers -->
            <div class="flex items-center gap-2">
              <select
                v-model="newEkskul.selectedTeacherId"
                class="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="">-- Pilih Guru Sekolah --</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">
                  [{{ t.id }}] {{ t.name }}
                </option>
              </select>
              <button
                type="button"
                @click="addTeacherToNewEkskul"
                class="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl transition whitespace-nowrap cursor-pointer"
              >
                + Tambah Guru
              </button>
            </div>

            <!-- Option 2: Custom Outside Coach -->
            <div class="flex items-center gap-2">
              <input
                v-model="newEkskul.customLeaderName"
                type="text"
                placeholder="Atau ketik nama pelatih luar..."
                @keydown.enter.prevent="addCustomLeaderToNewEkskul"
                class="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
              <button
                type="button"
                @click="addCustomLeaderToNewEkskul"
                class="px-3 py-2 bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs rounded-xl transition whitespace-nowrap cursor-pointer"
              >
                + Tambah Luar
              </button>
            </div>
          </div>

          <!-- Active Pembina Badges -->
          <div class="pt-1">
            <div v-if="newEkskul.leaders.length === 0" class="text-[11px] text-slate-400 italic">
              * Belum ada pembina yang ditambahkan. Anda dapat memilih dari daftar guru di atas atau memasukkan nama pelatih dari luar.
            </div>
            <div v-else class="flex flex-wrap gap-2 items-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 mr-1">Daftar Pembina:</span>
              <span
                v-for="(ldr, lIdx) in newEkskul.leaders"
                :key="lIdx"
                class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold shadow-2xs"
              >
                <span>👨‍🏫 {{ ldr }}</span>
                <button
                  type="button"
                  @click="removeLeaderFromNewEkskul(lIdx)"
                  class="w-4 h-4 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px] ml-1 transition cursor-pointer"
                  title="Hapus pembina ini"
                >
                  ✕
                </button>
              </span>
            </div>
          </div>
        </div>
      </form>

      <!-- Table of Extracurriculars -->
      <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th class="px-3 py-2.5 w-16 text-center">Slot</th>
              <th class="px-4 py-2.5 w-44">Nama Ekstrakurikuler</th>
              <th class="px-4 py-2.5">Pembina Penanggung Jawab</th>
              <th class="px-4 py-2.5 w-32 text-center">Jumlah Pembina</th>
              <th class="px-3 py-2.5 w-36 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr
              v-for="item in extracurriculars"
              :key="item.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <td class="px-3 py-2.5 text-center font-mono font-bold">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                  #{{ item.orderIndex }}
                </span>
              </td>
              <td class="px-4 py-2.5 font-extrabold text-slate-900 dark:text-white">
                {{ item.name }}
              </td>
              <td class="px-4 py-2.5">
                <div v-if="parseLeaders(item.leader).length > 0" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(p, pIdx) in parseLeaders(item.leader)"
                    :key="pIdx"
                    class="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold"
                  >
                    {{ p }}
                  </span>
                </div>
                <span v-else class="text-slate-400 italic text-[11px]">- Belum ada pembina -</span>
              </td>
              <td class="px-4 py-2.5 text-center">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    parseLeaders(item.leader).length > 1
                      ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : parseLeaders(item.leader).length === 1
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                  ]"
                >
                  {{ parseLeaders(item.leader).length }} Pembina
                </span>
              </td>
              <td class="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                <button
                  type="button"
                  @click="openEditEkskul(item)"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] transition cursor-pointer"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  @click="deleteEkskul(item)"
                  class="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-[11px] transition cursor-pointer"
                >
                  🗑️
                </button>
              </td>
            </tr>
            <tr v-if="!extracurriculars || extracurriculars.length === 0">
              <td colspan="5" class="py-8 text-center text-slate-400 text-xs">
                Belum ada data ekstrakurikuler. Tambahkan melalui form di atas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: EDIT EKSTRAKURIKULER & PEMBINA -->
    <div
      v-if="editingEkskul"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div class="flex items-center gap-2">
            <span class="text-xl">✏️</span>
            <div>
              <h3 class="font-extrabold text-sm text-slate-900 dark:text-white">
                Edit Ekstrakurikuler & Pembina
              </h3>
              <p class="text-[11px] text-slate-500">
                Ubah nama kegiatan dan atur pembina yang bertanggung jawab.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
            @click="editingEkskul = null"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="saveEditEkskul" class="p-6 space-y-4 text-xs">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Nama Ekstrakurikuler *
            </label>
            <input
              v-model="editEkskulForm.name"
              type="text"
              required
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Urutan Slot (#)
            </label>
            <input
              v-model="editEkskulForm.orderIndex"
              type="number"
              min="1"
              max="20"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
          </div>

          <!-- Multi Pembina Editor -->
          <div class="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Daftar Pembina ({{ editEkskulForm.leaders.length }} Pembina):
              </label>
            </div>

            <!-- Add Teacher -->
            <div class="flex items-center gap-2">
              <select
                v-model="editEkskulForm.selectedTeacherId"
                class="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="">-- Pilih Guru Sekolah --</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">
                  [{{ t.id }}] {{ t.name }}
                </option>
              </select>
              <button
                type="button"
                @click="addTeacherToEditEkskul"
                class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition whitespace-nowrap cursor-pointer"
              >
                + Guru
              </button>
            </div>

            <!-- Add Custom -->
            <div class="flex items-center gap-2">
              <input
                v-model="editEkskulForm.customLeaderName"
                type="text"
                placeholder="Atau nama pelatih luar..."
                @keydown.enter.prevent="addCustomLeaderToEditEkskul"
                class="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
              <button
                type="button"
                @click="addCustomLeaderToEditEkskul"
                class="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition whitespace-nowrap cursor-pointer"
              >
                + Luar
              </button>
            </div>

            <!-- Active Chips -->
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span
                v-for="(ldr, lIdx) in editEkskulForm.leaders"
                :key="lIdx"
                class="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-semibold"
              >
                <span>👨‍🏫 {{ ldr }}</span>
                <button
                  type="button"
                  @click="removeLeaderFromEditEkskul(lIdx)"
                  class="text-slate-400 hover:text-rose-600 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
              <span v-if="editEkskulForm.leaders.length === 0" class="text-[11px] text-slate-400 italic">
                Belum ada pembina
              </span>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold rounded-xl transition cursor-pointer"
              @click="editingEkskul = null"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TAB 7: AKUN ADMIN -->
    <div v-if="activeTab === 'account'" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white flex items-center justify-center text-lg shadow-sm">
          🔐
        </div>
        <div>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">
            Keamanan Akun Admin
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Ganti password login admin. Diperlukan verifikasi password lama sebelum membuat password baru.
          </p>
        </div>
      </div>

      <div class="max-w-md">
        <form @submit.prevent="changePassword" class="space-y-4 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <!-- Current Password -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Password Lama
            </label>
            <input
              v-model="formPassword.currentPassword"
              type="password"
              placeholder="Masukkan password lama..."
              autocomplete="current-password"
              class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-500 transition"
            />
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Password Baru
            </label>
            <input
              v-model="formPassword.newPassword"
              type="password"
              placeholder="Minimal 6 karakter..."
              autocomplete="new-password"
              class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-500 transition"
            />
          </div>

          <!-- Confirm New Password -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Konfirmasi Password Baru
            </label>
            <input
              v-model="formPassword.confirmPassword"
              type="password"
              placeholder="Ulangi password baru..."
              autocomplete="new-password"
              class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-500 transition"
              :class="formPassword.confirmPassword && formPassword.newPassword !== formPassword.confirmPassword ? 'border-red-400 dark:border-red-600 focus:ring-red-400' : ''"
            />
            <p v-if="formPassword.confirmPassword && formPassword.newPassword !== formPassword.confirmPassword" class="text-[11px] text-red-500 font-semibold mt-1">
              ⚠️ Konfirmasi password tidak cocok
            </p>
          </div>

          <!-- Info box -->
          <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-medium space-y-1">
            <p class="font-bold">📋 Persyaratan Password:</p>
            <ul class="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Minimal 6 karakter</li>
              <li>Masukkan password lama untuk verifikasi</li>
              <li>Password baru dan konfirmasi harus sama</li>
            </ul>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isChangingPassword || !formPassword.currentPassword || !formPassword.newPassword || !formPassword.confirmPassword || formPassword.newPassword !== formPassword.confirmPassword"
            class="w-full px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span v-if="isChangingPassword" class="animate-spin inline-block">⏳</span>
            <span v-else>🔒</span>
            <span>{{ isChangingPassword ? 'Mengubah Password...' : 'Ubah Password' }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL: BULK CREATE GURU & MAPEL -->
    <div
      v-if="showBulkTeacherModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-lg shadow-sm">
              ⚡
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900 dark:text-white">
                Tambah Guru & Mata Pelajaran Massal (Bulk Create)
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Tambahkan banyak guru sekaligus via copy-paste Excel/Spreadsheet atau tabel dinamis.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            @click="showBulkTeacherModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Mode Selector Tabs -->
        <div class="px-6 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            :class="[
              'px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer',
              bulkTeacherTab === 'paste'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            ]"
            @click="bulkTeacherTab = 'paste'"
          >
            <span>📋</span>
            <span>Copy-Paste Teks (Excel / Spreadsheet)</span>
          </button>
          <button
            type="button"
            :class="[
              'px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer',
              bulkTeacherTab === 'table'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            ]"
            @click="bulkTeacherTab = 'table'"
          >
            <span>📝</span>
            <span>Tabel Baris Dinamis (+ Baris)</span>
          </button>
        </div>

        <!-- Modal Scrollable Body -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <!-- TAB 1: PASTE FROM EXCEL -->
          <div v-if="bulkTeacherTab === 'paste'" class="space-y-3">
            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span class="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Format Kolom yang Didukung (Copy langsung kolom di Excel):</span>
                </span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="loadSampleBulkData"
                    class="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 rounded-lg font-bold text-[11px] transition cursor-pointer"
                  >
                    📋 Muat Contoh Data
                  </button>
                  <button
                    v-if="bulkTeacherText"
                    type="button"
                    @click="bulkTeacherText = ''"
                    class="px-2 py-1 text-slate-400 hover:text-rose-600 font-semibold text-[11px] transition cursor-pointer"
                  >
                    ✕ Bersihkan
                  </button>
                </div>
              </div>
              <div class="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div>• Format 4 Kolom: <span class="text-emerald-600 font-bold">[Kode] [Tab] [Nama Guru] [Tab] [Mata Pelajaran] [Tab] [JP]</span></div>
                <div>• Format 3 Kolom: <span class="text-emerald-600 font-bold">[Nama Guru] [Tab] [Mata Pelajaran] [Tab] [JP]</span> (Kode diisi otomatis)</div>
                <div>• Non-Pengajar: Tulis <span class="text-indigo-600 font-bold">(Non-Pengajar)</span> di kolom mapel (mis: Kepala Sekolah / TU).</div>
                <div>• Banyak Mapel: Pisahkan dengan koma di kolom mapel (mis: <span class="text-teal-600 font-bold">Matematika, Fisika Terapan</span>).</div>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Area Paste Data Teks:
              </label>
              <textarea
                v-model="bulkTeacherText"
                rows="6"
                placeholder="Paste kolom dari spreadsheet / excel di sini...&#10;Contoh:&#10;30	Drs. H. Mulyadi, M.Pd	Matematika	4&#10;31	Dewi Sartika, S.Pd	Bahasa Inggris	4&#10;32	Rizal Firmansyah, S.Kom	Pemrograman Web, Basis Data	4&#10;33	Dra. Hj. Nurul Hidayah	(Non-Pengajar)"
                class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
              ></textarea>
            </div>
          </div>

          <!-- TAB 2: MULTI-ROW FORM -->
          <div v-if="bulkTeacherTab === 'table'" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 text-xs">
                Isi form baris di bawah ini. Kode guru boleh dikosongkan jika ingin nomor otomatis.
              </span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="addBulkRow(1)"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs transition cursor-pointer"
                >
                  + 1 Baris
                </button>
                <button
                  type="button"
                  @click="addBulkRow(5)"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs transition cursor-pointer"
                >
                  + 5 Baris
                </button>
                <button
                  type="button"
                  @click="resetBulkRows"
                  class="px-2 py-1 text-slate-400 hover:text-rose-600 font-semibold text-xs transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th class="px-2 py-2 text-center w-8">#</th>
                    <th class="px-2 py-2 w-24">Kode Guru</th>
                    <th class="px-3 py-2">Nama Lengkap & Gelar *</th>
                    <th class="px-3 py-2">Mata Pelajaran (Pisah koma jika > 1)</th>
                    <th class="px-2 py-2 text-center w-16">JP</th>
                    <th class="px-2 py-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  <tr v-for="(row, rIdx) in bulkTeacherRows" :key="rIdx">
                    <td class="px-2 py-1.5 text-center text-slate-400 font-mono text-[11px]">
                      {{ rIdx + 1 }}
                    </td>
                    <td class="px-2 py-1.5">
                      <input
                        v-model="row.id"
                        type="number"
                        placeholder="Otomatis"
                        class="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                      />
                    </td>
                    <td class="px-2 py-1.5">
                      <input
                        v-model="row.name"
                        type="text"
                        placeholder="Contoh: Drs. H. Mulyadi, M.Pd"
                        class="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      />
                    </td>
                    <td class="px-2 py-1.5">
                      <input
                        v-model="row.subjectStr"
                        type="text"
                        placeholder="mis: Matematika atau Web, Basis Data (kosongkan jika non-pengajar)"
                        class="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </td>
                    <td class="px-2 py-1.5">
                      <input
                        v-model="row.targetJp"
                        type="number"
                        min="1"
                        max="40"
                        class="w-full px-1 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                      />
                    </td>
                    <td class="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        @click="removeBulkRow(rIdx)"
                        class="text-slate-400 hover:text-rose-600 p-1 font-bold rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- LIVE PREVIEW & VALIDATION SECTION -->
          <div class="border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 bg-slate-50/80 dark:bg-slate-800/40 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  Hasil Deteksi / Pratinjau
                </span>
                <span
                  v-if="bulkTeachersPreview.length > 0"
                  class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                >
                  {{ bulkTeachersPreview.length }} Guru Terdeteksi
                </span>
              </div>
              <span v-if="!canSaveBulkTeachers && bulkTeachersPreview.length > 0" class="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                <span>⚠️</span>
                <span>Ada kode guru yang bentrok / belum valid</span>
              </span>
            </div>

            <div v-if="bulkTeachersPreview.length === 0" class="py-6 text-center text-slate-400 text-xs">
              Belum ada data guru yang terbaca. Silakan paste teks dari Excel atau isi form baris di atas.
            </div>

            <div v-else class="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th class="px-3 py-2 w-28">Kode Guru</th>
                    <th class="px-4 py-2 w-52">Nama Lengkap</th>
                    <th class="px-4 py-2">Mata Pelajaran yang Dibuat</th>
                    <th class="px-3 py-2 w-32 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr
                    v-for="item in bulkTeachersPreview"
                    :key="item.index"
                    :class="item.hasConflict ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''"
                  >
                    <td class="px-3 py-2 font-mono font-bold">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-md inline-block text-[11px]',
                          item.hasConflict
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                            : item.isAutoId
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                        ]"
                      >
                        {{ item.id }} <span v-if="item.isAutoId" class="text-[9px] font-normal opacity-80">(Auto)</span>
                      </span>
                    </td>
                    <td class="px-4 py-2 font-semibold text-slate-900 dark:text-white">
                      {{ item.name }}
                    </td>
                    <td class="px-4 py-2">
                      <div v-if="item.subjects.length > 0" class="flex flex-wrap gap-1.5">
                        <span
                          v-for="(s, sIdx) in item.subjects"
                          :key="sIdx"
                          class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-md text-[11px] font-medium"
                        >
                          <span class="font-mono font-bold uppercase">{{ String.fromCharCode(97 + sIdx) }}.</span> {{ s.name }} ({{ s.targetJp }} JP)
                        </span>
                      </div>
                      <span v-else class="text-slate-400 italic text-[11px]">
                        (Non-Pengajar / 0 Mapel)
                      </span>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <span
                        v-if="item.hasConflict"
                        class="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 rounded font-bold text-[10px]"
                      >
                        {{ item.conflictMsg }}
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded font-bold text-[10px]"
                      >
                        ✓ Siap
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="bulkError" class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
              ⚠️ {{ bulkError }}
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4">
          <div class="text-xs text-slate-500">
            <span v-if="bulkTeachersPreview.length > 0">
              Total <b>{{ bulkTeachersPreview.length }}</b> guru siap ditambahkan ke database.
            </span>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              @click="showBulkTeacherModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="!canSaveBulkTeachers || isBulkSaving"
              @click="saveBulkTeachers"
              class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span v-if="isBulkSaving" class="animate-spin">⏳</span>
              <span v-else>⚡</span>
              <span>Simpan Semua Guru ({{ bulkTeachersPreview.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
