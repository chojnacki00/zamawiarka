import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createScheduleListenerSlot,
  getScheduleAvailabilityAccessPlan,
  normalizeAvailabilitySelectionForAccess,
  SCHEDULE_AVAILABILITY_ACCESS_MODE,
  shouldIgnoreScheduleListenerCallback,
  shouldIgnoreScheduleListenerError
} from '../src/utils/scheduleAvailabilityAccess.js'

const PERMISSION_DENIED = { code: 'permission-denied' }
const NETWORK_ERROR = { code: 'unavailable' }

const handleListenerError = ({
  slot,
  listener,
  error,
  managerAccessRequired = true,
  managerAccessAtStart = true
}) => {
  const ignored = shouldIgnoreScheduleListenerError({
    listener,
    isCurrentListener: slot.isCurrent,
    managerAccessRequired,
    managerAccessAtStart,
    error
  })

  if (!ignored) console.error('listener-error', error)
  return ignored
}

const captureConsoleErrors = callback => {
  const originalConsoleError = console.error
  const calls = []
  console.error = (...args) => calls.push(args)

  try {
    return { calls, result: callback() }
  } finally {
    console.error = originalConsoleError
  }
}

test('zwykły pracownik nie uruchamia managerskich odczytów grafiku', () => {
  assert.deepEqual(getScheduleAvailabilityAccessPlan(), {
    mode: SCHEDULE_AVAILABILITY_ACCESS_MODE.OWN,
    loadEmployees: false,
    loadPositions: false,
    loadDemandModels: false,
    loadTeamAvailability: false
  })
})

test('manager otrzymuje dane potrzebne do kontroli obsady', () => {
  const plan = getScheduleAvailabilityAccessPlan({
    canManageSchedule: true
  })

  assert.equal(plan.mode, SCHEDULE_AVAILABILITY_ACCESS_MODE.MANAGER)
  assert.equal(plan.loadEmployees, true)
  assert.equal(plan.loadPositions, true)
  assert.equal(plan.loadDemandModels, true)
  assert.equal(plan.loadTeamAvailability, true)
})

test('odebranie uprawnienia przełącza widok na własne dyspozycje', () => {
  assert.deepEqual(normalizeAvailabilitySelectionForAccess({
    canManageSchedule: false,
    selectedViewMode: 'all',
    loggedEmployeeId: 'employee-julia'
  }), {
    selectedViewMode: 'mine',
    selectedEmployeeId: 'employee-julia'
  })
})

test('prawidłowy snapshot i późniejsze permission-denied kończą tę subskrypcję bez console.error', () => {
  const slot = createScheduleListenerSlot('demand-models')
  const listener = slot.begin()
  slot.attach(listener, () => {})

  assert.equal(listener.hasDeliveredSnapshot, false)
  assert.equal(slot.markSnapshotDelivered(listener), true)
  assert.equal(listener.hasDeliveredSnapshot, true)

  const { calls, result } = captureConsoleErrors(() => (
    handleListenerError({
      slot,
      listener,
      error: PERMISSION_DENIED
    })
  ))

  assert.equal(result, true)
  assert.equal(calls.length, 0)
})

test('permission-denied przed pierwszym snapshotem jest raportowany', () => {
  const slot = createScheduleListenerSlot('team-availability')
  const listener = slot.begin()

  const { calls, result } = captureConsoleErrors(() => (
    handleListenerError({
      slot,
      listener,
      error: PERMISSION_DENIED
    })
  ))

  assert.equal(listener.hasDeliveredSnapshot, false)
  assert.equal(result, false)
  assert.equal(calls.length, 1)
})

test('błąd sieciowy po prawidłowym snapshotcie nadal jest raportowany', () => {
  const slot = createScheduleListenerSlot('month-availability')
  const listener = slot.begin()
  slot.markSnapshotDelivered(listener)

  const { calls, result } = captureConsoleErrors(() => (
    handleListenerError({
      slot,
      listener,
      error: NETWORK_ERROR
    })
  ))

  assert.equal(result, false)
  assert.equal(calls.length, 1)
})

test('własny listener nie ukrywa permission-denied po snapshotcie', () => {
  const slot = createScheduleListenerSlot('own-availability')
  const listener = slot.begin()
  slot.markSnapshotDelivered(listener)

  const { calls, result } = captureConsoleErrors(() => (
    handleListenerError({
      slot,
      listener,
      error: PERMISSION_DENIED,
      managerAccessRequired: false
    })
  ))

  assert.equal(result, false)
  assert.equal(calls.length, 1)
})

