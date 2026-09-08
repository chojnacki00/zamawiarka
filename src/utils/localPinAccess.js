export const LOCAL_PIN_ACCESS_FAILURES = Object.freeze({
  NO_FIREBASE_SESSION: 'no_firebase_session',
  MEMBERSHIP_MISSING: 'membership_missing',
  MEMBERSHIP_INACTIVE: 'membership_inactive',
  MEMBERSHIP_MISMATCH: 'membership_mismatch',
  DEVICE_SESSION_MISSING: 'device_session_missing',
  DEVICE_SESSION_SUSPENDED: 'device_session_suspended',
  DEVICE_SESSION_INACTIVE: 'device_session_inactive',
  DEVICE_SESSION_MISMATCH: 'device_session_mismatch',
  LOCAL_PIN_MISMATCH: 'local_pin_mismatch'
})

const normalizeId = value => String(value || '').trim()

export const getLocalPinAccessFailure = ({
  firebaseAuthUid,
  membership,
  deviceSession,
  expectedRestaurantId,
  expectedEmployeeId,
  expectedSessionId,
  localPinConfigured = false
} = {}) => {
  const authUid = normalizeId(firebaseAuthUid)
  if (!authUid) return LOCAL_PIN_ACCESS_FAILURES.NO_FIREBASE_SESSION

  if (!membership) return LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISSING
  if (membership.status !== 'active') {
    return LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_INACTIVE
  }

  const membershipAuthUid = normalizeId(
    membership.authUid || membership.id
  )
  const restaurantId = normalizeId(membership.restaurantId)
  const employeeId = normalizeId(membership.employeeId)
  if (
    membership.role !== 'employee' ||
    membershipAuthUid !== authUid ||
    !restaurantId ||
    restaurantId !== normalizeId(expectedRestaurantId) ||
    !employeeId ||
    employeeId !== normalizeId(expectedEmployeeId)
  ) {
    return LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISMATCH
  }

  if (!deviceSession) {
    return LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING
  }
  if (deviceSession.status === 'suspended') {
    return LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED
  }
  if (deviceSession.status !== 'active') {
    return LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_INACTIVE
  }

  if (
    normalizeId(deviceSession.sessionId) !== normalizeId(expectedSessionId) ||
    normalizeId(deviceSession.authUid) !== authUid ||
    normalizeId(deviceSession.restaurantId) !== restaurantId ||
    normalizeId(deviceSession.employeeId) !== employeeId ||
    !normalizeId(deviceSession.deviceId)
  ) {
    return LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISMATCH
  }

  if (!localPinConfigured) {
    return LOCAL_PIN_ACCESS_FAILURES.LOCAL_PIN_MISMATCH
  }

  return null
}

export const getLocalPinAccessMessage = failure => ({
  [LOCAL_PIN_ACCESS_FAILURES.NO_FIREBASE_SESSION]:
    'Sesja konta wygasła. Zaloguj się ponownie adresem e-mail i hasłem.',
  [LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISSING]:
    'To konto nie ma dostępu do wybranej restauracji.',
  [LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_INACTIVE]:
    'Dostęp do tej restauracji został zablokowany lub zakończony.',
  [LOCAL_PIN_ACCESS_FAILURES.MEMBERSHIP_MISMATCH]:
    'Nie udało się potwierdzić właściwej restauracji i pracownika.',
  [LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISSING]:
    'Zatwierdzona sesja tego urządzenia już nie istnieje.',
  [LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_SUSPENDED]:
    'To urządzenie zostało czasowo wstrzymane przez managera.',
  [LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_INACTIVE]:
    'To urządzenie zostało odłączone. Poproś managera o nowe zaproszenie.',
  [LOCAL_PIN_ACCESS_FAILURES.DEVICE_SESSION_MISMATCH]:
    'Lokalny PIN nie pasuje do bieżącego konta i zatwierdzonej sesji.',
  [LOCAL_PIN_ACCESS_FAILURES.LOCAL_PIN_MISMATCH]:
    'Na tym urządzeniu nie ma PIN-u przypisanego do bieżącej sesji.'
}[failure] || 'Nie udało się potwierdzić dostępu tego urządzenia.')

export const appendLocalPinDigit = (pin, digit, maximumLength = 4) => {
  const normalizedPin = String(pin || '').replace(/\D/g, '')
  const normalizedDigit = String(digit || '')
  if (!/^\d$/.test(normalizedDigit)) return normalizedPin
  return `${normalizedPin}${normalizedDigit}`.slice(0, maximumLength)
}

export const removeLocalPinDigit = pin => (
  String(pin || '').replace(/\D/g, '').slice(0, -1)
)
