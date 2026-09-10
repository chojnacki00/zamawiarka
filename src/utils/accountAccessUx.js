const normalizeText = value => String(value || '').trim()

export const isPermissionDeniedError = error => {
  const code = normalizeText(error?.code).toLowerCase()
  return code === 'permission-denied' || code.endsWith('/permission-denied')
}

export const shouldTreatBusinessPermissionDeniedAsBlocked = ({
  error,
  expectedRestaurantId,
  currentRestaurantId,
  expectedAuthUid,
  currentAuthUid,
  membershipExists,
  membershipStatus
} = {}) => (
  isPermissionDeniedError(error) &&
  Boolean(expectedRestaurantId) &&
  expectedRestaurantId === currentRestaurantId &&
  Boolean(expectedAuthUid) &&
  expectedAuthUid === currentAuthUid &&
  (
    membershipExists === false ||
    membershipStatus === 'blocked'
  )
)

export const buildEmployeeDeviceSummary = session => ({
  name: normalizeText(session?.deviceName) || 'Nieznane urządzenie',
  statusLabel: session?.status === 'active' ? 'Aktywne' : 'Odłączone',
  dateValue:
    session?.approvedAt ||
    session?.addedAt ||
    session?.createdAt ||
    null
})
