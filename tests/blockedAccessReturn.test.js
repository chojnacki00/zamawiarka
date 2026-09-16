import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('zablokowany dostęp pokazuje bezpośredni powrót do logowania', async () => {
  const source = await readSource('src/views/AccountAccessView.vue')
  const blockedState = source.slice(
    source.indexOf('v-else-if="sessionStore.accessRevoked"'),
    source.indexOf('v-else-if="sessionStore.deviceApprovalRequired"')
  )

  assert.match(blockedState, /Dostęp zablokowany|Dostęp do tej restauracji został zablokowany/)
  assert.match(blockedState, /@click="returnFromBlockedAccess">Wróć do logowania</)
  assert.doesNotMatch(blockedState, /Wyloguj to urządzenie|window\.confirm|logoutDevice/)
})

test('powrót z blokady czyści konto przed przejściem do loginu i nie pokazuje potwierdzenia', async () => {
  const source = await readSource('src/views/AccountAccessView.vue')
  const handler = source.slice(
    source.indexOf('const returnFromBlockedAccess'),
    source.indexOf('const logoutDevice')
  )

  assert.match(handler, /returnToLoginAfterAccessRevoked\(\)/)
  assert.match(handler, /router\.replace\('\/login'\)/)
  assert.ok(
    handler.indexOf('returnToLoginAfterAccessRevoked()') <
      handler.indexOf("router.replace('/login')")
  )
  assert.doesNotMatch(handler, /window\.confirm|deviceApprovalRequired/)
})

test('czyszczenie zablokowanego konta usuwa lokalny PIN także po ponownym uruchomieniu', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const cleanup = source.slice(
    source.indexOf('const clearLocalAccountAndSignOut'),
    source.indexOf('const disconnectCurrentDevice')
  )

  assert.match(cleanup, /localStorage\.getItem\(ACTIVE_RESTAURANT_KEY\)/)
  assert.match(cleanup, /readLocalApprovedDevice\(\{ authUid, restaurantId \}\)/)
  assert.match(cleanup, /clearLocalPin\(\{ authUid, deviceId \}\)/)
  assert.match(cleanup, /clearLocalApprovedDevice\(\{ authUid, restaurantId \}\)/)
  assert.match(cleanup, /runApplicationLockCleanup\(\)/)
  assert.match(cleanup, /clearSensitiveContext\(\)/)
  assert.match(cleanup, /localStorage\.removeItem\(ACTIVE_RESTAURANT_KEY\)/)
  assert.match(cleanup, /isLoading\.value = false/)
  assert.match(cleanup, /await signOut\(auth\)/)
  assert.match(cleanup, /const returnToLoginAfterAccessRevoked = \(\) => clearLocalAccountAndSignOut\(\)/)
  assert.doesNotMatch(cleanup, /deleteDoc|removeEmployeeDevice|deviceApprovalRequired\.value = true/)
})

test('świadome odłączanie aktywnego urządzenia nadal wymaga potwierdzenia', async () => {
  const [accountSource, pinSource] = await Promise.all([
    readSource('src/views/AccountAccessView.vue'),
    readSource('src/views/LocalPinLockView.vue')
  ])
  const activeLogout = accountSource.slice(
    accountSource.indexOf('const logoutDevice'),
    accountSource.indexOf('onMounted(async', accountSource.indexOf('const logoutDevice'))
  )

  assert.match(activeLogout, /window\.confirm\(/)
  assert.match(activeLogout, /Odłączyć to urządzenie\?/)
  assert.doesNotMatch(pinSource, /window\.confirm\(/)
  assert.match(pinSource, /role="alertdialog"/)
  assert.match(pinSource, /Odłącz urządzenie/)
})

test('pozostałe publiczne i przejściowe trasy dostępu pozostają rozdzielone', async () => {
  const [routerSource, routeAccessSource] = await Promise.all([
    readSource('src/router.js'),
    readSource('src/utils/routeAccess.js')
  ])

  for (const path of ['/pin', '/aktywacja', '/akcja-konta', '/logowanie']) {
    assert.match(`${routerSource}\n${routeAccessSource}`, new RegExp(path.replace('/', '\\/')))
  }
})
