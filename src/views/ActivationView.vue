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
          <span>{{ invitationPurposeLabel }}</span>
        </div>

        <template v-if="step === 'email'">
          <p>Wpisz pełny adres e-mail przypisany do zaproszenia.</p>
          <label><span>E-mail</span><input v-model="email" type="email" autocomplete="email" autocapitalize="none"></label>
          <button class="primary-button" type="button" :disabled="isBusy || !email" @click="checkEmail">Dalej</button>
        </template>

        <template v-else-if="step === 'register'">
          <p>Utwórz konto GastroManager. Po rejestracji Firebase wyśle wiadomość potwierdzającą e-mail.</p>
          <label><span>Hasło</span><input v-model="password" type="password" autocomplete="new-password" @input="passwordError = ''"></label>
          <label><span>Powtórz hasło</span><input v-model="passwordConfirmation" type="password" autocomplete="new-password" @input="passwordError = ''"></label>
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
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
          <h2>Potwierdź adres e-mail</h2>
          <p>Potwierdź adres <strong>{{ email }}</strong> w wiadomości wysłanej przez Firebase, a następnie wróć do tego linku.</p>
          <p v-if="useFirebaseEmulators" class="emulator-hint">W Emulatorze link weryfikacyjny znajdziesz w Emulator UI, w sekcji Authentication.</p>
          <button class="primary-button" type="button" :disabled="isBusy" @click="checkVerification">Sprawdź potwierdzenie</button>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="resendVerification">Wyślij wiadomość ponownie</button>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="changeAccount">Wyloguj i wróć</button>
        </template>

        <template v-else-if="step === 'account-mismatch'">
          <p>Zalogowane konto ma inny adres e-mail niż ten przypisany do zaproszenia.</p>
          <button class="secondary-button" type="button" :disabled="isBusy" @click="changeAccount">Wyloguj i wróć</button>
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
      <button
        v-if="loadErrorKind === 'technical'"
        class="secondary-button"
        type="button"
        :disabled="isLoading"
        @click="initializeActivation"
      >Spróbuj ponownie</button>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, authPersistenceReady, db, useFirebaseEmulators } from '../firebase.js'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'
import { buildActivationUrl } from '../config/publicAppUrl.js'
import {
  buildInvitationForEmailValidation,
  classifyActivationInvitationError,
  createActivationFlowError,
  resolveActivationStepForUser,
  validateActivationPasswords
} from '../utils/activationFlow.js'
import {
  assertEmailMatchesPublicInvitation,
  buildSafePublicInvitationPreview,
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
const invitationEmailHash = ref('')
const isLoading = ref(true)
const isBusy = ref(false)
const errorMessage = ref('')
const message = ref('')
const loadErrorKind = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const passwordError = ref('')
const deviceName = ref(suggestDeviceName())
const step = ref('email')
const invitationPurposeLabel = computed(() => (
  invitation.value?.purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT
    ? 'Zaproszenie dotyczy dodania kolejnego urządzenia.'
    : 'Zaproszenie dotyczy aktywacji konta pracownika.'
))

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
  if (!token) throw createActivationFlowError('activation/missing-token')
  const tokenHash = await hashIdentityValue(token)
  const snapshot = await getDoc(doc(db, 'activationInvitations', tokenHash))
  if (!snapshot.exists()) {
    throw createActivationFlowError('activation/invitation-not-found')
  }
  const publicInvitation = snapshot.data()
  invitationEmailHash.value = String(publicInvitation.emailHash || '')
  if (invitationEmailHash.value.length !== 64) {
    throw createActivationFlowError('activation/invitation-invalid')
  }
  try {
    invitation.value = buildSafePublicInvitationPreview({
      invitation: publicInvitation
    })
  } catch {
    throw createActivationFlowError('activation/invitation-invalid')
  }
}

const getInvitationForEmailValidation = () => (
  buildInvitationForEmailValidation({
    invitation: invitation.value,
    emailHash: invitationEmailHash.value
  })
)

