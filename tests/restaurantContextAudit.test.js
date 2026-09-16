import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const tenantStores = [
  'employeeGroupsStore.js',
  'employeesStore.js',
  'permissionProfilesStore.js',
  'publishedScheduleCalendarStore.js',
  'scheduleAvailabilityPeriodsStore.js',
  'scheduleDemandModelsStore.js',
  'scheduleDraftsStore.js',
  'scheduleEmploymentProfilesStore.js',
  'scheduleGeneratorSettingsStore.js',
  'schedulePositionsStore.js'
]

test('store’y biznesowe nie rozwiązują restaurantId przez employeeAuthStore', async () => {
  for (const fileName of tenantStores) {
    const source = await readFile(
      new URL(`../src/stores/${fileName}`, import.meta.url),
      'utf8'
    )

    assert.doesNotMatch(
      source,
      /employeeAuthStore(?:\(\))?\.requireRestaurantId\s*\(/
    )
    assert.match(source, /authorizationStore|useAuthorizationStore/)
  }
})

test('App korzysta z centralnego kontekstu i odrzuca snapshot starej restauracji', async () => {
  const source = await readFile(
    new URL('../src/App.vue', import.meta.url),
    'utf8'
  )

  assert.match(
    source,
    /const getCurrentRestaurantId = \(\) => \(\s*authorizationStore\.requireRestaurantId\(\)/
  )
  assert.match(source, /isRestaurantContextCurrent/)
  assert.match(source, /RESTAURANT_DATA_STATUS\.LOADING/)
  assert.match(source, /RESTAURANT_DATA_STATUS\.READY/)
  assert.match(source, /RESTAURANT_DATA_STATUS\.ERROR/)
  assert.match(source, /RESTAURANT_DATA_STATUS\.MISSING/)
  assert.match(source, /persistRestaurantDataWhenReady/)
  assert.match(source, /isRestaurantSnapshotCurrent/)
  assert.match(source, /loadRevision !== restaurantDataLoadRevision/)
  assert.match(source, /clearTimeout\(saveTimeout\)/)
  assert.doesNotMatch(
    source,
    /const getCurrentRestaurantId = \(\) => \(\s*employeeAuthStore\.restaurantId/
  )
})

test('cache ustawień generatora jest przypisany do konkretnej restauracji', async () => {
  const source = await readFile(
    new URL('../src/stores/scheduleGeneratorSettingsStore.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /loadedRestaurantId/)
  assert.match(source, /restaurantChanged/)
  assert.match(source, /isRestaurantContextCurrent/)
})

test('kontekst konta staje się aktywny dopiero po odczycie pracownika i profilu', async () => {
  const source = await readFile(
    new URL('../src/stores/accountSessionStore.js', import.meta.url),
    'utf8'
  )
  const loadContextStart = source.indexOf('const loadMembershipContext = async')
  const loadContextEnd = source.indexOf('const loadAccountContext = async')
  const loadContextSource = source.slice(loadContextStart, loadContextEnd)
  const clearPreviousPermissions = loadContextSource.indexOf(
    'permissions.value = {}'
  )
  const employeeRead = loadContextSource.indexOf("'employees'")
  const profileRead = loadContextSource.indexOf("'permissionProfiles'")
  const contextReady = loadContextSource.indexOf(
    'isMembershipContextReady.value = true'
  )

  assert.match(source, /isMembershipContextReady\.value &&/)
  assert.ok(clearPreviousPermissions >= 0)
  assert.ok(clearPreviousPermissions < employeeRead)
  assert.ok(employeeRead >= 0)
  assert.ok(profileRead > employeeRead)
  assert.ok(contextReady > profileRead)
})

test('App ponawia aktywację po rozstrzygnięciu pełnego kontekstu restauracji', async () => {
  const source = await readFile(
    new URL('../src/App.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /accountSessionStore\.isMembershipContextReady/)
  assert.match(source, /authorizationStore\.restaurantId/)
  assert.match(source, /event: 'context-ready'/)
  assert.match(source, /event: 'ready'/)
  assert.match(source, /mode: import\.meta\.env\.MODE/)
  assert.match(source, /restaurantDataLoadError/)
  assert.match(source, /retryRestaurantDataLoad/)
  assert.match(source, /hasAccountBusinessDataAccess\.value/)
})

test('App normalizuje słowniki legacy tylko w pamięci i serializuje je przed zapisem', async () => {
  const source = await readFile(
    new URL('../src/App.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /normalizeRestaurantList\('suppliers'/)
  assert.match(source, /serializeRestaurantList\('suppliers'/)
  assert.match(
    source,
    /\{ \[field\]: serializeRestaurantList\(field, value\) \}/
  )
})
