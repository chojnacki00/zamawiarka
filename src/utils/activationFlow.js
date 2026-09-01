export const INVALID_ACTIVATION_INVITATION_MESSAGE =
  'Zaproszenie jest nieprawidłowe lub wygasło. Poproś managera o nowe zaproszenie.'

export const TECHNICAL_ACTIVATION_INVITATION_MESSAGE =
  'Nie udało się sprawdzić zaproszenia. Sprawdź połączenie i spróbuj ponownie.'

const INVALID_INVITATION_CODES = new Set([
  'activation/missing-token',
  'activation/invitation-not-found',
  'activation/invitation-invalid'
])

export const createActivationFlowError = (code, message = '') => {
  const error = new Error(message || code)
  error.code = code
  return error
}

export const classifyActivationInvitationError = error => {
  const code = String(error?.code || '')
  if (INVALID_INVITATION_CODES.has(code)) {
    return {
      kind: 'invalid',
      message: INVALID_ACTIVATION_INVITATION_MESSAGE,
      retryable: false
    }
  }

  return {
    kind: 'technical',
    message: TECHNICAL_ACTIVATION_INVITATION_MESSAGE,
    retryable: true
  }
}

export const buildInvitationForEmailValidation = ({
  invitation,
  emailHash
} = {}) => ({
  ...invitation,
  emailHash: String(emailHash || '')
})

export const resolveActivationStepForUser = user => (
  user?.emailVerified ? 'device' : 'verify'
)

export const validateActivationPasswords = ({
  password,
  confirmation
} = {}) => {
  if (String(password || '').length < 8) {
    return 'Hasło musi mieć co najmniej 8 znaków.'
  }
  if (String(password || '') !== String(confirmation || '')) {
    return 'Wpisane hasła nie są takie same.'
  }
  return ''
}
