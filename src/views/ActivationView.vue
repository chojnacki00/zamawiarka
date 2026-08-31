<template>
  <main class="activation-screen">
    <section class="activation-card">
      <div class="brand-mark">GM</div>
      <h1>Aktywacja dostępu</h1>

      <p v-if="isLoading" class="status">Sprawdzanie zaproszenia…</p>

      <template v-else-if="invitation">
        <div class="invitation-summary">
          <strong>{{ invitation.restaurantNameSnapshot }}</strong>
          <span>E-mail: {{ invitation.maskedEmail }}</span>
          <span>Ważne do: {{ formatDate(invitation.expiresAt) }}</span>
        </div>

        <template v-if="step === 'email'">
          <p>Wpisz pełny adres e-mail przypisany do zaproszenia.</p>
          <label><span>E-mail</span><input v-model="email" type="email" autocomplete="email" autocapitalize="none"></label>
          <button class="primary-button" type="button" :disabled="isBusy || !email" @click="checkEmail">Dalej</button>
        </template>

        <template v-else-if="step === 'register'">
          <p>Utwórz konto GastroManager. Po rejestracji Firebase wyśle wiadomość potwierdzającą e-mail.</p>
          <label><span>Hasło</span><input v-model="password" type="password" autocomplete="new-password"></label>
          <label><span>Powtórz hasło</span><input v-model="passwordConfirmation" type="password" autocomplete="new-password"></label>
          <button class="primary-button" type="button" :disabled="isBusy" @click="register">Utwórz konto</button>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="step = 'login'">Mam już konto</button>
        </template>

        <template v-else-if="step === 'login'">
          <p>Zaloguj się istniejącym kontem przypisanym do tego zaproszenia.</p>
          <label><span>Hasło</span><input v-model="password" type="password" autocomplete="current-password"></label>
          <button class="primary-button" type="button" :disabled="isBusy" @click="login">Zaloguj się</button>
          <button v-if="invitation.purpose === purposes.ACCOUNT_ACTIVATION" class="secondary-button" type="button" :disabled="isBusy" @click="step = 'register'">Nie mam konta</button>
        </template>

        <template v-else-if="step === 'verify'">
          <p>Potwierdź adres <strong>{{ email }}</strong> w wiadomości wysłanej przez Firebase, a następnie wróć do tego linku.</p>
          <button class="primary-button" type="button" :disabled="isBusy" @click="checkVerification">Sprawdź potwierdzenie</button>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="resendVerification">Wyślij ponownie</button>
        </template>

        <template v-else-if="step === 'device'">
          <p>Nazwij urządzenie, które ma otrzymać dostęp do tej restauracji.</p>
          <label><span>Nazwa urządzenia</span><input v-model="deviceName" type="text" autocomplete="off" maxlength="80"></label>
          <button class="primary-button" type="button" :disabled="isBusy || !deviceName.trim()" @click="activate">Zatwierdź urządzenie</button>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="changeAccount">Użyj innego konta</button>
        </template>
      </template>

      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, authPersistenceReady, db } from '../firebase.js'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'
import { buildAccountReturnUrl } from '../config/publicAppUrl.js'
import {
  assertEmailMatchesPublicInvitation,
  assertPublicInvitationIsActive,
  hashIdentityValue,
  INVITATION_PURPOSES
} from '../utils/identityInvitations.js'
import { suggestDeviceName } from '../utils/deviceAccess.js'

const route = useRoute()
const router = useRouter()
const sessionStore = useAccountSessionStore()
const purposes = INVITATION_PURPOSES
const token = String(route.query.t || '').trim()
const invitation = ref(null)
const isLoading = ref(true)
const isBusy = ref(false)
const errorMessage = ref('')
const message = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const deviceName = ref(suggestDeviceName())
const step = ref('email')

const formatDate = value => {
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime())
    ? 'brak daty'
    : date.toLocaleString('pl-PL')
}

const getActivationErrorMessage = error => {
  const code = String(error?.code || '')
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Nieprawidłowy e-mail lub hasło.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'
  }
  if (
    code.includes('permission-denied') ||
    code.includes('unavailable') ||
    code.includes('network')
  ) {
    return 'Nie udało się potwierdzić zaproszenia. Odśwież widok i spróbuj ponownie.'
  }
  const message = String(error?.message || '')
  return message && !message.includes('Firebase')
    ? message
    : 'Nie udało się wykonać operacji. Spróbuj ponownie.'
}

const runAction = async action => {
  isBusy.value = true
  errorMessage.value = ''
  message.value = ''
  try {
    await action()
  } catch (error) {
    console.error('Błąd aktywacji:', error?.code || error?.message || 'activation/failed')
    errorMessage.value = getActivationErrorMessage(error)
  } finally {
    isBusy.value = false
  }
}