const checkEmail = () => runAction(async () => {
  await assertEmailMatchesPublicInvitation({
    email: email.value,
    invitation: getInvitationForEmailValidation()
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
  step.value = resolveActivationStepForUser(user)
  if (step.value === 'device') await user.getIdToken(true)
}

const register = () => {
  passwordError.value = validateActivationPasswords({
    password: password.value,
    confirmation: passwordConfirmation.value
  })
  if (passwordError.value) return

  return runAction(async () => {
    await authPersistenceReady
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )
      step.value = 'verify'
      password.value = ''
      passwordConfirmation.value = ''
      await sendEmailVerification(credential.user, {
        url: buildActivationUrl({ token })
      })
      message.value = 'Wysłaliśmy wiadomość weryfikacyjną Firebase.'
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') {
        step.value = 'login'
        throw new Error('Konto z tym adresem już istnieje. Zaloguj się.')
      }
      throw error
    }
  })
}

const login = () => runAction(async () => {
  await authPersistenceReady
  const credential = await signInWithEmailAndPassword(auth, email.value, password.value)
  await afterAuthentication(credential.user)
})

const resendVerification = () => runAction(async () => {
  if (!auth.currentUser) throw new Error('Najpierw zaloguj się ponownie.')
  await sendEmailVerification(auth.currentUser, {
    url: buildActivationUrl({ token })
  })
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
  passwordConfirmation.value = ''
  passwordError.value = ''
  email.value = ''
  step.value = 'email'
})

const initializeActivation = async () => {
  isLoading.value = true
  errorMessage.value = ''
  message.value = ''
  loadErrorKind.value = ''
  invitation.value = null
  invitationEmailHash.value = ''

  try {
    await loadInvitation()
  } catch (error) {
    const state = classifyActivationInvitationError(error)
    console.warn(
      'Nie udało się odczytać publicznego zaproszenia:',
      error?.code || 'activation/load-failed'
    )
    loadErrorKind.value = state.kind
    errorMessage.value = state.message
    isLoading.value = false
    return
  }

  if (auth.currentUser) {
    email.value = auth.currentUser.email || ''
    try {
      await assertEmailMatchesPublicInvitation({
        email: email.value,
        invitation: getInvitationForEmailValidation()
      })
    } catch (error) {
      console.warn(
        'Zalogowane konto nie pasuje do zaproszenia:',
        error?.code || 'activation/email-mismatch'
      )
      step.value = 'account-mismatch'
      isLoading.value = false
      return
    }

    try {
      await afterAuthentication(auth.currentUser)
    } catch (error) {
      console.warn(
        'Nie udało się odświeżyć stanu konta podczas aktywacji:',
        error?.code || 'activation/account-refresh-failed'
      )
      loadErrorKind.value = 'technical'
      errorMessage.value = getActivationErrorMessage(error)
    }
  }

  isLoading.value = false
}

onMounted(initializeActivation)
</script>

<style scoped>
.activation-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.activation-card { display: grid; width: min(430px, 100%); box-sizing: border-box; gap: 14px; padding: 26px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15,23,42,.1); }
.brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: #fff; background: #007aff; font-weight: 900; }
h1, h2, p { margin: 0; } h1 { color: #111827; font-size: 25px; } h2 { color: #111827; font-size: 19px; } p { color: #475569; font-size: 14px; line-height: 1.5; }
.invitation-summary { display: grid; gap: 5px; padding: 14px; border-radius: 14px; background: #f0f9ff; color: #475569; font-size: 13px; }.invitation-summary strong { color: #0f172a; font-size: 16px; }
label { display: grid; gap: 7px; color: #64748b; font-size: 12px; font-weight: 750; text-transform: uppercase; } input { min-height: 48px; box-sizing: border-box; padding: 12px 13px; border: 1px solid #cbd5e1; border-radius: 12px; color: #111827; background: #fff; font-size: 16px; text-transform: none; } input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; caret-color: #007aff; }
.primary-button, .secondary-button { min-height: 49px; border-radius: 13px; font-size: 15px; font-weight: 800; }.primary-button { border: 0; color: #fff; background: #007aff; }.secondary-button { border: 1px solid #bfdbfe; color: #1d4ed8; background: #eff6ff; } button:disabled { opacity: .48; }
.error-message, .field-error { color: #b91c1c; }.field-error { font-size: 13px; }.success-message { color: #166534; }.status { padding: 24px 0; text-align: center; }.emulator-hint { padding: 10px 12px; border-radius: 11px; background: #fff7ed; color: #9a3412; }
</style>
