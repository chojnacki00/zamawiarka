import { generateDeviceId } from './identityInvitations.js'

const DEVICE_STORAGE_PREFIX = 'gm_approved_device_v1'

const storageKey = ({ authUid, restaurantId }) => (
  `${DEVICE_STORAGE_PREFIX}:${String(authUid || '').trim()}:${String(restaurantId || '').trim()}`
)

export const getFirebaseAuthTime = async user => {
  if (!user?.uid) throw new Error('Brak aktywnej sesji Firebase.')
  const tokenResult = await user.getIdTokenResult()
  const authTime = Number(tokenResult?.claims?.auth_time)
  if (!Number.isInteger(authTime) || authTime <= 0) {
    throw new Error('Nie udało się rozpoznać sesji Firebase.')
  }
  return authTime
}

export const getDeviceSessionId = authTime => {
  const value = Number(authTime)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Nieprawidłowy identyfikator sesji urządzenia.')
  }
  return String(value)
}

export const suggestDeviceName = ({
  platform = globalThis.navigator?.userAgentData?.platform ||
    globalThis.navigator?.platform || ''
} = {}) => {
  const normalized = String(platform || '').trim()
  return normalized ? `Urządzenie ${normalized}` : 'Moje urządzenie'
}

export const getPlatformDescription = ({
  platform = globalThis.navigator?.userAgentData?.platform ||
    globalThis.navigator?.platform || 'Nieznana platforma'
} = {}) => String(platform || 'Nieznana platforma').trim()

export const buildDeviceSessionDocument = ({
  authUid,
  restaurantId,
  employeeId,
  deviceName,
  platform,
  authTime,
  approvedByAuthUid,
  invitationId,
  createdAt,
  deviceId = generateDeviceId()
} = {}) => ({
  deviceId,
  restaurantId: String(restaurantId || '').trim(),
  employeeId: String(employeeId || '').trim(),
  authUid: String(authUid || '').trim(),
  deviceName: String(deviceName || '').trim(),
  platform: String(platform || '').trim(),
  authTime: Number(authTime),
  status: 'active',
  addedAt: createdAt,
  lastActiveAt: createdAt,
  approvedAt: createdAt,
  approvedByAuthUid: String(approvedByAuthUid || '').trim(),
  invitationId: String(invitationId || '').trim(),
  disconnectedAt: null,
  disconnectedByAuthUid: null
})

export const saveLocalApprovedDevice = ({
  authUid,
  restaurantId,
  deviceId,
  sessionId,
  storage = localStorage
} = {}) => storage.setItem(storageKey({ authUid, restaurantId }), JSON.stringify({
  deviceId,
  sessionId
}))

export const readLocalApprovedDevice = ({
  authUid,
  restaurantId,
  storage = localStorage
} = {}) => {
  try {
    const value = storage.getItem(storageKey({ authUid, restaurantId }))
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export const clearLocalApprovedDevice = ({
  authUid,
  restaurantId,
  storage = localStorage
} = {}) => storage.removeItem(storageKey({ authUid, restaurantId }))