const loadInvitation = async () => {
  if (!token) throw new Error('Link aktywacyjny jest nieprawidłowy.')
  const tokenHash = await hashIdentityValue(token)
  const snapshot = await getDoc(doc(db, 'activationInvitations', tokenHash))
  if (!snapshot.exists()) {
    throw new Error('Link jest nieważny, anulowany albo został już wykorzystany.')
  }
  const data = snapshot.data()
  assertPublicInvitationIsActive({ invitation: data })
  invitation.value = data
}

const checkEmail = () => runAction(async () => {
  await assertEmailMatchesPublicInvitation({
    email: email.value,
    invitation: invitation.value
  })
  email.value = email.value.trim().toLowerCase()
  if (invitation.value.purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT) {
    step.value = 'login'
    return
  }
  const methods = await fetchSignInMethodsForEmail(auth, email.value)
  step.value = methods.length ? 'login' : 'register'
})

const afterAuthentication = async user => {
  await user.reload()
  if (!user.emailVerified) {
    step.value = 'verify'
    return
  }
  await user.getIdToken(true)
  step.value = 'device'
}

const register = () => runAction(async () => {
  if (password.value.length < 8) throw new Error('Hasło musi mieć co najmniej 8 znaków.')
  if (password.value !== passwordConfirmation.value) throw new Error('Wpisane hasła nie są takie same.')
  await authPersistenceReady
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    await sendEmailVerification(credential.user, { url: buildAccountReturnUrl() })
    step.value = 'verify'
    message.value = 'Wysłaliśmy wiadomość weryfikacyjną Firebase.'
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      step.value = 'login'
      throw new Error('Konto z tym adresem już istnieje. Zaloguj się.')
    }
    throw error
  }
})

const login = () => runAction(async () => {
  await authPersistenceReady
  const credential = await signInWithEmailAndPassword(auth, email.value, password.value)
  await afterAuthentication(credential.user)
})

const resendVerification = () => runAction(async () => {
  if (!auth.currentUser) throw new Error('Najpierw zaloguj się ponownie.')
  await sendEmailVerification(auth.currentUser, { url: buildAccountReturnUrl() })
  message.value = 'Wiadomość weryfikacyjna została wysłana ponownie.'
})

const checkVerification = () => runAction(async () => {
  if (!auth.currentUser) throw new Error('Najpierw zaloguj się ponownie.')
  await afterAuthentication(auth.currentUser)
  if (step.value === 'verify') throw new Error('Adres e-mail nie jest jeszcze potwierdzony.')
})

const activate = () => runAction(async () => {
  await sessionStore.acceptIdentityInvitation({
    token,
    deviceName: deviceName.value.trim()
  })
  message.value = 'Urządzenie zostało zatwierdzone.'
  await router.replace('/konto')
})

const changeAccount = () => runAction(async () => {
  await signOut(auth)
  password.value = ''
  step.value = 'email'
})

onMounted(async () => {
  try {
    await loadInvitation()
    if (auth.currentUser) {
      email.value = auth.currentUser.email || ''
      await assertEmailMatchesPublicInvitation({
        email: email.value,
        invitation: invitation.value
      })
      await afterAuthentication(auth.currentUser)
    }
  } catch (error) {
    errorMessage.value = error?.message || 'Nie udało się odczytać zaproszenia.'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.activation-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.activation-card { display: grid; width: min(430px, 100%); box-sizing: border-box; gap: 14px; padding: 26px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15,23,42,.1); }
.brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: #fff; background: #007aff; font-weight: 900; }
h1, p { margin: 0; } h1 { color: #111827; font-size: 25px; } p { color: #475569; font-size: 14px; line-height: 1.5; }
.invitation-summary { display: grid; gap: 5px; padding: 14px; border-radius: 14px; background: #f0f9ff; color: #475569; font-size: 13px; }.invitation-summary strong { color: #0f172a; font-size: 16px; }
label { display: grid; gap: 7px; color: #64748b; font-size: 12px; font-weight: 750; text-transform: uppercase; } input { min-height: 48px; box-sizing: border-box; padding: 12px 13px; border: 1px solid #cbd5e1; border-radius: 12px; color: #111827; background: #fff; font-size: 16px; text-transform: none; } input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; caret-color: #007aff; }
.primary-button, .secondary-button { min-height: 49px; border-radius: 13px; font-size: 15px; font-weight: 800; }.primary-button { border: 0; color: #fff; background: #007aff; }.secondary-button { border: 1px solid #bfdbfe; color: #1d4ed8; background: #eff6ff; } button:disabled { opacity: .48; }
.error-message { color: #b91c1c; }.success-message { color: #166534; }.status { padding: 24px 0; text-align: center; }
</style>
