import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { ActionCodeOperation } from 'firebase/auth'
import {
  completeEmailAction,
  EMAIL_ACTION_INVALID_HEADING,
  EMAIL_ACTION_INVALID_MESSAGE,
  EMAIL_ACTION_MODES,
  EMAIL_ACTION_UNSUPPORTED_HEADING,
  EMAIL_ACTION_UNSUPPORTED_MESSAGE,
  getEmailActionErrorState,
  getVerificationResendSeconds,
  inspectEmailAction,
  parseEmailActionRequest
} from '../src/utils/emailActionHandler.js'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

const operations = new Map([
  [EMAIL_ACTION_MODES.VERIFY_EMAIL, ActionCodeOperation.VERIFY_EMAIL],
  [EMAIL_ACTION_MODES.RESET_PASSWORD, ActionCodeOperation.PASSWORD_RESET],
  [EMAIL_ACTION_MODES.VERIFY_AND_CHANGE_EMAIL, ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL],
  [EMAIL_ACTION_MODES.RECOVER_EMAIL, ActionCodeOperation.RECOVER_EMAIL]
])

test('handler przyjmuje cztery wspierane tryby dla bieżącego projektu', () => {
  for (const mode of operations.keys()) {
    assert.deepEqual(parseEmailActionRequest({
      query: { mode, oobCode: `${mode}-code`, apiKey: 'demo-api-key' },
      expectedApiKey: 'demo-api-key'
    }), { mode, oobCode: `${mode}-code` })
  }
})

test('brak kodu i błędny apiKey są odrzucane bez ujawniania szczegółów', () => {
  for (const query of [
    { mode: 'verifyEmail', apiKey: 'demo-api-key' },
    { mode: 'verifyEmail', oobCode: 'code', apiKey: 'foreign-key' },
    { oobCode: 'code', apiKey: 'demo-api-key' }
  ]) {
    assert.throws(
      () => parseEmailActionRequest({ query, expectedApiKey: 'demo-api-key' }),
      error => (
        error?.code === 'email-action/invalid-link' &&
        error.message === EMAIL_ACTION_INVALID_MESSAGE
      )
    )
  }
})

test('nieobsługiwany mode nie uruchamia żadnej funkcji SDK', async () => {
  for (const mode of ['emailSignIn', 'revertSecondFactorAddition', 'unknown']) {
    let inspectionCalls = 0
    await assert.rejects(inspectEmailAction({
      authInstance: {},
      query: { mode, oobCode: 'secret-code', apiKey: 'demo-api-key' },
      expectedApiKey: 'demo-api-key',
      inspectCode: async () => {
        inspectionCalls += 1
      }
    }), error => error?.code === 'email-action/unsupported')
    assert.equal(inspectionCalls, 0)
  }
})

test('każdy kod jest sprawdzany przez SDK i porównywany z ActionCodeOperation', async () => {
  for (const [mode, operation] of operations) {
    const calls = []
    const result = await inspectEmailAction({
      authInstance: { name: 'auth' },
      query: { mode, oobCode: 'one-time-code', apiKey: 'demo-api-key' },
      expectedApiKey: 'demo-api-key',
      verifyResetCode: async (_auth, code) => calls.push(`reset:${code}`),
      inspectCode: async (_auth, code) => {
        calls.push(`inspect:${code}`)
        return { operation }
      }
    })

    assert.equal(result.operation, operation)
    assert.deepEqual(calls, mode === EMAIL_ACTION_MODES.RESET_PASSWORD
      ? ['reset:one-time-code', 'inspect:one-time-code']
      : ['inspect:one-time-code'])
  }

  await assert.rejects(inspectEmailAction({
    authInstance: {},
    query: {
      mode: EMAIL_ACTION_MODES.VERIFY_EMAIL,
      oobCode: 'wrong-operation-code',
      apiKey: 'demo-api-key'
    },
    expectedApiKey: 'demo-api-key',
    inspectCode: async () => ({ operation: ActionCodeOperation.PASSWORD_RESET })
  }), error => error?.code === 'email-action/operation-mismatch')
})

