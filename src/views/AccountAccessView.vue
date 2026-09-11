<template>
  <main class="access-screen">
    <section class="access-card">
      <div class="brand-mark">GM</div>
      <h1>{{ heading }}</h1>

      <div v-if="sessionStore.isLoading" class="status-copy">Sprawdzanie dostępu…</div>

      <template v-else-if="sessionStore.needsEmailVerification">
        <p>Potwierdź adres <strong>{{ sessionStore.authUser?.email }}</strong> w otrzymanej wiadomości, a następnie wróć do otwartej aplikacji.</p>
        <button class="primary-button" type="button" :disabled="isBusy" @click="checkVerification">Sprawdź potwierdzenie</button>
        <button class="secondary-button" type="button" :disabled="isBusy || resendCooldownSeconds > 0" @click="sendVerification">{{ resendVerificationLabel }}</button>
        <button class="secondary-button" type="button" :disabled="isBusy" @click="openEmailChangeModal">Zmień adres e-mail</button>
      </template>

      <template v-else-if="sessionStore.accessRevoked">
        <p>Dostęp do tej restauracji został zablokowany.</p>
        <p class="hint">Skontaktuj się z managerem, aby ponownie uzyskać dostęp.</p>
      </template>

      <template v-else-if="sessionStore.deviceApprovalRequired">
        <p>To urządzenie nie ma dostępu do aplikacji. Poproś administratora o dostęp do aplikacji.</p>
        <button class="secondary-button" type="button" :disabled="isBusy" @click="returnToLogin">Wróć</button>
      </template>

      <template v-else-if="sessionStore.requiresRestaurantSelection">
        <p>To konto należy do kilku restauracji. Wybierz restaurację, z którą chcesz teraz pracować.</p>
        <button v-for="membership in sessionStore.memberships" :key="membership.restaurantId" class="restaurant-button" type="button" @click="chooseRestaurant(membership.restaurantId)">
          <strong>{{ membership.restaurantName || membership.restaurantId }}</strong>
          <small>{{ membership.role === 'owner' ? 'Właściciel' : 'Pracownik' }}</small>
        </button>
      </template>

      <template v-else-if="!sessionStore.currentMembership">
        <p v-if="sessionStore.error" class="error-message">{{ sessionStore.error }}</p>
        <p v-else class="hint">To konto nie ma aktywnego dostępu. Otwórz link zaproszenia otrzymany od managera.</p>
      </template>

      <template v-else-if="sessionStore.needsLocalPinSetup">
        <p>Ustaw czterocyfrowy PIN dla tego urządzenia. PIN jest zapisany wyłącznie na tym urządzeniu.</p>
        <label class="pin-field"><span>Wpisz PIN</span><input v-model="pin" class="pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
        <label class="pin-field"><span>Powtórz PIN</span><input v-model="pinConfirmation" class="pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"></label>
        <button class="primary-button" type="button" :disabled="isBusy || pin.length !== 4 || pin !== pinConfirmation" @click="configurePin">Zapisz PIN na tym urządzeniu</button>
      </template>

      <template v-else>
        <p>Dostęp do restauracji <strong>{{ sessionStore.currentRestaurant?.name || sessionStore.currentRestaurantId }}</strong> jest gotowy.</p>
        <template v-if="sessionStore.memberships.length > 1">
          <p class="hint">Możesz przełączyć konto do innej restauracji.</p>
          <button v-for="membership in otherMemberships" :key="membership.restaurantId" class="restaurant-button" type="button" :disabled="isBusy" @click="chooseRestaurant(membership.restaurantId)">
            <strong>{{ membership.restaurantName || membership.restaurantId }}</strong>
            <small>{{ membership.role === 'owner' ? 'Właściciel' : 'Pracownik' }}</small>
          </button>
        </template>
        <button class="primary-button" type="button" @click="continueToApp">Przejdź do aplikacji</button>
      </template>

      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <button v-if="showLogoutDeviceButton" class="logout-button" type="button" :disabled="isBusy" @click="logoutDevice">Wyloguj to urządzenie</button>
    </section>

    <div v-if="isEmailChangeModalOpen" class="dialog-overlay" role="presentation" @click.self="closeEmailChangeModal">
      <section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="email-change-title">
        <h2 id="email-change-title">Zmień adres e-mail</h2>
        <label>
          <span>Aktualny adres</span>
          <input :value="sessionStore.authUser?.email || ''" type="email" readonly>
        </label>
        <label>
          <span>Nowy adres e-mail</span>
          <input v-model="emailChangeForm.newEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none">
        </label>
        <label>
          <span>Obecne hasło</span>
          <input v-model="emailChangeForm.currentPassword" type="password" autocomplete="current-password">
        </label>
        <p v-if="emailChangeError" class="error-message">{{ emailChangeError }}</p>
        <div class="dialog-actions">
          <button class="secondary-button" type="button" :disabled="isEmailChangePending" @click="closeEmailChangeModal">Anuluj</button>
          <button class="primary-button" type="button" :disabled="isEmailChangePending || !emailChangeForm.newEmail.trim() || !emailChangeForm.currentPassword" @click="submitEmailChange">Wyślij potwierdzenie</button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase.js'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'
