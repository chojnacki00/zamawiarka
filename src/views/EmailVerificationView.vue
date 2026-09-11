<template>
  <main class="verification-screen">
    <section class="verification-card">
      <div class="brand-mark">GM</div>

      <p v-if="status === 'loading'" class="status-copy">Sprawdzanie linku…</p>

      <template v-else-if="status === 'ready' || status === 'submitting'">
        <h1>Potwierdź adres e-mail</h1>
        <p>Kliknij poniżej, aby potwierdzić swój adres e-mail.</p>
        <button
          class="primary-button"
          type="button"
          :disabled="status === 'submitting'"
          @click="confirmEmail"
        >{{ status === 'submitting' ? 'Potwierdzanie…' : 'Potwierdź adres' }}</button>
      </template>

      <template v-else-if="status === 'success'">
        <h1>Adres e-mail został potwierdzony</h1>
        <p>Możesz zamknąć tę kartę i wrócić do otwartej aplikacji GastroManager.</p>
      </template>

      <template v-else>
        <h1>Nie udało się potwierdzić adresu</h1>
        <p class="error-message">{{ errorMessage }}</p>
      </template>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '../firebase.js'
import {
  confirmEmailVerification,
  getEmailVerificationErrorMessage,
  parseEmailVerificationAction
} from '../utils/emailVerificationAction.js'

const route = useRoute()
const status = ref('loading')
const errorMessage = ref('')
const actionCode = ref('')

const setError = error => {
  console.warn(
    'Nie udało się obsłużyć potwierdzenia e-maila:',
    error?.code || 'email-verification/failed'
  )
  errorMessage.value = getEmailVerificationErrorMessage(error)
  status.value = 'error'
}

const confirmEmail = async () => {
  if (status.value !== 'ready') return
  status.value = 'submitting'
  try {
    await confirmEmailVerification({
      authInstance: auth,
      oobCode: actionCode.value
    })
    actionCode.value = ''
    status.value = 'success'
  } catch (error) {
    actionCode.value = ''
    setError(error)
  }
}

onMounted(() => {
  try {
    const action = parseEmailVerificationAction({
      query: route.query,
      expectedApiKey: auth.app.options.apiKey
    })
    actionCode.value = action.oobCode
    status.value = 'ready'
  } catch (error) {
    setError(error)
  }
})
</script>

<style scoped>
.verification-screen { min-height: 100dvh; display: grid; box-sizing: border-box; place-items: center; padding: 20px; background: #f5f5f7; }
.verification-card { display: grid; width: min(420px, 100%); box-sizing: border-box; gap: 15px; padding: 26px 22px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 18px 45px rgba(15, 23, 42, .1); }
.brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: #fff; background: #007aff; font-size: 14px; font-weight: 900; }
h1, p { margin: 0; }
h1 { color: #111827; font-size: 24px; }
p { color: #475569; font-size: 14px; line-height: 1.5; }
.primary-button { min-height: 49px; box-sizing: border-box; padding: 11px 14px; border: 0; border-radius: 13px; color: #fff; background: #007aff; font-size: 15px; font-weight: 800; }
.primary-button:disabled { opacity: .48; }
.error-message { color: #b91c1c; }
.status-copy { padding: 18px 0; text-align: center; }
</style>
