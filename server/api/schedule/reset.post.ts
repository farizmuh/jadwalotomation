import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export default defineEventHandler(async () => {
  try {
    await execAsync('node prisma/seed.js')
    return {
      success: true,
      message: 'Berhasil mereset dan memulihkan seluruh jadwal asli dari template SMKS Islam Donomulyo!'
    }
  } catch (error: any) {
    console.error('Error resetting schedule:', error)
    return {
      success: false,
      error: error.message || 'Gagal reset data jadwal'
    }
  }
})
