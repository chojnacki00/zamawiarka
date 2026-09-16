<template>
  <main class="pin-lock-screen">
    <section class="pin-lock-card" aria-labelledby="pin-lock-title">
      <button
        class="device-settings-button"
        type="button"
        :disabled="isBusy"
        aria-label="Ustawienia urządzenia"
        title="Ustawienia urządzenia"
        @click="isSettingsOpen = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.24.66 1.82.33h0c.6-.2 1-.8 1-1.51V3a2 2 0 1 1 4 0v.09c0 .7.4 1.31 1 1.51.58.33 1.32.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.5.5-.66 1.24-.33 1.82.2.6.8 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.31.4-1.51 1z"/>
        </svg>
      </button>

      <div class="brand-mark" aria-hidden="true">GM</div>
      <p class="app-name">GastroManager</p>
      <h1 id="pin-lock-title">Wpisz 4-cyfrowy PIN</h1>
      <p v-if="displayName" class="employee-name">{{ displayName }}</p>

      <div
        class="pin-dots"
        role="status"
        :aria-label="`Wpisano ${pin.length} z 4 cyfr PIN-u`"
      >
        <span
          v-for="index in 4"
          :key="index"
          :class="{ filled: pin.length >= index }"
        ></span>
      </div>

      <p v-if="errorMessage" class="pin-message error-message" role="alert">
        {{ errorMessage }}
      </p>
      <p v-else class="pin-message" aria-live="polite">
        {{ isBusy ? 'Sprawdzanie…' : 'PIN działa tylko na tym urządzeniu.' }}
      </p>

      <div class="pin-keypad" aria-label="Klawiatura PIN">
        <button
          v-for="digit in digits"
          :key="digit"
          class="pin-key"
          type="button"
          :disabled="keypadDisabled"
          :aria-label="`Cyfra ${digit}`"
          @click="addDigit(digit)"
        >
          {{ digit }}
        </button>
        <button
          class="pin-key pin-key-secondary"
          type="button"
          :disabled="keypadDisabled || !pin"
          aria-label="Usuń ostatnią cyfrę"
          @click="removeDigit"
        >
          ⌫
        </button>
        <button
          class="pin-key"
          type="button"
          :disabled="keypadDisabled"
          aria-label="Cyfra 0"
          @click="addDigit(0)"
        >
          0
        </button>
        <button
          class="pin-key pin-key-submit"
          type="button"
          :disabled="keypadDisabled || pin.length !== 4"
          aria-label="Odblokuj aplikację"
          @click="submitPin"
        >
          ➜
        </button>
      </div>

    </section>

    <div
      v-if="isSettingsOpen"
      class="device-settings-overlay"
      @click.self="closeSettings"
    >
      <aside
        class="device-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-settings-title"
      >
        <header>
          <h2 id="device-settings-title">Ustawienia urządzenia</h2>
          <button
            class="panel-close-button"
            type="button"
            aria-label="Zamknij ustawienia urządzenia"
            @click="closeSettings"
          >×</button>
        </header>
        <button
          class="settings-disconnect-button"
          type="button"
          @click="openDisconnectConfirmation"
        >
          Odłącz urządzenie
        </button>
      </aside>
    </div>

    <div
      v-if="isDisconnectConfirmationOpen"
      class="disconnect-dialog-overlay"
      @click.self="closeDisconnectConfirmation"
    >
      <section
        class="disconnect-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disconnect-dialog-title"
        aria-describedby="disconnect-dialog-description"
      >
        <h2 id="disconnect-dialog-title">Odłączyć urządzenie?</h2>
        <p id="disconnect-dialog-description">
          Lokalny PIN zostanie usunięty, a urządzenie zniknie z listy urządzeń
          pracownika. Ponowne korzystanie z aplikacji na tym urządzeniu będzie
          wymagało nowego zaproszenia od managera.
        </p>
        <p v-if="disconnectError" class="disconnect-error" role="alert">
          {{ disconnectError }}
        </p>
        <div class="disconnect-dialog-actions">
          <button
            type="button"
            :disabled="isBusy"
            @click="closeDisconnectConfirmation"
          >Anuluj</button>
          <button
            class="confirm-disconnect-button"
            type="button"
            :disabled="isBusy"
            @click="confirmDisconnectCurrentDevice"
          >{{ isBusy ? 'Odłączanie…' : 'Odłącz urządzenie' }}</button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountSessionStore } from '../stores/accountSessionStore.js'
