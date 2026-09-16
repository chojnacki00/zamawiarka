import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import {
  createMemoryHistory,
  createRouter
} from 'vue-router'
import { useAccountSessionStore } from '../src/stores/accountSessionStore.js'
import {
  ensureAccountSessionForRoute,
  resolveLocalPinGuardRedirect,
  resolveRouteAuthenticationRedirect
} from '../src/utils/routeAccess.js'

const routes = [
  { path: '/', component: { template: '<div />' } },
  { path: '/login', component: { template: '<div />' } },
  { path: '/pin', component: { template: '<div />' } }
]

const restoredUser = {
  uid: 'auth-julia',
  email: 'julia@example.test',
  emailVerified: true
}

beforeEach(() => {
  setActivePinia(createPinia())
})

const createStartupRouter = ({
  firebaseUser,
  pinLocked = false
}) => {
  const accountSessionStore = useAccountSessionStore()
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  let initializeCalls = 0

  router.beforeEach(async to => {
    await ensureAccountSessionForRoute({
      firebaseUser,
      accountSessionStore,
      initializeOptions: {
        loadContext: async user => {
          initializeCalls += 1
          accountSessionStore.account = { id: user.uid }
          accountSessionStore.isPinLocked = pinLocked
        }
      }
    })

    const pinRedirect = firebaseUser
      ? resolveLocalPinGuardRedirect({
          path: to.path,
          isPinLocked: accountSessionStore.isPinLocked,
          requiresAccountAction: accountSessionStore.isPinLocked
        })
      : null
    if (pinRedirect) return pinRedirect

    return resolveRouteAuthenticationRedirect({
      route: to,
      hasFirebaseSession: Boolean(firebaseUser),
      hasLegacyPinSession: false
    }) || true
  })

  return {
    accountSessionStore,
    router,
    getInitializeCalls: () => initializeCalls
  }
}

test('odtworzona sesja Firebase uruchamia initializeForUser podczas startu routera', async () => {
  const context = createStartupRouter({ firebaseUser: restoredUser })

  await context.router.push('/')
  await context.router.isReady()

  assert.equal(context.router.currentRoute.value.path, '/')
  assert.equal(context.accountSessionStore.isInitialized, true)
  assert.equal(context.accountSessionStore.authUser.uid, restoredUser.uid)
  assert.equal(context.getInitializeCalls(), 1)
})

test('start bez sesji Firebase prowadzi do logowania bez inicjalizacji konta', async () => {
  const context = createStartupRouter({ firebaseUser: null })

  await context.router.push('/')
  await context.router.isReady()

  assert.equal(context.router.currentRoute.value.path, '/login')
  assert.equal(context.getInitializeCalls(), 0)
})

test('odtworzona zablokowana sesja przechodzi po inicjalizacji na ekran PIN', async () => {
  const context = createStartupRouter({
    firebaseUser: restoredUser,
    pinLocked: true
  })

  await context.router.push('/')
  await context.router.isReady()

  assert.equal(context.router.currentRoute.value.path, '/pin')
  assert.equal(context.accountSessionStore.isInitialized, true)
  assert.equal(context.getInitializeCalls(), 1)
})
