const FIREBASE_PUBLIC_PATHS = new Set([
  '/login',
  '/rejestracja',
  '/aktywacja',
  '/akcja-konta',
  '/potwierdz-email'
])

export const LEGACY_PIN_LOGIN_PATH = '/logowanie'
export const LOCAL_PIN_LOCK_PATH = '/pin'
export const ACTIVATION_ROUTE_NAME = 'Aktywacja'
export const EMAIL_ACTION_PATH = '/akcja-konta'
export const EMAIL_ACTION_ROUTE_NAME = 'AkcjaKonta'
export const EMAIL_VERIFICATION_ALIAS_PATH = '/potwierdz-email'

export const resolveAccountActionPath = ({
  isPinLocked = false
} = {}) => isPinLocked ? LOCAL_PIN_LOCK_PATH : '/konto'

const normalizeRoutePath = path => (
  String(path || '/').split(/[?#]/, 1)[0] || '/'
)

export const resolveLocalPinGuardRedirect = ({
  path,
  isPinLocked = false,
  requiresAccountAction = false
} = {}) => {
  const normalizedPath = normalizeRoutePath(path)

  if (isPinLocked) {
    return normalizedPath === LOCAL_PIN_LOCK_PATH
      ? null
      : LOCAL_PIN_LOCK_PATH
  }

  if (normalizedPath === LOCAL_PIN_LOCK_PATH) {
    return requiresAccountAction ? '/konto' : '/'
  }

  return null
}

export const createLocalPinRedirector = router => {
  let pendingNavigation = null

  return async () => {
    if (router.currentRoute.value.path === LOCAL_PIN_LOCK_PATH) return false
    if (pendingNavigation) {
      await pendingNavigation
      return false
    }

    pendingNavigation = Promise.resolve(
      router.replace(LOCAL_PIN_LOCK_PATH)
    )

    try {
      await pendingNavigation
      return true
    } finally {
      pendingNavigation = null
    }
  }
}

export const isPublicActivationRoute = route => (
  route?.name === ACTIVATION_ROUTE_NAME ||
  String(route?.path || '').split(/[?#]/, 1)[0] === '/aktywacja'
)

export const isPublicEmailActionRoute = route => (
  route?.name === EMAIL_ACTION_ROUTE_NAME ||
  [EMAIL_ACTION_PATH, EMAIL_VERIFICATION_ALIAS_PATH].includes(
    String(route?.path || '').split(/[?#]/, 1)[0]
  )
)

// Alias eksportu pozostaje przejściowo dla istniejących wywołań i testów.
export const isPublicEmailVerificationRoute = isPublicEmailActionRoute

export const isPublicAuthFlowRoute = route => (
  isPublicActivationRoute(route) ||
  isPublicEmailActionRoute(route)
)

export const shouldDeferAccountBootstrapForActivation = ({
  route,
  user
} = {}) => (
  isPublicActivationRoute(route) &&
  Boolean(user) &&
  user.emailVerified !== true
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
  const normalizedPath = normalizeRoutePath(path)

  if (normalizedPath === '/konto') {
    return hasFirebaseSession ? null : '/login'
  }

  // Nowy ekran lokalnego PIN-u należy wyłącznie do kont Firebase.
  // Sesja legacy nadal korzysta z osobnej trasy /logowanie.
  if (normalizedPath === LOCAL_PIN_LOCK_PATH) {
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
  if (isPublicAuthFlowRoute(route)) return null

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
