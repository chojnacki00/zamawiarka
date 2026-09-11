import { applyActionCode } from 'firebase/auth'

export const EMAIL_VERIFICATION_INVALID_MESSAGE =
  'Link potwierdzający jest nieprawidłowy albo wygasł. Wróć do otwartej aplikacji i wyślij wiadomość ponownie.'

export const EMAIL_VERIFICATION_UNSUPPORTED_MESSAGE =
  'Ten rodzaj działania nie jest obsługiwany na tej stronie.'

export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 30_000

const createEmailVerificationError = (code, message) => {
  const error = new Error(message)
  error.code = code
  return error
}

const normalizeQueryValue = value => (
  Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim()
)

export const parseEmailVerificationAction = ({
  query = {},
  expectedApiKey
} = {}) => {
  const mode = normalizeQueryValue(query.mode)
  const oobCode = normalizeQueryValue(query.oobCode)
  const apiKey = normalizeQueryValue(query.apiKey)
  const configuredApiKey = String(expectedApiKey || '').trim()

  if (mode && mode !== 'verifyEmail') {
    throw createEmailVerificationError(
      'email-verification/unsupported-action',
      EMAIL_VERIFICATION_UNSUPPORTED_MESSAGE
    )
  }

  if (
    mode !== 'verifyEmail' ||
    !oobCode ||
    !apiKey ||
    !configuredApiKey ||
    apiKey !== configuredApiKey
  ) {
    throw createEmailVerificationError(
      'email-verification/invalid-link',
      EMAIL_VERIFICATION_INVALID_MESSAGE
    )
  }

  return { oobCode }
}

export const confirmEmailVerification = async ({
  authInstance,
  oobCode,
  applyCode = applyActionCode
} = {}) => {
  const normalizedCode = String(oobCode || '').trim()
  if (!authInstance || !normalizedCode) {
    throw createEmailVerificationError(
      'email-verification/invalid-link',
      EMAIL_VERIFICATION_INVALID_MESSAGE
    )
  }

  await applyCode(authInstance, normalizedCode)
}

export const getEmailVerificationErrorMessage = error => (
  error?.code === 'email-verification/unsupported-action'
    ? EMAIL_VERIFICATION_UNSUPPORTED_MESSAGE
    : EMAIL_VERIFICATION_INVALID_MESSAGE
)

export const getVerificationResendSeconds = ({
  availableAt = 0,
  now = Date.now()
} = {}) => Math.max(0, Math.ceil((Number(availableAt) - Number(now)) / 1000))
