import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('ekran PIN pokazuje odłączanie wyłącznie w ustawieniach urządzenia', async () => {
  const source = await readSource('src/views/LocalPinLockView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))
  const pinCard = template.slice(
    template.indexOf('<section class="pin-lock-card"'),
    template.indexOf('</section>', template.indexOf('<section class="pin-lock-card"'))
  )

  assert.match(template, /aria-label="Ustawienia urządzenia"/)
  assert.match(template, /id="device-settings-title">Ustawienia urządzenia</)
  assert.match(template, /class="settings-disconnect-button"/)
  assert.doesNotMatch(pinCard, /Odłącz urządzenie/)
})

test('panel ustawień zamyka przycisk, kliknięcie tła i Escape', async () => {
  const source = await readSource('src/views/LocalPinLockView.vue')

  assert.match(source, /@click\.self="closeSettings"/)
  assert.match(source, /aria-label="Zamknij ustawienia urządzenia"/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /closeSettings\(\)/)
})

test('własny modal pozwala anulować bez odłączania i zatwierdza tylko raz', async () => {
  const source = await readSource('src/views/LocalPinLockView.vue')
  const cancelHandler = source.slice(
    source.indexOf('const closeDisconnectConfirmation'),
    source.indexOf('const confirmDisconnectCurrentDevice')
  )
  const confirmHandler = source.slice(
    source.indexOf('const confirmDisconnectCurrentDevice'),
    source.indexOf('const handleKeyboard')
  )

  assert.match(source, /role="alertdialog"/)
  assert.match(source, /Lokalny PIN zostanie usunięty/)
  assert.doesNotMatch(source, /window\.confirm|window\.alert/)
  assert.doesNotMatch(cancelHandler, /disconnectCurrentDevice|router\.replace/)
  assert.match(confirmHandler, /if \(isBusy\.value \|\| !isDisconnectConfirmationOpen\.value\) return/)
  assert.match(confirmHandler, /sessionStore\.disconnectCurrentDevice\(\)/)
  assert.match(confirmHandler, /router\.replace\('\/login'\)/)
})

test('store odłącza dokładnie sesję wynikającą z auth_time i współdzieli reakcję listenera', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')
  const action = source.slice(
    source.indexOf('const disconnectCurrentDevice'),
    source.indexOf('const hasPermission', source.indexOf('const disconnectCurrentDevice'))
  )

  assert.match(action, /getFirebaseAuthTime\(user\)/)
  assert.match(action, /getDeviceSessionId\(authTime\)/)
  assert.match(action, /deviceRemovalCoordinator\.run\(/)
  assert.match(action, /deleteDoc\(sessionRef\)/)
  assert.match(action, /clearLocalAccountAndSignOut\(\)/)
  assert.doesNotMatch(action, /members[^\n]*delete|removeEmployeeDevice/)
})

test('lista urządzeń managera korzysta z aktywnej subskrypcji', async () => {
  const [storeSource, viewSource] = await Promise.all([
    readSource('src/stores/accountSessionStore.js'),
    readSource('src/views/UstawieniaZespoluView.vue')
  ])

  assert.match(storeSource, /const subscribeEmployeeDevices[\s\S]*onSnapshot\(collection\(/)
  assert.match(viewSource, /subscribeEmployeeDevices\(/)
  assert.match(viewSource, /stopEmployeeDevicesSubscription\(\)/)
  assert.match(viewSource, /onUnmounted\(\(\) => \{[\s\S]*stopEmployeeDevicesSubscription\(\)/)
})

test('karta grafiku zastępuje przycisk Otwórz i obsługuje klawiaturę', async () => {
  const source = await readSource('src/views/grafik/GrafikiListaView.vue')
  const template = source.slice(0, source.indexOf('<script setup>'))

  assert.match(template, /class="schedule-list-item"[\s\S]*role="link"[\s\S]*tabindex="0"/)
  assert.match(template, /@keydown\.enter\.prevent\.self="openSchedule\(schedule\.id\)"/)
  assert.match(template, /@keydown\.space\.prevent\.self="openSchedule\(schedule\.id\)"/)
  assert.match(template, /@click\.stop="openUnpublishConfirm\(schedule\)"/)
  assert.match(template, /@click\.stop="openDeleteConfirm\(schedule\)"/)
  assert.doesNotMatch(template, /schedule-list-open-button|>\s*Otwórz\s*›/)
  assert.match(source, /\.schedule-list-item:focus-visible/)
})
