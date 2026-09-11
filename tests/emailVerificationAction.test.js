import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  confirmEmailVerification,
  EMAIL_VERIFICATION_INVALID_MESSAGE,
  EMAIL_VERIFICATION_UNSUPPORTED_MESSAGE,
  getEmailVerificationErrorMessage,
  getVerificationResendSeconds,
  parseEmailVerificationAction
} from '../src/utils/emailVerificationAction.js'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('handler przyjmuje wyłącznie kod verifyEmail dla bieżącego projektu', () => {
  assert.deepEqual(parseEmailVerificationAction({
    query: {
      mode: 'verifyEmail',
      oobCode: 'jednorazowy-kod',
      apiKey: 'demo-api-key'
    },
    expectedApiKey: 'demo-api-key'
  }), { oobCode: 'jednorazowy-kod' })

  for (const query of [
    { mode: 'verifyEmail', apiKey: 'demo-api-key' },
    { mode: 'verifyEmail', oobCode: 'kod', apiKey: 'obcy-klucz' },
    { oobCode: 'kod', apiKey: 'demo-api-key' }
  ]) {
    assert.throws(
      () => parseEmailVerificationAction({
        query,
        expectedApiKey: 'demo-api-key'
      }),
      error => (
        error?.code === 'email-verification/invalid-link' &&
        error.message === EMAIL_VERIFICATION_INVALID_MESSAGE
      )
    )
  }
})

test('handler nie przejmuje resetowania hasła ani zmiany adresu', () => {
  for (const mode of ['resetPassword', 'recoverEmail', 'verifyAndChangeEmail']) {
    assert.throws(
      () => parseEmailVerificationAction({
        query: {
          mode,
          oobCode: 'kod',
          apiKey: 'demo-api-key'
        },
        expectedApiKey: 'demo-api-key'
      }),
      error => (
        error?.code === 'email-verification/unsupported-action' &&
        error.message === EMAIL_VERIFICATION_UNSUPPORTED_MESSAGE
      )
    )
  }
})

test('poprawny kod jest stosowany dokładnie raz przez Auth', async () => {
  const calls = []
  await confirmEmailVerification({
    authInstance: { name: 'auth' },
    oobCode: 'kod',
    applyCode: async (authInstance, code) => {
      calls.push({ authInstance, code })
    }
  })

  assert.deepEqual(calls, [{
    authInstance: { name: 'auth' },
    code: 'kod'
  }])
})

test('błędny, wygasły i wykorzystany kod otrzymuje bezpieczny polski komunikat', () => {
  for (const code of [
    'auth/invalid-action-code',
    'auth/expired-action-code',
    'auth/user-disabled'
  ]) {
    assert.equal(
      getEmailVerificationErrorMessage({ code }),
      EMAIL_VERIFICATION_INVALID_MESSAGE
    )
  }
})

test('blokada ponownej wysyłki odlicza pełne sekundy i wygasa', () => {
  assert.equal(getVerificationResendSeconds({
    availableAt: 40_000,
    now: 10_001
  }), 30)
  assert.equal(getVerificationResendSeconds({
    availableAt: 40_000,
    now: 40_000
  }), 0)
})

test('formularz konta zachowuje pojedynczy wybór oraz bezpieczny powrót', async () => {
  const source = await readSource('src/views/ActivationView.vue')
  const choice = source.slice(
    source.indexOf("step === 'choice'"),
    source.indexOf("step === 'register'")
  )
  const register = source.slice(
    source.indexOf("step === 'register'"),
    source.indexOf("step === 'login'")
  )
  const backHandler = source.slice(
    source.indexOf('const backToChoice'),
    source.indexOf('const afterAuthentication')
  )

  assert.match(choice, />Utwórz konto</)
  assert.match(choice, />Mam już konto</)
  assert.match(register, />Utwórz konto</)
  assert.match(register, />Wstecz</)
  assert.doesNotMatch(register, />Mam już konto</)
  assert.match(backHandler, /step\.value = 'choice'/)
  assert.doesNotMatch(backHandler, /token\s*=|email\.value\s*=/)
  assert.match(source, /Konto z tym adresem e-mail już istnieje\. Wróć i wybierz „Mam już konto”\./)
})