import {
  appendLocalPinDigit,
  getLocalPinAccessMessage,
  LOCAL_PIN_ACCESS_FAILURES,
  removeLocalPinDigit
} from '../utils/localPinAccess.js'

const router = useRouter()
const sessionStore = useAccountSessionStore()
const digits = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9])
const pin = ref('')
const isBusy = ref(false)
const isSettingsOpen = ref(false)
const isDisconnectConfirmationOpen = ref(false)
const disconnectError = ref('')
const errorMessage = ref('')
const retryUntil = ref(0)
const retrySeconds = ref(0)
let retryTimer = null

const displayName = computed(() => sessionStore.pinLockDisplayName)
const accessIsBlocked = computed(() => Boolean(
  sessionStore.pinAccessFailure &&
  sessionStore.pinAccessFailure !== LOCAL_PIN_ACCESS_FAILURES.LOCAL_PIN_MISMATCH
))
const keypadDisabled = computed(() => (
  isBusy.value ||
  isSettingsOpen.value ||
  isDisconnectConfirmationOpen.value ||
  retrySeconds.value > 0 ||
  accessIsBlocked.value
))

const clearRetryTimer = () => {
  if (retryTimer) clearInterval(retryTimer)
  retryTimer = null
}

const updateRetryCounter = () => {
  retrySeconds.value = Math.max(
    0,
    Math.ceil((retryUntil.value - Date.now()) / 1000)
  )
  if (retrySeconds.value === 0) {
    clearRetryTimer()
    errorMessage.value = ''
  } else {
    errorMessage.value = `Spróbuj ponownie za ${retrySeconds.value} s.`
  }
}

const startRetryCounter = retryAfterMs => {
  clearRetryTimer()
  retryUntil.value = Date.now() + Math.max(0, Number(retryAfterMs) || 0)
  updateRetryCounter()
  retryTimer = setInterval(updateRetryCounter, 250)
}

const addDigit = digit => {
  if (keypadDisabled.value) return
  errorMessage.value = ''
  pin.value = appendLocalPinDigit(pin.value, digit)
}

const removeDigit = () => {
  if (keypadDisabled.value) return
  errorMessage.value = ''
  pin.value = removeLocalPinDigit(pin.value)
}

const submitPin = async () => {
  if (keypadDisabled.value || pin.value.length !== 4) return

  isBusy.value = true
  errorMessage.value = ''
  try {
    const result = await sessionStore.unlockWithLocalPin(pin.value)
    pin.value = ''

    if (result.ok) {
      await router.replace('/')
      return
    }

    if (result.blocked) {
      startRetryCounter(result.retryAfterMs)
      return
    }

    if (result.reason) {
      errorMessage.value = getLocalPinAccessMessage(result.reason)
      if (!sessionStore.isPinLocked) await router.replace('/konto')
      return
    }

    errorMessage.value = result.missing
      ? 'Na tym urządzeniu nie znaleziono lokalnego PIN-u.'
      : 'Nieprawidłowy PIN.'
  } catch (error) {
    pin.value = ''
    console.error(
      'Nie udało się odblokować aplikacji:',
      error?.code || 'local-pin/unlock-failed'
    )
    errorMessage.value = 'Nie udało się odblokować aplikacji. Spróbuj ponownie.'
  } finally {
    isBusy.value = false
  }
}

const closeSettings = () => {
  if (isBusy.value) return
  isSettingsOpen.value = false
}

