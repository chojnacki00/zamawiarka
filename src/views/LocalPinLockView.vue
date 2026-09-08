<template>
  <main class="pin-lock-screen">
    <section class="pin-lock-card" aria-labelledby="pin-lock-title">
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

      <button
        class="disconnect-button"
        type="button"
        :disabled="isBusy"
        @click="disconnectCurrentDevice"
      >
        Odłącz urządzenie
      </button>
    </section>
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
  isBusy.value || retrySeconds.value > 0 || accessIsBlocked.value
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

const disconnectCurrentDevice = async () => {
  const confirmed = window.confirm(
    'Odłączyć to urządzenie? Lokalny PIN zostanie usunięty i kolejne użycie będzie wymagało ponownego zatwierdzenia urządzenia.'
  )
  if (!confirmed) return

  isBusy.value = true
  pin.value = ''
  try {
    await sessionStore.logoutCurrentDevice()
    await router.replace('/login')
  } catch (error) {
    console.error(
      'Nie udało się odłączyć bieżącego urządzenia:',
      error?.code || 'local-pin/disconnect-failed'
    )
    errorMessage.value = 'Nie udało się odłączyć urządzenia. Spróbuj ponownie.'
  } finally {
    isBusy.value = false
  }
}

const handleKeyboard = event => {
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
.pin-lock-card { display: grid; width: min(390px, 100%); box-sizing: border-box; justify-items: center; padding: 28px 22px 24px; border: 1px solid rgba(148, 163, 184, .26); border-radius: 26px; background: rgba(255, 255, 255, .96); box-shadow: 0 22px 55px rgba(15, 23, 42, .12); }
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
.disconnect-button { min-height: 44px; margin-top: 20px; padding: 9px 14px; border: 0; color: #b91c1c; background: transparent; font-size: 14px; font-weight: 800; cursor: pointer; }
.disconnect-button:active:not(:disabled) { opacity: .65; }
.disconnect-button:focus-visible { outline: 3px solid rgba(185, 28, 28, .2); outline-offset: 2px; border-radius: 10px; }
.disconnect-button:disabled { opacity: .4; cursor: default; }
@media (max-height: 670px) {
  .pin-lock-screen { align-items: start; padding-top: 10px; }
  .pin-lock-card { padding-top: 18px; padding-bottom: 18px; }
  .brand-mark { width: 45px; height: 45px; border-radius: 13px; }
  .pin-dots { margin-top: 18px; margin-bottom: 13px; }
  .pin-message { margin-bottom: 12px; }
  .pin-key { height: 55px; }
}
</style>
