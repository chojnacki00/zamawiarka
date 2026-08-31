const FIREBASE_PUBLIC_PATHS = new Set([
  '/login',
  '/rejestracja',
  '/aktywacja'
])

export const LEGACY_PIN_LOGIN_PATH = '/logowanie'

export const isPublicAuthenticationPath = path => (
  FIREBASE_PUBLIC_PATHS.has(String(path || '')) ||
  String(path || '') === LEGACY_PIN_LOGIN_PATH
)

export const hasStoredLegacyPinSession = storage => Boolean(
  storage?.getItem?.('gm_emp_id') &&
  storage?.getItem?.('gm_rest_id')
)

export const resolveAuthenticationRedirect = ({
  path,
  hasFirebaseSession = false,
  hasLegacyPinSession = false
} = {}) => {
  const normalizedPath = String(path || '/').split(/[?#]/, 1)[0] || '/'

  if (normalizedPath === '/konto') {
    return hasFirebaseSession ? null : '/login'
  }

  if (isPublicAuthenticationPath(normalizedPath)) return null
  if (hasFirebaseSession || hasLegacyPinSession) return null

  return '/login'
}