import {
  buildEmailChangeActionCodeSettings,
  getAccountEmailChangeErrorMessage,
  requestVerifiedAccountEmailChange
} from '../utils/accountEmailChange.js'
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  getVerificationResendSeconds
} from '../utils/emailActionHandler.js'

const router = useRouter()
const sessionStore = useAccountSessionStore()
const pin = ref('')
const pinConfirmation = ref('')
const isBusy = ref(false)
const message = ref('')
const errorMessage = ref('')
const isEmailChangeModalOpen = ref(false)
const isEmailChangePending = ref(false)
const emailChangeError = ref('')
const emailChangeForm = ref({
  newEmail: '',
  currentPassword: ''
})
const resendAvailableAt = ref(0)
const resendCooldownSeconds = ref(0)
let resendCooldownTimer = null

const heading = computed(() => {
  if (sessionStore.needsEmailVerification) return 'Potwierdź e-mail'
  if (sessionStore.deviceApprovalRequired) return 'Urządzenie niezatwierdzone'
  if (sessionStore.needsLocalPinSetup) return 'Ustaw lokalny PIN'
  if (sessionStore.requiresRestaurantSelection) return 'Wybierz restaurację'
  if (sessionStore.accessRevoked) return 'Dostęp zablokowany'
  return 'Dostęp do restauracji'
})
const showLogoutDeviceButton = computed(() => (
  !sessionStore.needsEmailVerification &&
  !sessionStore.deviceApprovalRequired &&
  !sessionStore.needsLocalPinSetup
))
const resendVerificationLabel = computed(() => (
  resendCooldownSeconds.value > 0
    ? `Wyślij wiadomość ponownie (${resendCooldownSeconds.value} s)`
    : 'Wyślij wiadomość ponownie'
))
const otherMemberships = computed(() => sessionStore.memberships.filter(
  membership => (
    membership.restaurantId !== sessionStore.currentRestaurantId
  )
))

const runAction = async action => {
  isBusy.value = true
  errorMessage.value = ''
  message.value = ''
  try {
    await action()
  } catch (error) {
    console.error(
      'Błąd obsługi konta:',
      error?.code || error?.message || 'account/action-failed'
    )
    errorMessage.value = error?.message || 'Nie udało się wykonać operacji.'
  } finally {
    isBusy.value = false
  }
}

const updateResendCooldown = () => {
  resendCooldownSeconds.value = getVerificationResendSeconds({
    availableAt: resendAvailableAt.value
  })
  if (resendCooldownSeconds.value === 0 && resendCooldownTimer) {
    clearInterval(resendCooldownTimer)
    resendCooldownTimer = null
  }
}

const startResendCooldown = () => {
  clearInterval(resendCooldownTimer)
  resendAvailableAt.value = Date.now() +
    EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
  updateResendCooldown()
  resendCooldownTimer = setInterval(updateResendCooldown, 1000)
}

const sendVerification = () => {
  if (resendCooldownSeconds.value > 0) return
  startResendCooldown()
  return runAction(async () => {
    if (!auth.currentUser) return
    auth.languageCode = 'pl'
    await sendEmailVerification(auth.currentUser)
    message.value = 'Wysłaliśmy wiadomość weryfikacyjną.'
  })
}

const checkVerification = () => runAction(async () => {
  const verified = await sessionStore.refreshAfterEmailVerification()
  if (!verified) errorMessage.value = 'Adres e-mail nie jest jeszcze potwierdzony.'
})

const clearEmailChangeForm = () => {
  emailChangeForm.value.newEmail = ''
  emailChangeForm.value.currentPassword = ''
  emailChangeError.value = ''
}

const openEmailChangeModal = () => {
  clearEmailChangeForm()
  isEmailChangeModalOpen.value = true
}

const closeEmailChangeModal = () => {
  if (isEmailChangePending.value) return
  clearEmailChangeForm()
  isEmailChangeModalOpen.value = false
}

