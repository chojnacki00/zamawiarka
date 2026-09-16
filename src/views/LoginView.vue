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

      <button
        class="login-link-button"
        type="button"
        :disabled="isLoggingIn"
        @click="handlePasswordReset"
      >
        Nie pamiętasz hasła?
      </button>

      <button
        class="login-link-button primary"
        type="button"
        @click="router.push('/rejestracja')"
      >
        Aktywuj konto pracownika
      </button>

      <p v-if="authMessage" class="login-message">{{ authMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, authPersistenceReady } from '../firebase.js'
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from 'firebase/auth'

const router = useRouter()

const authForm = ref({
  email: '',
  password: ''
})

const authError = ref('')
const authMessage = ref('')
const isLoggingIn = ref(false)

const handleLogin = async () => {
  const email = String(authForm.value.email || '').trim().toLowerCase()
  const password = String(authForm.value.password || '').trim()

  authError.value = ''
  authMessage.value = ''

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
    await authPersistenceReady
    await signInWithEmailAndPassword(auth, email, password)
    router.push('/konto')
  } catch (error) {
    console.error('Firebase login error:', error?.code || 'auth/login-failed')
    authError.value = 'Nieprawidłowy e-mail lub hasło'
  } finally {
    isLoggingIn.value = false
  }
}

const handlePasswordReset = async () => {
  const email = String(authForm.value.email || '').trim().toLowerCase()
  authError.value = ''
  authMessage.value = ''

  if (!email) {
    authError.value = 'Wpisz e-mail, na który wysłać instrukcję.'
    return
  }

  isLoggingIn.value = true
  try {
    await authPersistenceReady
    await sendPasswordResetEmail(auth, email)
    authMessage.value =
      'Jeżeli konto istnieje, instrukcja zmiany hasła została wysłana.'
  } catch (error) {
    console.error(
      'Błąd wysyłania resetu hasła:',
      error?.code || 'auth/reset-failed'
    )
    authMessage.value =
      'Jeżeli konto istnieje, instrukcja zmiany hasła została wysłana.'
  } finally {
    isLoggingIn.value = false
  }
}
</script>

<style scoped>
.login-link-button {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  border: 0;
  color: #64748b;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
}
.login-link-button.primary { color: #007aff; }
.login-message {
  margin: 14px 0 0;
  color: #166534;
  font-size: 13px;
  line-height: 1.45;
}
</style>
