import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readSource = relativePath => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8'
)

test('ręczne Wyloguj i bezczynność korzystają z jednej funkcji centralnej blokady', async () => {
  const source = await readSource('src/App.vue')
  const calls = source.match(/accountSessionStore\.lockApplication\(\)/g) || []

  assert.equal(calls.length, 2)
  assert.match(source, /const handleLogout = async \(\) =>/)
  assert.match(source, /const resetInactivityTimer = \(\) =>/)
  assert.match(source, /registerApplicationLockCleanup/)
  assert.match(source, /clearPiniaBusinessSessionData\(\)/)
  assert.match(source, /saveTimeout = null/)

  const cleanup = source.slice(
    source.indexOf('registerApplicationLockCleanup(() =>'),
    source.indexOf('let activatedRestaurantId')
  )
  assert.ok(
    cleanup.indexOf('stopCompanyDataListeners()') <
      cleanup.indexOf('resetCompanyDataState()'),
    'Listenery i opóźniony zapis muszą zostać zatrzymane przed resetem danych.'
  )
})

test('nowy ekran PIN ma oddzielną trasę i żądaną klawiaturę ekranową', async () => {
  const [routerSource, viewSource, legacySource] = await Promise.all([
    readSource('src/router.js'),
    readSource('src/views/LocalPinLockView.vue'),
    readSource('src/views/PinLoginView.vue')
  ])

  assert.match(routerSource, /path: LOCAL_PIN_LOCK_PATH/)
  assert.match(viewSource, /Wpisz 4-cyfrowy PIN/)
  assert.match(viewSource, /Object\.freeze\(\[1, 2, 3, 4, 5, 6, 7, 8, 9\]\)/)
  assert.match(viewSource, /aria-label="Usuń ostatnią cyfrę"/)
  assert.match(viewSource, /aria-label="Cyfra 0"/)
  assert.match(viewSource, /aria-label="Odblokuj aplikację"/)
  assert.match(legacySource, /kod parowania/i)
})

test('odblokowanie ponownie odczytuje członkostwo i dokładną sesję urządzenia', async () => {
  const source = await readSource('src/stores/accountSessionStore.js')

  assert.match(source, /const unlockWithLocalPin = async pin =>/)
  assert.match(source, /'restaurants',[\s\S]*'members',[\s\S]*'deviceSessions'/)
  assert.match(source, /getFirebaseAuthTime\(user\)/)
  assert.match(source, /getLocalPinAccessFailure\(/)
  assert.match(source, /verifyLocalPin\(/)
  assert.match(source, /clearLocalApprovedDevice\(/)
})

test('centralne czyszczenie obejmuje store’y zespołu i grafiku', async () => {
  const source = await readSource('src/utils/businessSessionCleanup.js')

  for (const call of [
    'useEmployeesStore().clearSensitiveData()',
    'useSchedulePositionsStore().clearSensitiveData()',
    'useEmployeeGroupsStore().clearSensitiveData()',
    'usePermissionProfilesStore().clearSensitiveData()',
    'useScheduleDemandModelsStore().clearSensitiveData()',
    'useScheduleEmploymentProfilesStore().clearSensitiveData()',
    'useScheduleGeneratorSettingsStore().clearSensitiveData()',
    'useScheduleDraftsStore().clearSensitiveData()',
    'useScheduleAvailabilityPeriodsStore().clearSensitiveData()',
    'usePublishedScheduleCalendarStore().reset()'
  ]) {
    assert.ok(source.includes(call), `Brak czyszczenia: ${call}`)
  }
})

test('pełne odłączenie urządzenia wymaga wyraźnego potwierdzenia', async () => {
  const [pinSource, accountSource] = await Promise.all([
    readSource('src/views/LocalPinLockView.vue'),
    readSource('src/views/AccountAccessView.vue')
  ])

  assert.match(pinSource, /window\.confirm\(/)
  assert.match(pinSource, /Odłącz urządzenie/)
  assert.match(accountSource, /window\.confirm\(/)
  assert.match(accountSource, /Wyloguj to urządzenie/)
})