const openDisconnectConfirmation = () => {
  isSettingsOpen.value = false
  disconnectError.value = ''
  isDisconnectConfirmationOpen.value = true
}

const closeDisconnectConfirmation = () => {
  if (isBusy.value) return
  disconnectError.value = ''
  isDisconnectConfirmationOpen.value = false
}

const confirmDisconnectCurrentDevice = async () => {
  if (isBusy.value || !isDisconnectConfirmationOpen.value) return

  isBusy.value = true
  pin.value = ''
  disconnectError.value = ''
  try {
    await sessionStore.disconnectCurrentDevice()
    isDisconnectConfirmationOpen.value = false
    await router.replace('/login')
  } catch (error) {
    console.error(
      'Nie udało się odłączyć bieżącego urządzenia:',
      error?.code || 'local-pin/disconnect-failed'
    )
    disconnectError.value =
      'Nie udało się odłączyć urządzenia. Spróbuj ponownie.'
  } finally {
    isBusy.value = false
  }
}

const handleKeyboard = event => {
  if (event.key === 'Escape') {
    if (isDisconnectConfirmationOpen.value) {
      event.preventDefault()
      closeDisconnectConfirmation()
    } else if (isSettingsOpen.value) {
      event.preventDefault()
      closeSettings()
    }
    return
  }
  if (isSettingsOpen.value || isDisconnectConfirmationOpen.value) return
  if (/^\d$/.test(event.key)) {
    event.preventDefault()
    addDigit(event.key)
    return
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    removeDigit()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    void submitPin()
  }
}

onMounted(() => {
  if (sessionStore.pinAccessFailure) {
    errorMessage.value = getLocalPinAccessMessage(
      sessionStore.pinAccessFailure
    )
  }
  window.addEventListener('keydown', handleKeyboard)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboard)
  clearRetryTimer()
  pin.value = ''
})
</script>

