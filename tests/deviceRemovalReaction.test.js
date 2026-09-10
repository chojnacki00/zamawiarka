import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  DEVICE_ACCESS_REMOVED_HEADING,
  DEVICE_ACCESS_REMOVED_MESSAGE,
  runDeviceRemovalReaction
} from '../src/utils/deviceRemovalReaction.js'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('usunięcie urządzenia wykonuje czyszczenie w bezpiecznej kolejności', async () => {
  const calls = []
  const step = name => () => { calls.push(name) }

  await runDeviceRemovalReaction({
    markAccessRemoved: step('removed'),
    finishLoading: step('loading-finished'),
    cancelAndClearBusinessData: step('business-cleared'),
    stopAccountListeners: step('account-listeners-stopped'),
    clearLocalPin: step('pin-cleared'),
    clearApprovedDevice: step('approved-device-cleared'),
    clearLocalSession: step('session-cleared'),
    signOutFirebase: async () => { calls.push('firebase-signed-out') }
  })

  assert.deepEqual(calls, [
    'removed',
    'loading-finished',
    'business-cleared',
    'account-listeners-stopped',
    'pin-cleared',
    'approved-device-cleared',
    'session-cleared',
    'firebase-signed-out'
  ])
})

test('końcowy komunikat usunięcia urządzenia nie zawiera akcji wylogowania', async () => {
  const source = await readSource('src/views/AccountAccessView.vue')
  const removedState = source.slice(
    source.indexOf('<template v-if="sessionStore.deviceAccessRemoved">'),
    source.indexOf('<div v-else-if="sessionStore.isLoading"')
  )

  assert.equal(DEVICE_ACCESS_REMOVED_HEADING, 'Dostęp urządzenia usunięty')
  assert.match(DEVICE_ACCESS_REMOVED_MESSAGE, /poproś managera o nowe zaproszenie/)
  assert.match(removedState, /DEVICE_ACCESS_REMOVED_MESSAGE/)
  assert.doesNotMatch(removedState, /Wyloguj|Odłącz|Przywróć|Zaloguj/)
  assert.match(source, /v-if="!sessionStore\.deviceAccessRemoved"[\s\S]*Wyloguj to urządzenie/)
})

test('listener rozróżnia brak dokumentu sesji od zwykłego błędu sieci', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const listener = source.slice(
    source.indexOf('unsubscribeDeviceSession = onSnapshot'),
    source.indexOf('const employeeRef = doc', source.indexOf('unsubscribeDeviceSession = onSnapshot'))
  )

  assert.match(listener, /if \(!snapshot\.exists\(\)\)/)
  assert.match(listener, /handleDeviceSessionRemoved\(\)/)
  assert.match(listener, /isPermissionDeniedError\(listenerError\)/)
  assert.match(listener, /getDoc\(sessionRef\)/)
  assert.match(listener, /handleContextListenerError\('sesji urządzenia', listenerError\)/)
})

test('reakcja jest jednokrotna i zachowuje komunikat po zdarzeniu Auth', async () => {
  const [storeSource, appSource] = await Promise.all([
    readSource('src/stores/accountSessionStore.js'),
    readSource('src/App.vue')
  ])

  assert.match(storeSource, /if \(deviceRemovalPromise\) return deviceRemovalPromise/)
  assert.match(storeSource, /preserveDeviceRemovalNotice/)
  assert.match(storeSource, /await signOut\(auth\)/)
  assert.match(appSource, /if \(accountSessionStore\.deviceAccessRemoved\)[\s\S]*router\.replace\('\/konto'\)/)
})

test('ponowne uruchomienie z lokalnym śladem usuniętej sesji wykonuje pełne czyszczenie', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const missingSession = source.slice(
    source.indexOf('if (!sessionSnapshot.exists())'),
    source.indexOf('const session = {', source.indexOf('if (!sessionSnapshot.exists())'))
  )

  assert.match(missingSession, /readLocalApprovedDevice/)
  assert.match(missingSession, /await handleDeviceSessionRemoved\(\)/)
  assert.match(source, /clearLocalPin\(\{ authUid, deviceId \}\)/)
  assert.match(source, /clearLocalApprovedDevice\(\{ authUid, restaurantId \}\)/)
})