test('otwarcie recoverEmail jedynie sprawdza kod, a świadome kliknięcie go stosuje', async () => {
  let applyCalls = 0
  const action = await inspectEmailAction({
    authInstance: {},
    query: {
      mode: EMAIL_ACTION_MODES.RECOVER_EMAIL,
      oobCode: 'recover-code',
      apiKey: 'demo-api-key'
    },
    expectedApiKey: 'demo-api-key',
    inspectCode: async () => ({ operation: ActionCodeOperation.RECOVER_EMAIL })
  })
  assert.equal(applyCalls, 0)

  await completeEmailAction({
    authInstance: {},
    action,
    inspectCode: async () => ({ operation: ActionCodeOperation.RECOVER_EMAIL }),
    applyCode: async () => { applyCalls += 1 }
  })
  assert.equal(applyCalls, 1)
})

test('potwierdzenie e-maila i jego zmiana ponownie sprawdzają kod przed zastosowaniem', async () => {
  for (const mode of [
    EMAIL_ACTION_MODES.VERIFY_EMAIL,
    EMAIL_ACTION_MODES.VERIFY_AND_CHANGE_EMAIL
  ]) {
    const calls = []
    await completeEmailAction({
      authInstance: {},
      action: { mode, oobCode: 'code' },
      inspectCode: async () => {
        calls.push('inspect')
        return { operation: operations.get(mode) }
      },
      applyCode: async () => calls.push('apply')
    })
    assert.deepEqual(calls, ['inspect', 'apply'])
  }
})

test('reset nie wykonuje operacji przy różnych albo zbyt słabych hasłach', async () => {
  let confirmCalls = 0
  const action = {
    mode: EMAIL_ACTION_MODES.RESET_PASSWORD,
    oobCode: 'reset-code'
  }

  await assert.rejects(completeEmailAction({
    authInstance: {},
    action,
    newPassword: 'Password-123',
    passwordConfirmation: 'Different-123',
    confirmReset: async () => { confirmCalls += 1 }
  }), error => error?.code === 'email-action/password-mismatch')

  await assert.rejects(completeEmailAction({
    authInstance: {},
    action,
    newPassword: 'weak',
    passwordConfirmation: 'weak',
    validateNewPassword: async () => ({ isValid: false }),
    confirmReset: async () => { confirmCalls += 1 }
  }), error => error?.code === 'email-action/weak-password')
  assert.equal(confirmCalls, 0)
})

test('prawidłowy reset sprawdza kod, politykę hasła i dopiero zapisuje hasło', async () => {
  const calls = []
  await completeEmailAction({
    authInstance: {},
    action: {
      mode: EMAIL_ACTION_MODES.RESET_PASSWORD,
      oobCode: 'reset-code'
    },
    newPassword: 'Secure-password-123',
    passwordConfirmation: 'Secure-password-123',
    validateNewPassword: async () => {
      calls.push('policy')
      return { isValid: true }
    },
    verifyResetCode: async () => calls.push('verify-reset'),
    inspectCode: async () => {
      calls.push('inspect')
      return { operation: ActionCodeOperation.PASSWORD_RESET }
    },
    confirmReset: async () => calls.push('confirm')
  })
  assert.deepEqual(calls, ['policy', 'verify-reset', 'inspect', 'confirm'])
})

test('brak endpointu polityki ma ograniczony fallback tylko w Auth Emulatorze', async () => {
  const action = {
    mode: EMAIL_ACTION_MODES.RESET_PASSWORD,
    oobCode: 'reset-code'
  }
  const unsupportedPolicy = async () => {
    const error = new Error('unsupported')
    error.code = 'auth/identitytoolkit.getpasswordpolicy-is-not-implemented-in-the-auth-emulator.'
    throw error
  }
  const common = {
    action,
    newPassword: 'Secure-password-123',
    passwordConfirmation: 'Secure-password-123',
    validateNewPassword: unsupportedPolicy,
    verifyResetCode: async () => {},
    inspectCode: async () => ({ operation: ActionCodeOperation.PASSWORD_RESET }),
    confirmReset: async () => {}
  }

  await completeEmailAction({
    ...common,
    authInstance: { emulatorConfig: { host: '127.0.0.1' } }
  })
  await assert.rejects(completeEmailAction({
    ...common,
    authInstance: {}
  }), error => String(error?.code).includes('getpasswordpolicy'))
})

