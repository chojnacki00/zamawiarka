<template>
  <div class="login-screen">
    <form
      class="login-card"
      @submit.prevent="handleLogin"
      autocomplete="on"
    >
      <h1 class="login-title">GastroManager</h1>
      <div class="login-subtitle">Zaloguj się do swojej restauracji</div>

      <div class="supplier-form-group" style="margin-top:20px;">
        <label class="supplier-form-label" for="login-email">E-mail</label>
        <input
          id="login-email"
          v-model="authForm.email"
          type="email"
          class="login-input"
          placeholder="Wpisz e-mail"
          name="email"
          autocomplete="username"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
      </div>

      <div class="supplier-form-group">
        <label class="supplier-form-label" for="login-password">Hasło</label>
        <input
          id="login-password"
          v-model="authForm.password"
          type="password"
          class="login-input"
          placeholder="Wpisz hasło"
          name="password"
          autocomplete="current-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
      </div>

      <div
        v-if="authError"
        style="margin-top:10px; font-size:14px; color:#dc2626; font-weight:600;"
      >
        {{ authError }}
      </div>

      <button
        class="login-button"
        type="submit"
        :disabled="isLoggingIn"
        :class="{ 'login-button-loading': isLoggingIn }"
      >
        <span v-if="!isLoggingIn">Zaloguj</span>
        <span v-else class="login-button-content">
          <span class="login-spinner"></span>
          <span>Logowanie...</span>
        </span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'

const router = useRouter()

const authForm = ref({
  email: '',
  password: ''
})

const authError = ref('')
const isLoggingIn = ref(false)

const handleLogin = async () => {
  const email = String(authForm.value.email || '').trim().toLowerCase()
  const password = String(authForm.value.password || '').trim()

  authError.value = ''

  if (!email) {
    authError.value = 'Wpisz e-mail'
    return
  }

  if (!password) {
    authError.value = 'Wpisz hasło'
    return
  }

  isLoggingIn.value = true

  try {
    await signInWithEmailAndPassword(auth, email, password)
    router.push('/')
  } catch (error) {
    console.error('Firebase login error:', error.message)
    authError.value = 'Nieprawidłowy e-mail lub hasło'
  } finally {
    isLoggingIn.value = false
  }
}
</script>