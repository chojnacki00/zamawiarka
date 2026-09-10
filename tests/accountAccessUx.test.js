import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  buildEmployeeDeviceSummary,
  isPermissionDeniedError,
  shouldTreatBusinessPermissionDeniedAsBlocked
} from '../src/utils/accountAccessUx.js'

test('tylko permission-denied uruchamia sprawdzenie utraty członkostwa', () => {
  assert.equal(isPermissionDeniedError({ code: 'permission-denied' }), true)
  assert.equal(isPermissionDeniedError({ code: 'firestore/permission-denied' }), true)
  assert.equal(isPermissionDeniedError({ code: 'unavailable' }), false)
})

test('odmowa biznesowa oznacza blokadę dopiero po potwierdzeniu członkostwa', () => {
  const common = {
    error: { code: 'permission-denied' },
    expectedRestaurantId: 'restaurant-a',
    currentRestaurantId: 'restaurant-a',
    expectedAuthUid: 'employee-a',
    currentAuthUid: 'employee-a'
  }

  assert.equal(shouldTreatBusinessPermissionDeniedAsBlocked({
    ...common,
    membershipExists: true,
    membershipStatus: 'active'
  }), false)
  assert.equal(shouldTreatBusinessPermissionDeniedAsBlocked({
    ...common,
    membershipExists: true,
    membershipStatus: 'blocked'
  }), true)
  assert.equal(shouldTreatBusinessPermissionDeniedAsBlocked({
    ...common,
    membershipExists: false
  }), true)
  assert.equal(shouldTreatBusinessPermissionDeniedAsBlocked({
    ...common,
    currentRestaurantId: 'restaurant-b',
    membershipExists: false
  }), false)
})

test('podsumowanie urządzenia nie ujawnia identyfikatorów technicznych', () => {
  const date = new Date('2026-09-10T10:00:00.000Z')
  const summary = buildEmployeeDeviceSummary({
    deviceName: 'Telefon służbowy',
    status: 'active',
    approvedAt: date,
    authUid: 'secret-auth-uid',
    authTime: 123,
    deviceId: 'secret-device-id',
    sessionId: 'secret-session-id'
  })

  assert.deepEqual(summary, {
    name: 'Telefon służbowy',
    statusLabel: 'Aktywne',
    dateValue: date
  })
})

test('wszystkie listenery danych biznesowych mają centralną obsługę błędu', async () => {
  const source = await readFile(
    new URL('../src/App.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /const handleBusinessListenerError = async/)
  assert.match(source, /handleBusinessPermissionDenied\(\{ error, restaurantId \}\)/)
  for (const listenerSource of [
    "source: 'app/state'",
    "source: 'koszyka'",
    "source: 'zamówień'",
    "source: 'menu'",
    "source: 'towarów'"
  ]) assert.ok(source.includes(listenerSource), `Brak obsługi: ${listenerSource}`)
})

test('potwierdzona blokada kończy ładowanie i uruchamia centralne czyszczenie', async () => {
  const source = await readFile(
    new URL('../src/stores/accountSessionStore.js', import.meta.url),
    'utf8'
  )
  const revokedHandler = source.slice(
    source.indexOf('const handleAccessRevoked'),
    source.indexOf('const handleBusinessPermissionDenied')
  )

  assert.match(revokedHandler, /runApplicationLockCleanup\(\)/)
  assert.match(revokedHandler, /stopSensitiveListeners\(\)/)
  assert.match(revokedHandler, /isLoading\.value = false/)
  assert.match(revokedHandler, /accessRevoked\.value = true/)
  assert.match(revokedHandler, /permissions\.value = \{\}/)
})