<style scoped>
.pin-lock-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 18px; background: linear-gradient(180deg, #f5f8fc 0%, #eef2f7 100%); }
.pin-lock-card { position: relative; display: grid; width: min(390px, 100%); box-sizing: border-box; justify-items: center; padding: 28px 22px 24px; border: 1px solid rgba(148, 163, 184, .26); border-radius: 26px; background: rgba(255, 255, 255, .96); box-shadow: 0 22px 55px rgba(15, 23, 42, .12); }
.device-settings-button { position: absolute; top: 12px; right: 12px; display: grid; width: 46px; height: 46px; place-items: center; padding: 0; border: 0; border-radius: 50%; color: #64748b; background: transparent; cursor: pointer; touch-action: manipulation; }
.device-settings-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.device-settings-button:active:not(:disabled) { color: #0f172a; background: #eef2f7; transform: scale(.95); }
.device-settings-button:focus-visible, .panel-close-button:focus-visible, .settings-disconnect-button:focus-visible, .disconnect-dialog-actions button:focus-visible { outline: 3px solid rgba(0, 122, 255, .28); outline-offset: 2px; }
.device-settings-button:disabled { opacity: .4; }
.brand-mark { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 16px; color: #fff; background: #007aff; font-size: 15px; font-weight: 900; box-shadow: 0 8px 20px rgba(0, 122, 255, .24); }
.app-name { margin: 12px 0 0; color: #64748b; font-size: 13px; font-weight: 800; letter-spacing: .04em; }
h1 { margin: 8px 0 0; color: #111827; font-size: clamp(22px, 7vw, 28px); line-height: 1.2; text-align: center; }
.employee-name { margin: 7px 0 0; color: #475569; font-size: 15px; font-weight: 700; text-align: center; }
.pin-dots { display: flex; justify-content: center; gap: 16px; min-height: 22px; margin: 27px 0 18px; }
.pin-dots span { width: 17px; height: 17px; box-sizing: border-box; border: 2px solid #cbd5e1; border-radius: 50%; background: #fff; transition: transform .12s ease, border-color .12s ease, background .12s ease; }
.pin-dots span.filled { border-color: #007aff; background: #007aff; transform: scale(1.08); }
.pin-message { min-height: 21px; margin: 0 0 18px; color: #64748b; font-size: 13px; line-height: 1.45; text-align: center; }
.error-message { color: #b91c1c; font-weight: 700; }
.pin-keypad { display: grid; width: min(300px, 100%); grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pin-key { display: grid; min-width: 0; height: clamp(60px, 17vw, 72px); place-items: center; padding: 0; border: 1px solid #d8e0ea; border-radius: 19px; color: #111827; background: #fff; box-shadow: 0 5px 13px rgba(15, 23, 42, .07); font-size: 24px; font-weight: 800; cursor: pointer; touch-action: manipulation; transition: transform .1s ease, background .1s ease, box-shadow .1s ease; }
.pin-key:active:not(:disabled) { background: #eef5ff; box-shadow: 0 2px 7px rgba(15, 23, 42, .08); transform: scale(.95); }
.pin-key:focus-visible { outline: 3px solid rgba(0, 122, 255, .28); outline-offset: 2px; }
.pin-key-secondary { color: #475569; background: #f8fafc; font-size: 22px; }
.pin-key-submit { border-color: #007aff; color: #fff; background: #007aff; }
.pin-key:disabled { opacity: .4; cursor: default; }
.device-settings-overlay, .disconnect-dialog-overlay { position: fixed; z-index: 5000; inset: 0; display: flex; box-sizing: border-box; padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom)); background: rgba(15, 23, 42, .3); }
.device-settings-overlay { align-items: flex-start; justify-content: flex-end; }
.device-settings-panel { width: min(360px, 100%); box-sizing: border-box; padding: 17px; border: 1px solid rgba(148, 163, 184, .3); border-radius: 20px; background: #fff; box-shadow: 0 20px 50px rgba(15, 23, 42, .2); }
.device-settings-panel header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.device-settings-panel h2, .disconnect-dialog h2 { margin: 0; color: #111827; font-size: 19px; }
.panel-close-button { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; padding: 0; border: 0; border-radius: 50%; color: #fff; background: #ef4444; font-size: 25px; line-height: 1; cursor: pointer; }
.settings-disconnect-button { width: 100%; min-height: 48px; margin-top: 16px; padding: 11px 14px; border: 1px solid #fecaca; border-radius: 13px; color: #b91c1c; background: #fff1f2; font-size: 15px; font-weight: 800; text-align: left; cursor: pointer; }
.disconnect-dialog-overlay { align-items: center; justify-content: center; }
.disconnect-dialog { width: min(420px, 100%); box-sizing: border-box; padding: 22px; border-radius: 22px; background: #fff; box-shadow: 0 24px 65px rgba(15, 23, 42, .25); }
.disconnect-dialog p { margin: 13px 0 0; color: #475569; font-size: 14px; line-height: 1.55; }
.disconnect-dialog .disconnect-error { color: #b91c1c; font-weight: 700; }
.disconnect-dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 24px; }
.disconnect-dialog-actions button { min-height: 48px; padding: 10px 12px; border: 0; border-radius: 13px; color: #334155; background: #e2e8f0; font-size: 14px; font-weight: 800; cursor: pointer; }
.disconnect-dialog-actions .confirm-disconnect-button { color: #fff; background: #dc2626; }
.disconnect-dialog-actions button:disabled { opacity: .55; cursor: default; }
@media (max-height: 670px) {
  .pin-lock-screen { align-items: start; padding-top: 10px; }
  .pin-lock-card { padding-top: 18px; padding-bottom: 18px; }
  .brand-mark { width: 45px; height: 45px; border-radius: 13px; }
  .pin-dots { margin-top: 18px; margin-bottom: 13px; }
  .pin-message { margin-bottom: 12px; }
  .pin-key { height: 55px; }
}
</style>
