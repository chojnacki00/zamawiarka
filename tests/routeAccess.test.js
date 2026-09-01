import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  createMemoryHistory,
  createRouter
} from 'vue-router'
import {
  hasStoredLegacyPinSession,
  resolveAppAuthenticationRedirect,
  resolveAuthenticationRedirect,
  resolveRouteAuthenticationRedirect
} from '../src/utils/routeAccess.js'
import { shouldUseFirebaseEmulators } from '../src/utils/firebaseEmulatorMode.js'

const redirectFor = (path, options = {}) => resolveAuthenticationRedirect({
  path,
  hasFirebaseSession: false,
  hasLegacyPinSession: false,
  ...options
})

test('niezalogowany użytkownik może otworzyć logowanie Firebase', () => {
  assert.equal(redirectFor('/login'), null)
})

test('konto bez sesji wraca do logowania Firebase, a nie do PIN-u', () => {
  assert.equal(redirectFor('/konto'), '/login')
})

test('aktywacja z tokenem pozostaje publiczna', () => {
  assert.equal(redirectFor('/aktywacja?t=testowy-token'), null)
  assert.equal(redirectFor('/aktywacja'), null)
})

test('rzeczywisty router zachowuje publiczną aktywację i parametr tokenu', async () => {
  const testRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/konto', name: 'Konto', component: { template: '<div />' } },
      { path: '/aktywacja', name: 'Aktywacja', component: { template: '<div />' } },
      { path: '/ustawienia', name: 'Ustawienia', component: { template: '<div />' } }
    ]
  })
  testRouter.beforeEach(to => (
    resolveRouteAuthenticationRedirect({ route: to }) || true
  ))

  await testRouter.push('/aktywacja?t=abc')
  await testRouter.isReady()

  assert.equal(testRouter.currentRoute.value.path, '/aktywacja')
  assert.equal(testRouter.currentRoute.value.query.t, 'abc')
  assert.equal(testRouter.currentRoute.value.fullPath, '/aktywacja?t=abc')
})

test('rzeczywisty strażnik routera nadal chroni konto i widok biznesowy', async () => {
  const testRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/konto', name: 'Konto', component: { template: '<div />' } },
      { path: '/ustawienia', name: 'Ustawienia', component: { template: '<div />' } }
    ]
  })
  testRouter.beforeEach(to => (
    resolveRouteAuthenticationRedirect({ route: to }) || true
  ))

  await testRouter.push('/konto')
  assert.equal(testRouter.currentRoute.value.path, '/login')
  await testRouter.push('/ustawienia')
  assert.equal(testRouter.currentRoute.value.path, '/login')
})

test('strażnik App.vue czeka na rozpoznanie trasy i nie blokuje aktywacji', () => {
  assert.equal(resolveAppAuthenticationRedirect({
    route: { path: '/', name: undefined, matched: [] },
    isAppReady: true
  }), null)
  assert.equal(resolveAppAuthenticationRedirect({
    route: {
      path: '/aktywacja',
      name: 'Aktywacja',
      matched: [{ path: '/aktywacja' }]
    },
    isAppReady: true
  }), null)
  assert.equal(resolveAppAuthenticationRedirect({
    route: {
      path: '/konto',
      name: 'KontoDostep',
      matched: [{ path: '/konto' }]
    },
    isAppReady: true
  }), '/login')
})

test('ogólna aktywacja bez tokenu nie zawiera formularza tworzenia konta', async () => {
  const source = await readFile(
    new URL('../src/views/RegisterView.vue', import.meta.url),
    'utf8'
  )
  assert.match(source, /unikatowy link lub zeskanuj kod QR/)
  assert.doesNotMatch(source, /createUserWithEmailAndPassword/)
  assert.doesNotMatch(source, /autocomplete="new-password"/)
})

test('stare logowanie PIN pozostaje dostępną ścieżką przejściową', () => {
  assert.equal(redirectFor('/logowanie'), null)
})

test('chroniona trasa biznesowa blokuje brak sesji', () => {
  assert.equal(redirectFor('/grafik/grafiki'), '/login')
  assert.equal(redirectFor('/ustawienia'), '/login')
})

test('świeży storage nie uruchamia odtwarzania legacy PIN', () => {
  const storage = {
    getItem: () => null
  }
  assert.equal(hasStoredLegacyPinSession(storage), false)
  assert.equal(redirectFor('/login'), null)
})

test('kompletna sesja legacy zachowuje dostęp do dozwolonych tras', () => {
  const values = new Map([
    ['gm_emp_id', 'employee-1'],
    ['gm_rest_id', 'restaurant-1']
  ])
  const storage = {
    getItem: key => values.get(key) || null
  }

  assert.equal(hasStoredLegacyPinSession(storage), true)
  assert.equal(redirectFor('/grafik', {
    hasLegacyPinSession: true
  }), null)
  assert.equal(redirectFor('/konto', {
    hasLegacyPinSession: true
  }), '/login')
})

test('tryb emulatorowy nie zmienia zasad ochrony tras', () => {
  assert.equal(shouldUseFirebaseEmulators({
    DEV: false,
    PROD: true,
    VITE_USE_FIREBASE_EMULATORS: 'true'
  }), false)
  assert.equal(redirectFor('/rentownosc'), '/login')
  assert.equal(redirectFor('/login'), null)
  assert.equal(redirectFor('/konto', {
    hasFirebaseSession: true
  }), null)
})
