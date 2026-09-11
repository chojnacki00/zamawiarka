<template>
  <main class="email-action-screen">
    <section class="email-action-card">
      <div class="brand-mark">GM</div>

      <p v-if="status === 'loading'" class="status-copy">Sprawdzanie linku…</p>

      <template v-else-if="status === 'ready' || status === 'submitting'">
        <h1>{{ presentation.heading }}</h1>
        <p>{{ presentation.message }}</p>

        <template v-if="action?.mode === EMAIL_ACTION_MODES.RESET_PASSWORD">
          <label>
            <span>Nowe hasło</span>
            <input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              :disabled="status === 'submitting'"
              @input="passwordError = ''"
            >
          </label>
          <label>
            <span>Powtórz nowe hasło</span>
            <input
              v-model="passwordConfirmation"
              type="password"
              autocomplete="new-password"
              :disabled="status === 'submitting'"
              @input="passwordError = ''"
            >
          </label>
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
        </template>

        <button
          class="primary-button"
          type="button"
          :disabled="status === 'submitting'"
          @click="confirmAction"
        >{{ status === 'submitting' ? 'Zapisywanie…' : presentation.button }}</button>
      </template>

      <template v-else-if="status === 'success'">
        <h1>{{ presentation.successHeading }}</h1>
        <p>{{ presentation.successMessage }}</p>
      </template>

      <template v-else>
        <h1>{{ errorHeading }}</h1>
        <p class="error-message">{{ errorMessage }}</p>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '../firebase.js'
import {
  completeEmailAction,
  EMAIL_ACTION_MODES,
  getEmailActionErrorState,
  inspectEmailAction
} from '../utils/emailActionHandler.js'

const PRESENTATIONS = Object.freeze({
  [EMAIL_ACTION_MODES.VERIFY_EMAIL]: {
    heading: 'Potwierdź adres e-mail',
    message: 'Kliknij poniżej, aby potwierdzić swój adres e-mail.',
    button: 'Potwierdź adres',
    successHeading: 'Adres e-mail został potwierdzony',
    successMessage: 'Możesz zamknąć tę kartę i wrócić do otwartej aplikacji GastroManager.'
  },
  [EMAIL_ACTION_MODES.RESET_PASSWORD]: {
    heading: 'Ustaw nowe hasło',
    message: 'Wpisz nowe hasło do konta GastroManager.',
    button: 'Zapisz nowe hasło',
    successHeading: 'Hasło zostało zmienione',
    successMessage: 'Możesz zamknąć tę kartę i wrócić do aplikacji GastroManager.'
  },
  [EMAIL_ACTION_MODES.VERIFY_AND_CHANGE_EMAIL]: {
    heading: 'Potwierdź zmianę adresu e-mail',
    message: 'Kliknij poniżej, aby potwierdzić zmianę adresu e-mail.',
    button: 'Potwierdź zmianę',
    successHeading: 'Adres e-mail został zmieniony',
    successMessage: 'Możesz zamknąć tę kartę i wrócić do otwartej aplikacji GastroManager.'
  },
  [EMAIL_ACTION_MODES.RECOVER_EMAIL]: {
    heading: 'Cofnij zmianę adresu e-mail',
    message: 'Jeżeli nie zmieniałeś adresu e-mail, możesz przywrócić poprzedni adres.',
    button: 'Przywróć poprzedni adres',
    successHeading: 'Poprzedni adres e-mail został przywrócony',
    successMessage: 'Ze względów bezpieczeństwa zalecamy również zmianę hasła do konta.'
  }
})

const route = useRoute()
const status = ref('loading')
const action = ref(null)
const errorHeading = ref('')
const errorMessage = ref('')
const newPassword = ref('')
const passwordConfirmation = ref('')
const passwordError = ref('')

const presentation = computed(() => (
  PRESENTATIONS[action.value?.mode] || {}
))

const clearPasswords = () => {
  newPassword.value = ''
  passwordConfirmation.value = ''
}

const setError = error => {
  const state = getEmailActionErrorState(error)
  status.value = state.status
  errorHeading.value = state.heading
  errorMessage.value = state.message
  passwordError.value = state.fieldMessage
  if (state.status !== 'ready') {
    action.value = null
    clearPasswords()
  }
}

const confirmAction = async () => {
  if (status.value !== 'ready' || !action.value) return
  status.value = 'submitting'
  passwordError.value = ''

  try {
    await completeEmailAction({
      authInstance: auth,
      action: action.value,
      newPassword: newPassword.value,
      passwordConfirmation: passwordConfirmation.value
    })
    action.value = {
      mode: action.value.mode,
      oobCode: ''
    }
    clearPasswords()
    status.value = 'success'
  } catch (error) {
    clearPasswords()
    setError(error)
  }
}

onMounted(async () => {
  try {
    action.value = await inspectEmailAction({
      authInstance: auth,
      query: route.query,
      expectedApiKey: auth.app.options.apiKey
    })
    status.value = 'ready'
  } catch (error) {
    setError(error)
  }
})
</script>

<style scoped>
.email-action-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.email-action-card { display: grid; width: min(420px, 100%); box-sizing: border-box; gap: 15px; padding: 26px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15, 23, 42, .1); }
.brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: #fff; background: #007aff; font-size: 14px; font-weight: 900; }
h1, p { margin: 0; }
h1 { color: #111827; font-size: 24px; }
p { color: #475569; font-size: 14px; line-height: 1.5; }
label { display: grid; gap: 7px; color: #64748b; font-size: 12px; font-weight: 750; text-transform: uppercase; }
input { min-height: 48px; box-sizing: border-box; padding: 12px 13px; border: 1px solid #cbd5e1; border-radius: 12px; color: #111827; background: #fff; font-size: 16px; text-transform: none; }
input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; caret-color: #007aff; }
.primary-button { min-height: 49px; box-sizing: border-box; padding: 11px 14px; border: 0; border-radius: 13px; color: #fff; background: #007aff; font-size: 15px; font-weight: 800; }
.primary-button:disabled, input:disabled { opacity: .48; }
.error-message, .field-error { color: #b91c1c; }
.field-error { font-size: 13px; }
.status-copy { padding: 18px 0; text-align: center; }
</style>
