const FIREBASE_PUBLIC_PATHS = new Set([
  '/login',
  '/rejestracja',
  '/aktywacja'
])

export const LEGACY_PIN_LOGIN_PATH = '/logowanie'
export const ACTIVATION_ROUTE_NAME = 'Aktywacja'

export const isPublicActivationRoute = route => (
  route?.name === ACTIVATION_ROUTE_NAME ||
  String(route?.path || '').split(/[?#]/, 1)[0] === '/aktywacja'
)

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

export const resolveRouteAuthenticationRedirect = ({
  route,
  hasFirebaseSession = false,
  hasLegacyPinSession = false
} = {}) => {
  if (isPublicActivationRoute(route)) return null

  return resolveAuthenticationRedirect({
    path: route?.path,
    hasFirebaseSession,
    hasLegacyPinSession
  })
}

export const resolveAppAuthenticationRedirect = ({
  route,
  isAppReady = false,
  hasFirebaseSession = false,
  hasLegacyPinSession = false
} = {}) => {
  if (!isAppReady) return null

  // START_LOCATION Vue Routera ma pustą tablicę `matched`. App.vue nie może
  // wtedy oceniać roboczej ścieżki "/", bo właściwy URL nie został jeszcze
  // rozpoznany i publiczna aktywacja mogłaby zostać zastąpiona przez /login.
  if (!route?.matched?.length) return null

  return resolveRouteAuthenticationRedirect({
    route,
    hasFirebaseSession,
    hasLegacyPinSession
  })
}
