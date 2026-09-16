import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildEmailChangeActionCodeSettings,
  getAccountEmailChangeErrorMessage,
  requestVerifiedAccountEmailChange,
  validateAccountEmailChange
} from '../src/utils/accountEmailChange.js'

test('waliduje nowy e-mail i odrzuca obecny adres', () => {
  assert.equal(validateAccountEmailChange({
    currentEmail: 'stary@example.com',
    newEmail: ' NOWY@example.com '
  }), 'nowy@example.com')
  assert.throws(() => validateAccountEmailChange({
    currentEmail: 'stary@example.com',
    newEmail: 'niepoprawny'
  }), /prawidłowy nowy adres/)
  assert.throws(() => validateAccountEmailChange({
    currentEmail: 'stary@example.com',
    newEmail: 'STARY@example.com'
  }), /musi być inny/)
})

test('ustawienia action code wracają na konto bez własnego handlera', () => {
  const settings = buildEmailChangeActionCodeSettings({
    configuredUrl: 'https://app.gastromanager.test/'
  })
  assert.deepEqual(settings, {
    url: 'https://app.gastromanager.test/konto'
  })
  assert.equal('handleCodeInApp' in settings, false)
})

test('ponownie uwierzytelnia przed wysłaniem zmiany i nie zwraca hasła', async () => {
  const calls = []
  const password = 'Tajne-haslo-123'
  const user = {
    uid: 'owner-uid',
    email: 'stary@example.com',
    auth: { languageCode: null }
  }

  const result = await requestVerifiedAccountEmailChange({
    user,
    currentPassword: password,
    newEmail: 'nowy@example.com',
    actionCodeSettings: { url: 'http://localhost:5173/konto' },
    credentialFactory: (email, suppliedPassword) => ({
      email,
      suppliedPassword
    }),
    reauthenticate: async (receivedUser, credential) => {
      calls.push(['reauthenticate', receivedUser.uid, credential.email])
      assert.equal(credential.suppliedPassword, password)
    },
    verifyBeforeUpdate: async (receivedUser, email, settings) => {
      calls.push(['verify', receivedUser.uid, email, settings.url])
    }
  })

  assert.deepEqual(calls, [
    ['reauthenticate', 'owner-uid', 'stary@example.com'],
    ['verify', 'owner-uid', 'nowy@example.com', 'http://localhost:5173/konto']
  ])
  assert.deepEqual(result, {
    uid: 'owner-uid',
    requestedEmail: 'nowy@example.com'
  })
  assert.equal(JSON.stringify(result).includes(password), false)
  assert.equal(user.auth.languageCode, 'pl')
})

test('mapuje błędy Firebase na polskie komunikaty bez szczegółów technicznych', () => {
  assert.equal(
    getAccountEmailChangeErrorMessage({ code: 'auth/wrong-password' }),
    'Obecne hasło jest nieprawidłowe.'
  )
  assert.equal(
    getAccountEmailChangeErrorMessage({ code: 'auth/email-already-in-use' }),
    'Ten adres e-mail jest już używany przez inne konto.'
  )
  assert.equal(
    getAccountEmailChangeErrorMessage({ code: 'auth/requires-recent-login' }),
    'Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.'
  )
  assert.equal(
    getAccountEmailChangeErrorMessage({ code: 'auth/too-many-requests' }),
    'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'
  )
  assert.equal(
    getAccountEmailChangeErrorMessage({ code: 'auth/unauthorized-continue-uri' }),
    'Adres powrotu aplikacji nie jest dozwolony. Skontaktuj się z administratorem.'
  )
  assert.equal(
    getAccountEmailChangeErrorMessage({ code: 'auth/network-request-failed' }),
    'Brak połączenia z siecią. Sprawdź internet i spróbuj ponownie.'
  )
})
