<script setup lang="ts">
definePageMeta({
  layout: false
})

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

async function handleLogin() {
  errorMessage.value = ''

  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Username dan password wajib diisi'
    return
  }

  isLoading.value = true
  try {
    const res: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: username.value.trim(),
        password: password.value
      }
    })

    if (res.success) {
      navigateTo('/')
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Login gagal, periksa username dan password'
  } finally {
    isLoading.value = false
  }
}

// Check if already authenticated
onMounted(async () => {
  try {
    const res: any = await $fetch('/api/auth/me')
    if (res.authenticated) {
      navigateTo('/')
    }
  } catch {
    // Not authenticated, stay on login page
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-4 py-8">
    <!-- Decorative Background Elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />
    </div>

    <!-- Login Card -->
    <div class="relative w-full max-w-md">
      <!-- Logo & Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 mb-5">
          <span class="font-black text-2xl tracking-tight">SMK</span>
        </div>
        <h1 class="text-2xl font-extrabold text-white mb-2">
          Login Admin
        </h1>
        <p class="text-sm text-slate-400">
          Sistem Jadwal Pelajaran — SMKS Islam Donomulyo
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-3"
        >
          <span class="text-lg flex-shrink-0">⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username Field -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-semibold text-slate-300">
              Username
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">👤</span>
              <input
                id="username"
                v-model="username"
                type="text"
                autocomplete="username"
                placeholder="Masukkan username"
                class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold text-slate-300">
              Password
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔒</span>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Masukkan password"
                class="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm transition"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <span v-if="isLoading" class="animate-spin text-base">⏳</span>
            <span v-else class="text-base">🚀</span>
            <span>{{ isLoading ? 'Sedang Masuk...' : 'Masuk ke Sistem' }}</span>
          </button>
        </form>

        <!-- Separator -->
        <div class="mt-6 pt-6 border-t border-white/5">
          <p class="text-center text-xs text-slate-500">
            Hanya admin yang bisa mengubah data jadwal.
            <br />
            Jadwal dapat dilihat publik tanpa login.
          </p>
        </div>
      </div>

      <!-- Back to Schedule Link -->
      <div class="mt-6 text-center">
        <NuxtLink
          to="/"
          class="text-sm text-slate-400 hover:text-emerald-400 font-medium transition inline-flex items-center gap-2"
        >
          <span>←</span>
          <span>Lihat Jadwal (Tanpa Login)</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
