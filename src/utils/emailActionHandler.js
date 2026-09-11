import {
  ActionCodeOperation,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  validatePassword,
  verifyPasswordResetCode
} from 'firebase/auth'

export const EMAIL_ACTION_MODES = Object.freeze({
  VERIFY_EMAIL: 'verifyEmail',
  RESET_PASSWORD: 'resetPassword',
  VERIFY_AND_CHANGE_EMAIL: 'verifyAndChangeEmail',
  RECOVER_EMAIL: 'recoverEmail'
})

export const EMAIL_ACTION_INVALID_HEADING =
  'Link jest nieprawidłowy lub wygasł'
export const EMAIL_ACTION_INVALID_MESSAGE =
  'Wróć do aplikacji i wyślij wiadomość ponownie.'
export const EMAIL_ACTION_UNSUPPORTED_HEADING = 'Nieobsługiwane działanie'
export const EMAIL_ACTION_UNSUPPORTED_MESSAGE =
  'Ten link nie może zostać obsłużony przez aplikację. Poproś o wygenerowanie nowej wiadomości.'
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 30_000

const MODE_OPERATIONS = Object.freeze({
  [EMAIL_ACTION_MODES.VERIFY_EMAIL]: ActionCodeOperation.VERIFY_EMAIL,
  [EMAIL_ACTION_MODES.RESET_PASSWORD]: ActionCodeOperation.PASSWORD_RESET,
  [EMAIL_ACTION_MODES.VERIFY_AND_CHANGE_EMAIL]:
    ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
  [EMAIL_ACTION_MODES.RECOVER_EMAIL]: ActionCodeOperation.RECOVER_EMAIL
})

const createEmailActionError = (code, message) => {
  const error = new Error(message)
  error.code = code
  return error
}

const normalizeQueryValue = value => (
  Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim()
)

const getExpectedOperation = mode => MODE_OPERATIONS[mode] || null

const validatePasswordForCurrentEnvironment = async ({
  authInstance,
  password,
  validateNewPassword
}) => {
  try {
    return await validateNewPassword(authInstance, password)
  } catch (error) {
    const isUnsupportedEmulatorEndpoint = Boolean(authInstance?.emulatorConfig) &&
      String(error?.code || '').includes(
        'getpasswordpolicy-is-not-implemented-in-the-auth-emulator'
      )

    if (!isUnsupportedEmulatorEndpoint) throw error

    // Auth Emulator nie udostępnia endpointu polityki hasła, ale sam reset
    // wymaga co najmniej 6 znaków. Ten wyjątek nigdy nie działa poza Emulatorem.
    return { isValid: String(password || '').length >= 6 }
  }
}

export const parseEmailActionRequest = ({
  query = {},
  expectedApiKey
} = {}) => {
  const mode = normalizeQueryValue(query.mode)
  const oobCode = normalizeQueryValue(query.oobCode)
  const apiKey = normalizeQueryValue(query.apiKey)
  const configuredApiKey = String(expectedApiKey || '').trim()

  if (
    !mode ||
    !oobCode ||
    !apiKey ||
    !configuredApiKey ||
    apiKey !== configuredApiKey
  ) {
    throw createEmailActionError(
      'email-action/invalid-link',
      EMAIL_ACTION_INVALID_MESSAGE
    )
  }

  if (!getExpectedOperation(mode)) {
    throw createEmailActionError(
      'email-action/unsupported',
      EMAIL_ACTION_UNSUPPORTED_MESSAGE
    )
  }

  return { mode, oobCode }
}

export const assertEmailActionCodeOperation = async ({
  authInstance,
  mode,
  oobCode,
  inspectCode = checkActionCode,
  verifyResetCode = verifyPasswordResetCode
} = {}) => {
  const expectedOperation = getExpectedOperation(mode)
  const normalizedCode = String(oobCode || '').trim()

  if (!authInstance || !expectedOperation || !normalizedCode) {
    throw createEmailActionError(
      'email-action/invalid-link',
      EMAIL_ACTION_INVALID_MESSAGE
    )
  }

  if (mode === EMAIL_ACTION_MODES.RESET_PASSWORD) {
    await verifyResetCode(authInstance, normalizedCode)
  }

  const info = await inspectCode(authInstance, normalizedCode)
  if (info?.operation !== expectedOperation) {
    throw createEmailActionError(
      'email-action/operation-mismatch',
      EMAIL_ACTION_INVALID_MESSAGE
    )
  }

  return { mode, oobCode: normalizedCode, operation: info.operation }
}

export const inspectEmailAction = async ({
  authInstance,
  query,
  expectedApiKey,
  inspectCode,
  verifyResetCode
} = {}) => {
  const request = parseEmailActionRequest({ query, expectedApiKey })
  return assertEmailActionCodeOperation({
    authInstance,
    ...request,
    inspectCode,
    verifyResetCode
  })
}

export const completeEmailAction = async ({
  authInstance,
  action,
  newPassword = '',
  passwordConfirmation = '',
  inspectCode,
  verifyResetCode,
  applyCode = applyActionCode,
  confirmReset = confirmPasswordReset,
  validateNewPassword = validatePassword
} = {}) => {
  const mode = action?.mode
  const oobCode = String(action?.oobCode || '').trim()

  if (mode === EMAIL_ACTION_MODES.RESET_PASSWORD) {
    if (!newPassword || newPassword !== passwordConfirmation) {
      throw createEmailActionError(
        'email-action/password-mismatch',
        'Hasła nie są takie same.'
      )
    }

    const passwordStatus = await validatePasswordForCurrentEnvironment({
      authInstance,
      password: newPassword,
      validateNewPassword
    })
    if (passwordStatus?.isValid !== true) {
      throw createEmailActionError(
        'email-action/weak-password',
        'Hasło nie spełnia wymagań bezpieczeństwa.'
      )
    }
  }

  await assertEmailActionCodeOperation({
    authInstance,
    mode,
    oobCode,
    inspectCode,
    verifyResetCode
  })

  if (mode === EMAIL_ACTION_MODES.RESET_PASSWORD) {
    await confirmReset(authInstance, oobCode, newPassword)
  } else {
    await applyCode(authInstance, oobCode)
  }
}

export const getEmailActionErrorState = error => {
  const code = String(error?.code || '')

  if (code === 'email-action/unsupported') {
    return {
      status: 'unsupported',
      heading: EMAIL_ACTION_UNSUPPORTED_HEADING,
      message: EMAIL_ACTION_UNSUPPORTED_MESSAGE,
      fieldMessage: ''
    }
  }

  if (
    code === 'email-action/password-mismatch' ||
    code === 'email-action/weak-password' ||
    code === 'auth/weak-password' ||
    code === 'auth/password-does-not-meet-requirements'
  ) {
    return {
      status: 'ready',
      heading: '',
      message: '',
      fieldMessage: code === 'email-action/password-mismatch'
        ? 'Hasła nie są takie same.'
        : 'Hasło nie spełnia wymagań bezpieczeństwa.'
    }
  }

  if (code === 'auth/network-request-failed') {
    return {
      status: 'error',
      heading: 'Nie udało się wykonać działania',
      message: 'Sprawdź połączenie z internetem i spróbuj ponownie.',
      fieldMessage: ''
    }
  }

  return {
    status: 'error',
    heading: EMAIL_ACTION_INVALID_HEADING,
    message: EMAIL_ACTION_INVALID_MESSAGE,
    fieldMessage: ''
  }
}

export const getVerificationResendSeconds = ({
  availableAt = 0,
  now = Date.now()
} = {}) => Math.max(0, Math.ceil((Number(availableAt) - Number(now)) / 1000))
