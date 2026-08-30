const hasText = value => String(value || '').trim().length > 0

export const normalizeAccountEmail = value => (
  String(value || '').trim().toLowerCase()
)

export const isValidAccountEmail = value => (
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAccountEmail(value))
)

const toDate = value => {
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const buildAccountDocument = ({
  authUid,
  email,
  displayName = '',
  createdAt,
  updatedAt = createdAt
} = {}) => ({
  authUid: String(authUid || '').trim(),
  email: normalizeAccountEmail(email),
  displayName: String(displayName || '').trim(),
  status: 'active',
  createdAt,
  updatedAt
})

export const buildRestaurantDocument = ({
  restaurantId,
  name,
  ownerAuthUid,
  createdAt,
  updatedAt = createdAt
} = {}) => ({
  id: String(restaurantId || '').trim(),
  name: String(name || '').trim(),
  ownerAuthUid: String(ownerAuthUid || '').trim(),
  status: 'active',
  createdAt,
  updatedAt
})

export const buildMembershipDocument = ({
  authUid,
  restaurantId,
  employeeId = null,
  permissionProfileId = null,
  invitationId = null,
  role = 'employee',
  createdAt,
  acceptedAt = createdAt
} = {}) => ({
  authUid: String(authUid || '').trim(),
  restaurantId: String(restaurantId || '').trim(),
  employeeId: hasText(employeeId) ? String(employeeId).trim() : null,
  permissionProfileId: hasText(permissionProfileId)
    ? String(permissionProfileId).trim()
    : null,
  invitationId: hasText(invitationId)
    ? String(invitationId).trim()
    : null,
  role: role === 'owner' ? 'owner' : 'employee',
  status: 'active',
  createdAt,
  acceptedAt
})

export const buildInvitationDocument = ({
  invitationId,
  restaurantId,
  employeeId,
  permissionProfileId,
  email,
  invitedByAuthUid,
  createdAt,
  expiresAt
} = {}) => ({
  id: String(invitationId || '').trim(),
  restaurantId: String(restaurantId || '').trim(),
  employeeId: String(employeeId || '').trim(),
  permissionProfileId: hasText(permissionProfileId)
    ? String(permissionProfileId).trim()
    : null,
  email: normalizeAccountEmail(email),
  emailNormalized: normalizeAccountEmail(email),
  status: 'pending',
  invitedByAuthUid: String(invitedByAuthUid || '').trim(),
  createdAt,
  expiresAt,
  acceptedAt: null,
  acceptedByAuthUid: null
})

export const getActiveMemberships = memberships => (
  (Array.isArray(memberships) ? memberships : [])
    .filter(membership => (
      membership?.status === 'active' &&
      hasText(membership?.authUid) &&
      hasText(membership?.restaurantId)
    ))
    .sort((left, right) => (
      String(left.restaurantName || left.restaurantId).localeCompare(
        String(right.restaurantName || right.restaurantId),
        'pl'
      )
    ))
)

export const resolveMembershipSelection = ({
  memberships,
  preferredRestaurantId = null
} = {}) => {
  const activeMemberships = getActiveMemberships(memberships)
  const preferredId = String(preferredRestaurantId || '').trim()
  const preferredMembership = activeMemberships.find(
    membership => membership.restaurantId === preferredId
  ) || null
  const selectedMembership = preferredMembership || (
    activeMemberships.length === 1 ? activeMemberships[0] : null
  )

  return {
    activeMemberships,
    selectedMembership,
    selectedRestaurantId: selectedMembership?.restaurantId || null,
    requiresSelection:
      activeMemberships.length > 1 && !selectedMembership
  }
}

export const assertInvitationCanBeAccepted = ({
  invitation,
  authUser,
  now = new Date()
} = {}) => {
  if (!authUser?.emailVerified) {
    throw new Error('Najpierw potwierdź swój adres e-mail.')
  }

  if (
    normalizeAccountEmail(authUser.email) !==
    normalizeAccountEmail(invitation?.emailNormalized || invitation?.email)
  ) {
    throw new Error('Zaproszenie jest przypisane do innego adresu e-mail.')
  }

  if (invitation?.status !== 'pending') {
    throw new Error('To zaproszenie zostało już wykorzystane lub anulowane.')
  }

  const expiresAt = toDate(invitation?.expiresAt)

  if (!expiresAt || expiresAt.getTime() <= toDate(now)?.getTime()) {
    throw new Error('To zaproszenie wygasło.')
  }

  if (
    invitation?.acceptedAt != null ||
    invitation?.acceptedByAuthUid != null
  ) {
    throw new Error('To zaproszenie zostało już wykorzystane.')
  }

  return true
}

export const canViewScheduleWithMembership = ({
  membership,
  permissions = {}
} = {}) => (
  membership?.status === 'active' && (
    membership?.role === 'owner' ||
    permissions?.can_view_schedule === true
  )
)

export const canManageScheduleWithMembership = ({
  membership,
  permissions = {}
} = {}) => (
  membership?.status === 'active' && (
    membership?.role === 'owner' ||
    permissions?.can_manage_schedule === true
  )
)

const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  'password',
  'pin',
  'firebaseToken',
  'sessionToken',
  'deviceSecret'
])

export const containsForbiddenCredentialData = value => {
  if (!value || typeof value !== 'object') return false

  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_CREDENTIAL_KEYS.has(key) ||
    containsForbiddenCredentialData(child)
  ))
}
