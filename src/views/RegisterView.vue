<template>
  <main class="account-screen">
    <form class="account-card" @submit.prevent="registerAccount">
      <button class="back-button" type="button" @click="router.push('/login')">←</button>
      <h1>Aktywuj konto</h1>
      <p>Użyj adresu e-mail, na który manager przygotował zaproszenie.</p>

      <label><span>Imię i nazwisko</span><input v-model="form.displayName" type="text" autocomplete="name"></label>
      <label><span>E-mail</span><input v-model="form.email" type="email" autocomplete="email" autocapitalize="none"></label>
      <label><span>Hasło</span><input v-model="form.password" type="password" autocomplete="new-password"></label>
      <label><span>Powtórz hasło</span><input v-model="form.passwordConfirmation" type="password" autocomplete="new-password"></label>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSaving">{{ isSaving ? 'Tworzenie konta…' : 'Utwórz konto' }}</button>
    </form>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth'
import { auth, authPersistenceReady } from '../firebase.js'
import { isValidAccountEmail } from '../utils/employeeIdentity.js'

const router = useRouter()
const isSaving = ref(false)
const errorMessage = ref('')
const form = ref({ displayName: '', email: '', password: '', passwordConfirmation: '' })

const registerAccount = async () => {
  const email = String(form.value.email || '').trim().toLowerCase()
  const password = String(form.value.password || '')
  errorMessage.value = ''

  if (!isValidAccountEmail(email)) {
    errorMessage.value = 'Wpisz prawidłowy adres e-mail.'
    return
  }
  if (password.length < 8) {
    errorMessage.value = 'Hasło musi mieć co najmniej 8 znaków.'
    return
  }
  if (password !== form.value.passwordConfirmation) {
    errorMessage.value = 'Wpisane hasła nie są takie same.'
    return
  }

  isSaving.value = true
  try {
    await authPersistenceReady
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const displayName = String(form.value.displayName || '').trim()
    if (displayName) await updateProfile(credential.user, { displayName })
    await sendEmailVerification(credential.user, { url: `${window.location.origin}/konto` })
    await router.replace('/konto')
  } catch (error) {
    console.error(
      'Błąd tworzenia konta:',
      error?.code || 'auth/registration-failed'
    )
    errorMessage.value = error?.code === 'auth/email-already-in-use'
      ? 'Konto z tym adresem już istnieje. Zaloguj się.'
      : 'Nie udało się utworzyć konta. Spróbuj ponownie.'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.account-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.account-card { position: relative; display: grid; width: min(420px, 100%); box-sizing: border-box; gap: 15px; padding: 28px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15,23,42,.1); }
.account-card h1 { margin: 0; color: #111827; font-size: 25px; }
.account-card > p { margin: -6px 0 4px; color: #64748b; font-size: 14px; line-height: 1.5; }
.account-card label { display: grid; gap: 7px; color: #64748b; font-size: 12px; font-weight: 750; text-transform: uppercase; }
.account-card input { min-height: 48px; box-sizing: border-box; padding: 12px 13px; border: 1px solid #cbd5e1; border-radius: 12px; color: #111827; background: #fff; font-size: 16px; text-transform: none; }
.account-card input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; }
.back-button { justify-self: start; padding: 4px 8px; border: 0; color: #007aff; background: transparent; font-size: 23px; }
.primary-button { min-height: 50px; border: 0; border-radius: 13px; color: #fff; background: #007aff; font-size: 16px; font-weight: 800; }
.primary-button:disabled { opacity: .5; }
.error-message { margin: 0 !important; color: #b91c1c !important; }
</style>
