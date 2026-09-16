import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from 'firebase/auth'
import { buildAccountReturnUrl } from '../config/publicAppUrl.js'
import {
  isValidAccountEmail,
  normalizeAccountEmail
} from './employeeIdentity.js'

const createEmailChangeError = (code, message) => {
  const error = new Error(message)
  error.code = code
  return error
}

export const validateAccountEmailChange = ({
  currentEmail,
  newEmail
} = {}) => {
  const normalizedCurrentEmail = normalizeAccountEmail(currentEmail)
  const normalizedNewEmail = normalizeAccountEmail(newEmail)

  if (!isValidAccountEmail(normalizedNewEmail)) {
    throw createEmailChangeError(
      'account/invalid-new-email',
      'Wpisz prawidłowy nowy adres e-mail.'
    )
  }
  if (normalizedCurrentEmail === normalizedNewEmail) {
    throw createEmailChangeError(
      'account/same-email',
      'Nowy adres e-mail musi być inny niż obecny.'
    )
  }

  return normalizedNewEmail
}

export const buildEmailChangeActionCodeSettings = options => ({
  url: buildAccountReturnUrl(options)
})

export const requestVerifiedAccountEmailChange = async ({
  user,
  currentPassword,
  newEmail,
  authInstance = user?.auth,
  actionCodeSettings = buildEmailChangeActionCodeSettings(),
  credentialFactory = EmailAuthProvider.credential,
  reauthenticate = reauthenticateWithCredential,
  verifyBeforeUpdate = verifyBeforeUpdateEmail
} = {}) => {
  if (!user?.uid || !user.email) {
    throw createEmailChangeError(
      'account/no-current-user',
      'Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.'
    )
  }
  if (!String(currentPassword || '')) {
    throw createEmailChangeError(
      'account/missing-password',
      'Wpisz obecne hasło.'
    )
  }

  const requestedEmail = validateAccountEmailChange({
    currentEmail: user.email,
    newEmail
  })
  const unchangedUid = user.uid
  const credential = credentialFactory(user.email, currentPassword)

  await reauthenticate(user, credential)
  if (user.uid !== unchangedUid) {
    throw createEmailChangeError(
      'account/user-changed',
      'Sesja konta zmieniła się. Zaloguj się ponownie.'
    )
  }

  if (authInstance) authInstance.languageCode = 'pl'
  await verifyBeforeUpdate(user, requestedEmail, actionCodeSettings)

  return {
    uid: unchangedUid,
    requestedEmail
  }
}

export const getAccountEmailChangeErrorMessage = error => {
  const code = String(error?.code || '')

  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential'
  ) return 'Obecne hasło jest nieprawidłowe.'
  if (
    code === 'auth/invalid-email' ||
    code === 'account/invalid-new-email'
  ) return 'Wpisz prawidłowy nowy adres e-mail.'
  if (code === 'account/same-email') {
    return 'Nowy adres e-mail musi być inny niż obecny.'
  }
  if (code === 'account/missing-password') return 'Wpisz obecne hasło.'
  if (code === 'auth/email-already-in-use') {
    return 'Ten adres e-mail jest już używany przez inne konto.'
  }
  if (
    code === 'auth/requires-recent-login' ||
    code === 'account/no-current-user' ||
    code === 'account/user-changed' ||
    code === 'auth/user-token-expired'
  ) return 'Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.'
  if (code === 'auth/too-many-requests') {
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'
  }
  if (
    code === 'auth/unauthorized-continue-uri' ||
    code === 'auth/invalid-continue-uri' ||
    code === 'auth/missing-continue-uri'
  ) return 'Adres powrotu aplikacji nie jest dozwolony. Skontaktuj się z administratorem.'
  if (code === 'auth/network-request-failed') {
    return 'Brak połączenia z siecią. Sprawdź internet i spróbuj ponownie.'
  }

  return 'Nie udało się wysłać potwierdzenia zmiany e-maila. Spróbuj ponownie.'
}
