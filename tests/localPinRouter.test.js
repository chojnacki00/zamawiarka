import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createMemoryHistory,
  createRouter
} from 'vue-router'
import {
  createLocalPinRedirector,
  LOCAL_PIN_LOCK_PATH,
  resolveAccountActionPath,
  resolveLocalPinGuardRedirect,
  resolveRouteAuthenticationRedirect
} from '../src/utils/routeAccess.js'

const routes = [
  { path: '/', name: 'Home', component: { template: '<div />' } },
  { path: '/login', name: 'Login', component: { template: '<div />' } },
  { path: '/logowanie', name: 'LogowaniePIN', component: { template: '<div />' } },
  { path: '/pin', name: 'BlokadaPIN', component: { template: '<div />' } },
  { path: '/konto', name: 'Konto', component: { template: '<div />' } },
  { path: '/aktywacja', name: 'Aktywacja', component: { template: '<div />' } }
]

const createTestRouter = ({
  hasFirebaseSession = true,
  hasLegacyPinSession = false,
  isPinLocked = false,
  requiresAccountAction = isPinLocked
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  let localPinRedirectCount = 0

  router.beforeEach(to => {
    if (hasFirebaseSession) {
      const localPinRedirect = resolveLocalPinGuardRedirect({
        path: to.path,
        isPinLocked,
        requiresAccountAction
      })
      if (localPinRedirect) {
        localPinRedirectCount += 1
        return localPinRedirect
      }

      if (
        requiresAccountAction &&
        !['/konto', '/aktywacja', LOCAL_PIN_LOCK_PATH].includes(to.path)
      ) {
        return resolveAccountActionPath({ isPinLocked })
      }
    }

    return resolveRouteAuthenticationRedirect({
      route: to,
      hasFirebaseSession,
      hasLegacyPinSession
    }) || true
  })

  return {
    router,
    setPinLocked: value => {
      isPinLocked = value
      requiresAccountAction = value
    },
    getLocalPinRedirectCount: () => localPinRedirectCount
  }
}

test('zablokowany pracownik przechodzi z / do /pin dokładnie raz', async () => {
  const context = createTestRouter({ isPinLocked: true })

  await context.router.push('/')
  await context.router.isReady()

  assert.equal(context.router.currentRoute.value.path, '/pin')
  assert.equal(context.getLocalPinRedirectCount(), 1)
})

test('strażnik pozostawia zablokowanego pracownika na /pin', async () => {
  const context = createTestRouter({ isPinLocked: true })

  await context.router.push('/pin')
  await context.router.isReady()

  assert.equal(context.router.currentRoute.value.path, '/pin')
  assert.equal(context.getLocalPinRedirectCount(), 0)
})

test('/konto przy lokalnej blokadzie prowadzi tylko do /pin', async () => {
  const context = createTestRouter({ isPinLocked: true })

  await context.router.push('/konto')

  assert.equal(context.router.currentRoute.value.path, '/pin')
  assert.equal(context.getLocalPinRedirectCount(), 1)
})

test('odświeżenie bezpośrednio na /pin nie rozpoczyna kolejnego przekierowania', async () => {
  const context = createTestRouter({ isPinLocked: true })

  await context.router.replace('/pin')
  await context.router.replace('/pin')

  assert.equal(context.router.currentRoute.value.path, '/pin')
  assert.equal(context.getLocalPinRedirectCount(), 0)
})

test('po poprawnym PIN-ie pracownik przechodzi do ekranu głównego', async () => {
  const context = createTestRouter({ isPinLocked: true })
  await context.router.push('/pin')

  context.setPinLocked(false)
  await context.router.replace('/')

  assert.equal(context.router.currentRoute.value.path, '/')
})

test('brak Firebase Auth prowadzi do /login', async () => {
  const context = createTestRouter({
    hasFirebaseSession: false,
    isPinLocked: false,
    requiresAccountAction: false
  })

  await context.router.push('/konto')

  assert.equal(context.router.currentRoute.value.path, '/login')
})

test('właściciel bez lokalnego PIN-u pozostaje na ekranie głównym', async () => {
  const context = createTestRouter({
    hasFirebaseSession: true,
    isPinLocked: false,
    requiresAccountAction: false
  })

  await context.router.push('/')

  assert.equal(context.router.currentRoute.value.path, '/')
})

test('sesja legacy zachowuje osobne logowanie /logowanie', async () => {
  const context = createTestRouter({
    hasFirebaseSession: false,
    hasLegacyPinSession: true,
    isPinLocked: false,
    requiresAccountAction: false
  })

  await context.router.push('/logowanie')

  assert.equal(context.router.currentRoute.value.path, '/logowanie')
})

test('publiczna aktywacja zachowuje token bez sesji', async () => {
  const context = createTestRouter({
    hasFirebaseSession: false,
    isPinLocked: false,
    requiresAccountAction: false
  })

  await context.router.push('/aktywacja?t=token-testowy')

  assert.equal(context.router.currentRoute.value.fullPath, '/aktywacja?t=token-testowy')
})

test('centralny redirector scala równoległe żądania router.replace do jednego', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  await router.push('/')
  let pinNavigationCount = 0
  router.beforeEach(to => {
    if (to.path === LOCAL_PIN_LOCK_PATH) pinNavigationCount += 1
    return true
  })
  const redirectToLocalPin = createLocalPinRedirector(router)

  const results = await Promise.all([
    redirectToLocalPin(),
    redirectToLocalPin(),
    redirectToLocalPin()
  ])

  assert.equal(router.currentRoute.value.path, '/pin')
  assert.equal(pinNavigationCount, 1)
  assert.deepEqual(results, [true, false, false])
})