test('każdy cykl nadania i odebrania tworzy nową subskrypcję z wyzerowanym stanem snapshotu', () => {
  const kinds = [
    'demand-models',
    'employee-availability',
    'team-availability',
    'month-availability'
  ]

  kinds.forEach(kind => {
    const slot = createScheduleListenerSlot(kind)
    let unsubscribeCalls = 0

    for (let cycle = 0; cycle < 5; cycle += 1) {
      const listener = slot.begin()
      slot.attach(listener, () => {
        unsubscribeCalls += 1
      })

      assert.equal(listener.hasDeliveredSnapshot, false)
      assert.equal(slot.getStats().activeCount, 1)
      assert.equal(slot.markSnapshotDelivered(listener), true)
      assert.equal(handleListenerError({
        slot,
        listener,
        error: PERMISSION_DENIED
      }), true)
      assert.equal(slot.finish(listener), true)
      assert.equal(slot.getStats().activeCount, 0)
    }

    assert.equal(unsubscribeCalls, 5)

    const grantedAgain = slot.begin()
    assert.equal(grantedAgain.hasDeliveredSnapshot, false)
    assert.equal(slot.getStats().activeCount, 1)
    slot.stop()
  })
})

test('spóźnione callbacki starej generacji są ignorowane i nie zmieniają nowej subskrypcji', () => {
  const slot = createScheduleListenerSlot('employee-availability')
  const oldListener = slot.begin()
  slot.markSnapshotDelivered(oldListener)

  const currentListener = slot.begin()
  assert.equal(currentListener.hasDeliveredSnapshot, false)
  assert.equal(slot.isCurrent(oldListener), false)
  assert.equal(slot.markSnapshotDelivered(oldListener), false)

  const staleNetworkError = captureConsoleErrors(() => (
    handleListenerError({
      slot,
      listener: oldListener,
      error: NETWORK_ERROR
    })
  ))

  assert.equal(staleNetworkError.result, true)
  assert.equal(staleNetworkError.calls.length, 0)
  assert.equal(currentListener.hasDeliveredSnapshot, false)

  assert.equal(shouldIgnoreScheduleListenerCallback({
    listenerRevision: oldListener.revision,
    currentRevision: slot.getRevision(),
    error: NETWORK_ERROR
  }), true)

  const currentPermissionError = captureConsoleErrors(() => (
    handleListenerError({
      slot,
      listener: currentListener,
      error: PERMISSION_DENIED
    })
  ))

  assert.equal(currentPermissionError.result, false)
  assert.equal(currentPermissionError.calls.length, 1)
})

test('widok i store oznaczają prawidłowy snapshot na konkretnej subskrypcji', async () => {
  const viewSource = await readFile(new URL(
    '../src/views/grafik/GrafikKalendarzDyspozycjiView.vue',
    import.meta.url
  ), 'utf8')
  const storeSource = await readFile(new URL(
    '../src/stores/scheduleDemandModelsStore.js',
    import.meta.url
  ), 'utf8')

  assert.equal(
    (viewSource.match(/markSnapshotDelivered\(listener\)/g) || []).length,
    3
  )
  assert.equal(
    (storeSource.match(/markSnapshotDelivered\(listener\)/g) || []).length,
    1
  )
  assert.match(viewSource, /isCurrentListener:\s*monthAvailabilityListenerSlot\.isCurrent/)
  assert.match(viewSource, /isCurrentListener:\s*teamAvailabilityListenerSlot\.isCurrent/)
  assert.match(viewSource, /isCurrentListener:\s*ownAvailabilityListenerSlot\.isCurrent/)
  assert.match(storeSource, /isCurrentListener:\s*modelsListenerSlot\.isCurrent/)
})

test('zawodny dodatkowy odczyt uprawnienia i diagnostyka zostały usunięte', async () => {
  const sources = await Promise.all([
    '../src/stores/accountSessionStore.js',
    '../src/stores/scheduleDemandModelsStore.js',
    '../src/views/grafik/GrafikKalendarzDyspozycjiView.vue',
    '../src/utils/scheduleAvailabilityAccess.js'
  ].map(relativePath => readFile(new URL(
    relativePath,
    import.meta.url
  ), 'utf8')))
  const joinedSource = sources.join('\n')

  assert.doesNotMatch(joinedSource, /getDocFromServer/)
  assert.doesNotMatch(joinedSource, /confirmScheduleManagerPermission/)
  assert.doesNotMatch(joinedSource, /captureScheduleManagerPermission/)
  assert.doesNotMatch(joinedSource, /createSchedulePermissionConfirmationCoordinator/)
  assert.doesNotMatch(joinedSource, /\[dev:test\]\[grafik-listeners\]/)
})

test('odebranie uprawnienia nadal czyści managerskie dane i pozwala na ponowne uruchomienie', async () => {
  const source = await readFile(new URL(
    '../src/views/grafik/GrafikKalendarzDyspozycjiView.vue',
    import.meta.url
  ), 'utf8')

  assert.match(source, /watch\(\s*canManageSchedule,[\s\S]*synchronizeScheduleAvailabilityAccess\(\)/)
  assert.match(source, /clearManagerScheduleAvailabilityData[\s\S]*employeesStore\.clearSensitiveData\(\)/)
  assert.match(source, /clearManagerScheduleAvailabilityData[\s\S]*demandModelsStore\.clearSensitiveData\(\)/)
  assert.match(source, /wasListeningToAnotherEmployee[\s\S]*stopAvailabilityListener\(\)/)
  assert.match(source, /if \(selectedViewMode\.value === 'all'\) \{\s*loadMonthAvailability\(\)/)
})