test('normalny ekran weryfikacji wraca do otwartej aplikacji bez wylogowania', async () => {
  const source = await readSource('src/views/ActivationView.vue')
  const verify = source.slice(
    source.indexOf("step === 'verify'"),
    source.indexOf("step === 'account-mismatch'")
  )

  assert.match(verify, /wróć do otwartej aplikacji/)
  assert.match(verify, /Sprawdź potwierdzenie/)
  assert.match(verify, /resendCooldownSeconds > 0/)
  assert.doesNotMatch(verify, /Wyloguj i wróć/)
  assert.match(source, /Wysłaliśmy wiadomość weryfikacyjną\./)
})

test('wiadomość weryfikacyjna nie przenosi tokenu zaproszenia', async () => {
  const source = await readSource('src/views/ActivationView.vue')
  assert.match(source, /sendEmailVerification\(credential\.user\)/)
  assert.match(source, /sendEmailVerification\(auth\.currentUser\)/)
  assert.doesNotMatch(
    source,
    /sendEmailVerification\([\s\S]{0,100}buildActivationUrl/
  )
})

test('własna strona potwierdzenia nie przekierowuje i nie pokazuje dalszej akcji', async () => {
  const source = await readSource('src/views/EmailVerificationView.vue')

  assert.match(source, /Potwierdź adres e-mail/)
  assert.match(source, /Kliknij poniżej, aby potwierdzić swój adres e-mail\./)
  assert.match(source, /Adres e-mail został potwierdzony/)
  assert.match(source, /Możesz zamknąć tę kartę i wrócić do otwartej aplikacji GastroManager\./)
  assert.doesNotMatch(source, />Dalej</)
  assert.doesNotMatch(source, /Przejdź do aplikacji|Zaloguj się|router\.(push|replace)|window\.close/)
  assert.doesNotMatch(source, /continueUrl|route\.query\.t|token/)
})

test('ustawianie PIN-u nie pokazuje przycisku wylogowania', async () => {
  const source = await readSource('src/views/AccountAccessView.vue')
  const pinSetup = source.slice(
    source.indexOf('sessionStore.needsLocalPinSetup'),
    source.indexOf('<template v-else>')
  )

  assert.match(pinSetup, /Ustaw czterocyfrowy PIN/)
  assert.match(pinSetup, /Wpisz PIN/)
  assert.match(pinSetup, /Powtórz PIN/)
  assert.match(pinSetup, /Zapisz PIN na tym urządzeniu/)
  assert.doesNotMatch(pinSetup, /Wyloguj to urządzenie/)
})

test('niezatwierdzone urządzenie ma prosty komunikat i bezpieczny powrót', async () => {
  const source = await readSource('src/views/AccountAccessView.vue')
  const state = source.slice(
    source.indexOf('sessionStore.deviceApprovalRequired'),
    source.indexOf('sessionStore.requiresRestaurantSelection')
  )

  assert.match(state, /To urządzenie nie ma dostępu do aplikacji\. Poproś administratora o dostęp do aplikacji\./)
  assert.match(state, /@click="returnToLogin">Wróć</)
  assert.doesNotMatch(state, /sesja|Wyloguj to urządzenie|Dodaj urządzenie/)
  assert.match(source, /const returnToLogin[\s\S]*logoutCurrentDevice\(\)[\s\S]*router\.replace\('\/login'\)/)
})

test('powiadomienie managera jest czasowe i powstaje tylko po sukcesie usunięcia', async () => {
  const source = await readSource('src/views/UstawieniaZespoluView.vue')
  const removeHandler = source.slice(
    source.indexOf('const removeSelectedDevice'),
    source.indexOf('const executeDelete')
  )

  assert.match(removeHandler, /await accountSessionStore\.removeEmployeeDevice/)
  assert.match(removeHandler, /showActionFeedback\('Urządzenie zostało usunięte'\)/)
  assert.doesNotMatch(removeHandler, /accountAccessMessage\.value = 'Urządzenie zostało usunięte/)
  assert.match(source, /setTimeout\([\s\S]*2200\)/)
  assert.match(source, /role="status" aria-live="polite"/)
  assert.match(source, /if \([\s\S]*isAccountActionPending\.value[\s\S]*\) return/)
})