test('błędy mają bezpieczne polskie stany bez surowych kodów Firebase', () => {
  assert.deepEqual(getEmailActionErrorState({ code: 'email-action/unsupported' }), {
    status: 'unsupported',
    heading: EMAIL_ACTION_UNSUPPORTED_HEADING,
    message: EMAIL_ACTION_UNSUPPORTED_MESSAGE,
    fieldMessage: ''
  })
  assert.deepEqual(getEmailActionErrorState({ code: 'auth/expired-action-code' }), {
    status: 'error',
    heading: EMAIL_ACTION_INVALID_HEADING,
    message: EMAIL_ACTION_INVALID_MESSAGE,
    fieldMessage: ''
  })
})

test('blokada ponownej wysyłki odlicza pełne sekundy i wygasa', () => {
  assert.equal(getVerificationResendSeconds({ availableAt: 40_000, now: 10_001 }), 30)
  assert.equal(getVerificationResendSeconds({ availableAt: 40_000, now: 40_000 }), 0)
})

test('widok zawiera komplet akcji, nie przekierowuje i nie ujawnia parametrów', async () => {
  const source = await readSource('src/views/EmailActionView.vue')
  const helperSource = await readSource('src/utils/emailActionHandler.js')

  for (const expectedText of [
    'Potwierdź adres e-mail',
    'Ustaw nowe hasło',
    'Powtórz nowe hasło',
    'Potwierdź zmianę adresu e-mail',
    'Cofnij zmianę adresu e-mail',
    'Przywróć poprzedni adres',
    'Ze względów bezpieczeństwa zalecamy również zmianę hasła do konta.'
  ]) {
    assert.match(source, new RegExp(expectedText))
  }

  assert.doesNotMatch(source, />Dalej</)
  assert.doesNotMatch(source, /router\.(push|replace)|window\.(close|location)/)
  assert.doesNotMatch(source, /continueUrl|route\.query\.t|console\.|token/)
  assert.doesNotMatch(source, /\{\{\s*action\?\.oobCode|\{\{\s*route\.query/)
  assert.doesNotMatch(helperSource, /continueUrl|console\./)
})

test('routing kieruje na nowy widok, a stary adres pozostaje tylko aliasem', async () => {
  const routerSource = await readSource('src/router.js')
  const routeAccessSource = await readSource('src/utils/routeAccess.js')

  assert.match(routerSource, /path: EMAIL_ACTION_PATH/)
  assert.match(routerSource, /alias: EMAIL_VERIFICATION_ALIAS_PATH/)
  assert.match(routerSource, /EmailActionView\.vue/)
  assert.match(routeAccessSource, /export const EMAIL_ACTION_PATH = '\/akcja-konta'/)
  assert.match(routeAccessSource, /export const EMAIL_VERIFICATION_ALIAS_PATH = '\/potwierdz-email'/)
})

test('dotychczasowe bezpieczne ekrany aktywacji i dostępu pozostają bez regresji', async () => {
  const activation = await readSource('src/views/ActivationView.vue')
  const access = await readSource('src/views/AccountAccessView.vue')
  const login = await readSource('src/views/LoginView.vue')

  assert.match(activation, /sendEmailVerification\(credential\.user\)/)
  assert.match(activation, /sendPasswordResetEmail\(auth, email\.value/)
  assert.match(activation, /Sprawdź potwierdzenie/)
  assert.match(access, /sendEmailVerification\(auth\.currentUser\)/)
  assert.match(access, /Ustaw czterocyfrowy PIN/)
  assert.match(login, /sendPasswordResetEmail\(auth, email\)/)
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
