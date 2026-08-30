<template>
  <main class="access-screen">
    <section class="access-card">
      <div class="brand-mark">GM</div>
      <h1>{{ heading }}</h1>

      <div v-if="sessionStore.isLoading" class="status-copy">Sprawdzanie dostępu…</div>

      <template v-else-if="sessionStore.needsEmailVerification">
        <p>Potwierdź adres <strong>{{ sessionStore.authUser?.email }}</strong>, a następnie wróć tutaj.</p>
        <button class="primary-button" type="button" :disabled="isBusy" @click="checkVerification">Sprawdź potwierdzenie</button>
        <button class="secondary-button" type="button" :disabled="isBusy" @click="sendVerification">Wyślij wiadomość ponownie</button>
      </template>

      <template v-else-if="sessionStore.accessRevoked">
        <p>{{ sessionStore.error || 'Dostęp do restauracji został zablokowany.' }}</p>
        <p class="hint">Aktywna sesja Firebase nie daje dostępu do danych zablokowanej restauracji.</p>
      </template>

      <template v-else-if="sessionStore.isPinLocked">
        <p>Sesja Firebase jest aktywna. Podaj lokalny PIN tego urządzenia, aby odblokować aplikację.</p>
        <input v-model="pin" class="pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="Lokalny PIN">
        <button class="primary-button" type="button" :disabled="isBusy || pin.length !== 4" @click="unlock">Odblokuj</button>
      </template>

      <template v-else-if="sessionStore.requiresRestaurantSelection">
        <p>To konto należy do kilku restauracji. Wybierz restaurację, z którą chcesz teraz pracować.</p>
        <button v-for="membership in sessionStore.memberships" :key="membership.restaurantId" class="restaurant-button" type="button" @click="chooseRestaurant(membership.restaurantId)">
          <strong>{{ membership.restaurantName || membership.restaurantId }}</strong>
          <small>{{ membership.role === 'owner' ? 'Właściciel' : 'Pracownik' }}</small>
        </button>
      </template>

      <template v-else-if="sessionStore.pendingInvitations.length">
        <p>Wybierz zaproszenie, które chcesz przyjąć.</p>
        <button v-for="invitation in sessionStore.pendingInvitations" :key="invitation.id" class="restaurant-button" type="button" :disabled="isBusy" @click="accept(invitation)">
          <strong>Zaproszenie do restauracji</strong>
          <small>{{ invitation.restaurantId }}</small>
        </button>
      </template>

      <template v-else-if="!sessionStore.currentMembership">
        <p class="hint">Nie znaleziono aktywnego zaproszenia dla tego adresu. Poproś managera o przygotowanie zaproszenia.</p>
      </template>

      <template v-else-if="sessionStore.needsLocalPinSetup">
        <p>Ustaw czterocyfrowy PIN tylko dla tego urządzenia. PIN nie zostanie wysłany do Firebase.</p>
        <input v-model="pin" class="pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" aria-label="Nowy lokalny PIN">
        <input v-model="pinConfirmation" class="pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" aria-label="Powtórz lokalny PIN">
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
      <button class="logout-button" type="button" :disabled="isBusy" @click="logoutDevice">Wyloguj to urządzenie</button>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase.js'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'

const router = useRouter()
const sessionStore = useAccountSessionStore()
const pin = ref('')
const pinConfirmation = ref('')
const isBusy = ref(false)
const message = ref('')
const errorMessage = ref('')

const heading = computed(() => {
  if (sessionStore.needsEmailVerification) return 'Potwierdź e-mail'
  if (sessionStore.isPinLocked) return 'Aplikacja zablokowana'
  if (sessionStore.needsLocalPinSetup) return 'Ustaw lokalny PIN'
  if (sessionStore.requiresRestaurantSelection) return 'Wybierz restaurację'
  if (sessionStore.accessRevoked) return 'Dostęp zablokowany'
  return 'Dostęp do restauracji'
})
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

const sendVerification = () => runAction(async () => {
  if (!auth.currentUser) return
  await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/konto` })
  message.value = 'Wiadomość weryfikacyjna została wysłana.'
})

const checkVerification = () => runAction(async () => {
  const verified = await sessionStore.refreshAfterEmailVerification()
  if (!verified) errorMessage.value = 'Adres e-mail nie jest jeszcze potwierdzony.'
})

const accept = invitation => runAction(() => sessionStore.acceptInvitation(invitation))
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

const unlock = () => runAction(async () => {
  const result = await sessionStore.unlockWithLocalPin(pin.value)
  if (!result.ok) {
    errorMessage.value = result.blocked
      ? `Spróbuj ponownie za ${Math.ceil(result.retryAfterMs / 1000)} s.`
      : 'Nieprawidłowy PIN.'
    pin.value = ''
    return
  }
  pin.value = ''
  await router.replace('/')
})

const continueToApp = () => router.replace('/')
const logoutDevice = () => runAction(async () => {
  await sessionStore.logoutCurrentDevice()
  await router.replace('/login')
})

onMounted(async () => {
  if (auth.currentUser && !sessionStore.isInitialized) {
    await sessionStore.initializeForUser(auth.currentUser)
  }
})
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
.pin-input { width: 100%; min-height: 54px; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 13px; color: #111827; background: #fff; font-size: 25px; font-weight: 800; letter-spacing: .3em; text-align: center; }
.pin-input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; caret-color: #007aff; }
.success-message { color: #166534 !important; }
.error-message { color: #b91c1c !important; }
.status-copy { padding: 20px; color: #64748b; text-align: center; }
</style>
