import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  createDeviceRemovalCoordinator,
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
    finishLoading: step('loading-finished'),
    cancelAndClearBusinessData: step('business-cleared'),
    stopAccountListeners: step('account-listeners-stopped'),
    clearLocalPin: step('pin-cleared'),
    clearApprovedDevice: step('approved-device-cleared'),
    clearLocalSession: step('session-cleared'),
    signOutFirebase: async () => { calls.push('firebase-signed-out') }
  })

  assert.deepEqual(calls, [
    'loading-finished',
    'business-cleared',
    'account-listeners-stopped',
    'pin-cleared',
    'approved-device-cleared',
    'session-cleared',
    'firebase-signed-out'
  ])
})

test('usunięcie aktywnego urządzenia nie zachowuje pośredniego ekranu końcowego', async () => {
  const [storeSource, appSource, accountSource, routeSource] = await Promise.all([
    readSource('src/stores/accountSessionStore.js'),
    readSource('src/App.vue'),
    readSource('src/views/AccountAccessView.vue'),
    readSource('src/utils/routeAccess.js')
  ])

  for (const source of [storeSource, appSource, accountSource, routeSource]) {
    assert.doesNotMatch(source, /deviceAccessRemoved|Dostęp urządzenia usunięty/)
  }
  assert.match(storeSource, /await signOut\(auth\)/)
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

test('reakcja jest jednokrotna i po zdarzeniu Auth prowadzi zwykłą ścieżką do logowania', async () => {
  const [storeSource, appSource] = await Promise.all([
    readSource('src/stores/accountSessionStore.js'),
    readSource('src/App.vue')
  ])

  assert.match(storeSource, /deviceRemovalCoordinator\.run\(/)
  assert.match(storeSource, /await signOut\(auth\)/)
  assert.doesNotMatch(appSource, /deviceAccessRemoved/)
  assert.match(appSource, /resolveRouteAuthenticationRedirect\([\s\S]*hasFirebaseSession: false/)
})

test('akcja użytkownika i listener współdzielą jedną trwającą reakcję usunięcia', async () => {
  const coordinator = createDeviceRemovalCoordinator()
  let calls = 0
  let finishOperation
  const operation = () => {
    calls += 1
    return new Promise(resolve => { finishOperation = resolve })
  }

  const fromClick = coordinator.run(operation)
  const fromListener = coordinator.run(operation)

  assert.equal(calls, 0)
  await Promise.resolve()
  assert.equal(calls, 1)
  finishOperation(true)
  assert.equal(await fromClick, true)
  assert.equal(await fromListener, true)
  assert.equal(calls, 1)
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
