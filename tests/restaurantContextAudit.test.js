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
