export const INVITATION_PURPOSES = Object.freeze({
  ACCOUNT_ACTIVATION: 'ACCOUNT_ACTIVATION',
  DEVICE_ENROLLMENT: 'DEVICE_ENROLLMENT'
})

const TOKEN_BYTES = 32
const DEVICE_ID_BYTES = 16

const normalizeText = value => String(value || '').trim()

export const normalizeIdentityEmail = value => (
  normalizeText(value).toLowerCase()
)

const bytesToBase64Url = bytes => {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const bytesToHex = bytes => Array.from(
  bytes,
  byte => byte.toString(16).padStart(2, '0')
).join('')

export const generateSecureToken = ({
  cryptoImpl = globalThis.crypto,
  byteLength = TOKEN_BYTES
} = {}) => {
  if (!cryptoImpl?.getRandomValues) {
    throw new Error('Bezpieczny generator losowy jest niedostępny.')
  }

  return bytesToBase64Url(
    cryptoImpl.getRandomValues(new Uint8Array(byteLength))
  )
}

export const generateDeviceId = options => generateSecureToken({
  ...options,
  byteLength: DEVICE_ID_BYTES
})

export const hashIdentityValue = async (
  value,
  { cryptoImpl = globalThis.crypto } = {}
) => {
  if (!cryptoImpl?.subtle) {
    throw new Error('Bezpieczna funkcja skrótu jest niedostępna.')
  }

  const digest = await cryptoImpl.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizeText(value))
  )
  return bytesToHex(new Uint8Array(digest))
}

export const maskIdentityEmail = value => {
  const email = normalizeIdentityEmail(value)
  const separatorIndex = email.indexOf('@')
  if (separatorIndex <= 0) return ''

  const localPart = email.slice(0, separatorIndex)
  const domain = email.slice(separatorIndex + 1)
  return `${localPart.slice(0, 1)}${'*'.repeat(Math.max(3, localPart.length - 1))}@${domain}`
}

export const buildInvitationSlotId = ({
  restaurantId,
  employeeId,
  purpose
} = {}) => [restaurantId, employeeId, purpose]
  .map(normalizeText)
  .join('__')

export const createIdentityInvitationBundle = async ({
  restaurantId,
  restaurantName,
  employeeId,
  permissionProfileId = null,
  email,
  purpose,
  targetAuthUid = null,
  createdByAuthUid,
  createdAt,
  expiresAt,
  cryptoImpl = globalThis.crypto
} = {}) => {
  const normalizedEmail = normalizeIdentityEmail(email)
  if (!normalizeText(restaurantId) || !normalizeText(employeeId)) {
    throw new Error('Brak restauracji lub pracownika dla zaproszenia.')
  }
  if (!Object.values(INVITATION_PURPOSES).includes(purpose)) {
    throw new Error('Nieprawidłowy cel zaproszenia.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Pracownik nie ma prawidłowego adresu e-mail.')
  }
  if (
    purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT &&
    !normalizeText(targetAuthUid)
  ) {
    throw new Error('Brak konta pracownika dla zaproszenia urządzenia.')
  }
  const rawToken = generateSecureToken({ cryptoImpl })
  const [tokenHash, emailHash] = await Promise.all([
    hashIdentityValue(rawToken, { cryptoImpl }),
    hashIdentityValue(normalizedEmail, { cryptoImpl })
  ])
  const slotId = buildInvitationSlotId({
    restaurantId,
    employeeId,
    purpose
  })

  const privateInvitation = {
    id: tokenHash,
    tokenHash,
    slotId,
    purpose,
    restaurantId: normalizeText(restaurantId),
    employeeId: normalizeText(employeeId),
    permissionProfileId: normalizeText(permissionProfileId) || null,
    emailNormalized: normalizedEmail,
    emailHash,
    targetAuthUid: purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT
      ? normalizeText(targetAuthUid)
      : null,
    status: 'pending',
    createdByAuthUid: normalizeText(createdByAuthUid),
    createdAt,
    expiresAt
  }

  const publicInvitation = {
    id: tokenHash,
    tokenHash,
    purpose,
    restaurantNameSnapshot: normalizeText(restaurantName) || 'GastroManager',
    maskedEmail: maskIdentityEmail(normalizedEmail),
    emailHash,
    status: 'pending',
    createdAt,
    expiresAt
  }

  const slot = {
    id: slotId,
    tokenHash,
    restaurantId: privateInvitation.restaurantId,
    employeeId: privateInvitation.employeeId,
    purpose,
    createdAt,
    expiresAt
  }

  return {
    rawToken,
    tokenHash,
    slotId,
    privateInvitation,
    publicInvitation,
    slot
  }
}

const toMillis = value => {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const assertPublicInvitationIsActive = ({
  invitation,
  now = Date.now()
} = {}) => {
  if (!invitation) throw new Error('Link aktywacyjny jest nieprawidłowy.')
  if (invitation.status !== 'pending') {
    throw new Error('To zaproszenie zostało już wykorzystane lub anulowane.')
  }
  if (toMillis(invitation.expiresAt) <= toMillis(now)) {
    throw new Error('To zaproszenie wygasło.')
  }
  if (!Object.values(INVITATION_PURPOSES).includes(invitation.purpose)) {
    throw new Error('Link aktywacyjny ma nieprawidłowy typ.')
  }
  return true
}

export const buildSafePublicInvitationPreview = ({
  invitation,
  now = Date.now()
} = {}) => {
  assertPublicInvitationIsActive({ invitation, now })

  return {
    restaurantNameSnapshot: normalizeText(
      invitation.restaurantNameSnapshot
    ) || 'GastroManager',
    maskedEmail: normalizeText(invitation.maskedEmail),
    expiresAt: invitation.expiresAt,
    purpose: invitation.purpose
  }
}

export const assertEmailMatchesPublicInvitation = async ({
  email,
  invitation,
  cryptoImpl = globalThis.crypto
} = {}) => {
  const emailHash = await hashIdentityValue(
    normalizeIdentityEmail(email),
    { cryptoImpl }
  )
  if (!invitation?.emailHash || emailHash !== invitation.emailHash) {
    throw new Error('Wpisany e-mail nie jest zgodny z zaproszeniem.')
  }
  return true
}

export const assertPrivateInvitationForAccount = ({
  invitation,
  authUser,
  purpose,
  now = Date.now()
} = {}) => {
  if (!authUser?.emailVerified) {
    throw new Error('Najpierw potwierdź swój adres e-mail.')
  }
  if (
    normalizeIdentityEmail(authUser.email) !==
    normalizeIdentityEmail(invitation?.emailNormalized)
  ) {
    throw new Error('Zaproszenie jest przypisane do innego adresu e-mail.')
  }
  if (invitation?.purpose !== purpose) {
    throw new Error('Zaproszenie ma inny cel.')
  }
  if (invitation?.status !== 'pending') {
    throw new Error('To zaproszenie zostało już wykorzystane lub anulowane.')
  }
  if (toMillis(invitation?.expiresAt) <= toMillis(now)) {
    throw new Error('To zaproszenie wygasło.')
  }
  if (
    purpose === INVITATION_PURPOSES.DEVICE_ENROLLMENT &&
    invitation.targetAuthUid !== authUser.uid
  ) {
    throw new Error('Zalogowano inne konto niż wskazane w zaproszeniu urządzenia.')
  }
  return true
}