const submitEmailChange = async () => {
  isEmailChangePending.value = true
  emailChangeError.value = ''
  message.value = ''
  errorMessage.value = ''
  try {
    await requestVerifiedAccountEmailChange({
      user: auth.currentUser,
      currentPassword: emailChangeForm.value.currentPassword,
      newEmail: emailChangeForm.value.newEmail,
      authInstance: auth,
      actionCodeSettings: buildEmailChangeActionCodeSettings()
    })
    isEmailChangeModalOpen.value = false
    emailChangeForm.value.newEmail = ''
    message.value = 'Wysłaliśmy link potwierdzający na nowy adres. E-mail konta zmieni się dopiero po kliknięciu linku.'
  } catch (error) {
    console.error(
      'Błąd żądania zmiany e-maila:',
      error?.code || 'account/email-change-failed'
    )
    emailChangeError.value = getAccountEmailChangeErrorMessage(error)
  } finally {
    emailChangeForm.value.currentPassword = ''
    isEmailChangePending.value = false
  }
}

const chooseRestaurant = restaurantId => runAction(async () => {
  await sessionStore.selectRestaurant(restaurantId)
  if (!sessionStore.needsLocalPinSetup) await router.replace('/')
})

const configurePin = () => runAction(async () => {
  await sessionStore.configureLocalPin(pin.value)
  pin.value = ''
  pinConfirmation.value = ''
  await router.replace('/')
})

const continueToApp = () => router.replace('/')
const returnToLogin = () => runAction(async () => {
  await sessionStore.logoutCurrentDevice()
  await router.replace('/login')
})
const logoutDevice = () => runAction(async () => {
  const confirmed = window.confirm(
    'Odłączyć to urządzenie? Lokalny PIN zostanie usunięty i kolejne użycie będzie wymagało ponownego zatwierdzenia urządzenia.'
  )
  if (!confirmed) return
  await sessionStore.logoutCurrentDevice()
  await router.replace('/login')
})

onMounted(async () => {
  if (!auth.currentUser) return

  if (
    auth.currentUser.emailVerified === false ||
    sessionStore.needsEmailVerification
  ) {
    const verified = await sessionStore.refreshAfterEmailVerification()
    if (verified) {
      message.value = 'Adres e-mail został potwierdzony.'
      return
    }
  }

  if (!sessionStore.isInitialized) {
    await sessionStore.initializeForUser(auth.currentUser)
  }
})
onUnmounted(() => clearInterval(resendCooldownTimer))
</script>

<style scoped>
.access-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.access-card { display: grid; width: min(420px, 100%); box-sizing: border-box; gap: 13px; padding: 26px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15,23,42,.1); }
.brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: #fff; background: #007aff; font-size: 14px; font-weight: 900; }
.access-card h1 { margin: 0; color: #111827; font-size: 24px; }
.access-card p { margin: 0; color: #475569; font-size: 14px; line-height: 1.5; }
.access-card .hint { color: #64748b; font-size: 13px; }
.primary-button, .secondary-button, .restaurant-button, .logout-button { min-height: 48px; box-sizing: border-box; padding: 11px 14px; border-radius: 13px; font-size: 15px; font-weight: 800; }
.primary-button { border: 0; color: #fff; background: #007aff; }
.secondary-button { border: 1px solid #bfdbfe; color: #1d4ed8; background: #eff6ff; }
.restaurant-button { display: grid; gap: 4px; border: 1px solid #dbeafe; color: #1e3a8a; background: #f8fbff; text-align: left; }
.restaurant-button small { color: #64748b; }
.logout-button { margin-top: 6px; border: 0; color: #dc2626; background: transparent; }
button:disabled { opacity: .48; }
.pin-field { display: grid; gap: 7px; color: #475569; font-size: 13px; font-weight: 800; }
.pin-input { width: 100%; min-height: 54px; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 13px; color: #111827; background: #fff; font-size: 25px; font-weight: 800; letter-spacing: .3em; text-align: center; }
.pin-input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; caret-color: #007aff; }
.success-message { color: #166534 !important; }
.error-message { color: #b91c1c !important; }
.status-copy { padding: 20px; color: #64748b; text-align: center; }
.dialog-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; box-sizing: border-box; padding: 18px; background: rgba(15, 23, 42, .42); }
.dialog-card { display: grid; width: min(420px, 100%); max-height: calc(100dvh - 36px); box-sizing: border-box; gap: 14px; overflow: auto; padding: 22px; border-radius: 20px; background: #fff; box-shadow: 0 22px 55px rgba(15, 23, 42, .22); }
.dialog-card h2 { margin: 0; color: #111827; font-size: 21px; }.dialog-card label { display: grid; gap: 7px; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; }.dialog-card input { width: 100%; min-height: 48px; box-sizing: border-box; padding: 12px 13px; border: 1px solid #cbd5e1; border-radius: 12px; color: #111827; background: #fff; font-size: 16px; text-transform: none; }.dialog-card input[readonly] { color: #64748b; background: #f8fafc; }.dialog-card input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; caret-color: #007aff; }
.dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
@media (max-width: 380px) { .dialog-actions { grid-template-columns: 1fr; }.dialog-actions .primary-button { order: -1; } }
</style>
