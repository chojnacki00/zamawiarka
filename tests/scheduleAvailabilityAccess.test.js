import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  getScheduleAvailabilityAccessPlan,
  isSchedulePermissionDeniedError,
  normalizeAvailabilitySelectionForAccess,
  SCHEDULE_AVAILABILITY_ACCESS_MODE,
  shouldIgnoreScheduleListenerCallback,
  shouldIgnoreScheduleListenerError
} from '../src/utils/scheduleAvailabilityAccess.js'

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

test('spóźnione snapshoty i błędy unieważnionego listenera są ignorowane', () => {
  assert.equal(shouldIgnoreScheduleListenerCallback({
    listenerRevision: 4,
    currentRevision: 5,
    error: { code: 'unavailable' }
  }), true)
  assert.equal(shouldIgnoreScheduleListenerCallback({
    listenerRevision: 4,
    currentRevision: 5
  }), true)
})

test('oczekiwana odmowa po odebraniu uprawnienia kończy listener bez błędu', () => {
  assert.equal(isSchedulePermissionDeniedError({
    code: 'firestore/permission-denied'
  }), true)
  assert.equal(shouldIgnoreScheduleListenerCallback({
    listenerRevision: 5,
    currentRevision: 5,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    hasManagerAccess: false,
    error: { code: 'permission-denied' }
  }), true)
})

test('nieoczekiwany błąd uprawnień nadal jest raportowany', () => {
  assert.equal(shouldIgnoreScheduleListenerCallback({
    listenerRevision: 5,
    currentRevision: 5,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    hasManagerAccess: true,
    error: { code: 'permission-denied' }
  }), false)
  assert.equal(shouldIgnoreScheduleListenerCallback({
    listenerRevision: 5,
    currentRevision: 5,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    hasManagerAccess: false,
    error: { code: 'unavailable' }
  }), false)
})

const runRevokedManagerListenerScenario = async () => {
  let currentRevision = 12
  let hasManagerAccess = true
  let unsubscribeCalls = 0
  let consoleErrorCalls = 0
  const listenerRevision = currentRevision

  const invalidateAndUnsubscribe = () => {
    currentRevision += 1
    unsubscribeCalls += 1
  }

  const shouldIgnoreError = await shouldIgnoreScheduleListenerError({
    listenerRevision,
    getCurrentRevision: () => currentRevision,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    getHasManagerAccess: () => hasManagerAccess,
    confirmManagerAccess: async () => {
      hasManagerAccess = false
      invalidateAndUnsubscribe()
      return false
    },
    error: { code: 'permission-denied' }
  })

  if (!shouldIgnoreError) consoleErrorCalls += 1

  const ignoresLateSnapshot = shouldIgnoreScheduleListenerCallback({
    listenerRevision,
    currentRevision,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    hasManagerAccess
  })
  const ignoresLateError = await shouldIgnoreScheduleListenerError({
    listenerRevision,
    getCurrentRevision: () => currentRevision,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    getHasManagerAccess: () => hasManagerAccess,
    error: { code: 'permission-denied' }
  })

  return {
    consoleErrorCalls,
    ignoresLateError,
    ignoresLateSnapshot,
    unsubscribeCalls
  }
}

test('modele zapotrzebowania ignorują odmowę dostarczoną przed lokalnym snapshotem profilu', async () => {
  assert.deepEqual(await runRevokedManagerListenerScenario(), {
    consoleErrorCalls: 0,
    ignoresLateError: true,
    ignoresLateSnapshot: true,
    unsubscribeCalls: 1
  })
})

test('dyspozycje pracownika ignorują spóźniony snapshot i odmowę unieważnionej generacji', async () => {
  assert.deepEqual(await runRevokedManagerListenerScenario(), {
    consoleErrorCalls: 0,
    ignoresLateError: true,
    ignoresLateSnapshot: true,
    unsubscribeCalls: 1
  })
})

test('aktualna aktywna generacja nadal raportuje nieoczekiwany permission-denied', async () => {
  let currentRevision = 20
  let hasManagerAccess = true

  const ignored = await shouldIgnoreScheduleListenerError({
    listenerRevision: 20,
    getCurrentRevision: () => currentRevision,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    getHasManagerAccess: () => hasManagerAccess,
    confirmManagerAccess: async () => {
      currentRevision = 20
      hasManagerAccess = true
      return true
    },
    error: { code: 'firestore/permission-denied' }
  })

  assert.equal(ignored, false)
})

test('odmowa serwerowego odczytu profilu w trakcie zmiany dostępu jest kontrolowanym zakończeniem', async () => {
  const ignored = await shouldIgnoreScheduleListenerError({
    listenerRevision: 24,
    getCurrentRevision: () => 24,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    getHasManagerAccess: () => true,
    confirmManagerAccess: async () => {
      throw { code: 'firestore/permission-denied' }
    },
    error: { code: 'permission-denied' }
  })

  assert.equal(ignored, true)
})

test('błąd sieci podczas potwierdzania nie ukrywa permission-denied aktywnej generacji', async () => {
  const ignored = await shouldIgnoreScheduleListenerError({
    listenerRevision: 25,
    getCurrentRevision: () => 25,
    managerAccessRequired: true,
    managerAccessAtStart: true,
    getHasManagerAccess: () => true,
    confirmManagerAccess: async () => {
      throw { code: 'unavailable' }
    },
    error: { code: 'permission-denied' }
  })

  assert.equal(ignored, false)
})

const runRepeatedPermissionCycles = async listenerKind => {
  let currentRevision = 0
  let hasManagerAccess = false
  let currentListener = null
  let consoleErrorCalls = 0
  let unsubscribeCalls = 0
  const retiredListeners = []

  const startManagerListener = () => {
    currentRevision += 1
    currentListener = {
      kind: listenerKind,
      revision: currentRevision,
      managerAccessAtStart: hasManagerAccess
    }
    return currentListener
  }

  const revokeManagerAccess = () => {
    hasManagerAccess = false
    currentRevision += 1
    unsubscribeCalls += 1
    if (currentListener) retiredListeners.push(currentListener)
    currentListener = null
  }

  const reportListenerError = async ({
    listener,
    confirmManagerAccess
  }) => {
    const ignored = await shouldIgnoreScheduleListenerError({
      listenerRevision: listener.revision,
      getCurrentRevision: () => currentRevision,
      managerAccessRequired: true,
      managerAccessAtStart: listener.managerAccessAtStart,
      getHasManagerAccess: () => hasManagerAccess,
      confirmManagerAccess,
      error: { code: 'permission-denied' }
    })

    if (!ignored) consoleErrorCalls += 1
    return ignored
  }

  // Cykl 1: odmowa przychodzi przed lokalnym snapshotem profilu.
  hasManagerAccess = true
  const firstListener = startManagerListener()
  await reportListenerError({
    listener: firstListener,
    confirmManagerAccess: async () => {
      revokeManagerAccess()
      return false
    }
  })

  // Cykl 2: lokalny profil unieważnia listener przed jego odmową.
  hasManagerAccess = true
  const secondListener = startManagerListener()
  revokeManagerAccess()
  await reportListenerError({ listener: secondListener })

  // Cykl 3: dodatkowa odmowa dotyka również serwerowy odczyt profilu.
  hasManagerAccess = true
  const thirdListener = startManagerListener()
  await reportListenerError({
    listener: thirdListener,
    confirmManagerAccess: async () => {
      throw { code: 'permission-denied' }
    }
  })
  revokeManagerAccess()

  // Po ponownym nadaniu każda subskrypcja otrzymuje nową generację.
  hasManagerAccess = true
  const activeListener = startManagerListener()

  for (const listener of retiredListeners) {
    assert.equal(shouldIgnoreScheduleListenerCallback({
      listenerRevision: listener.revision,
      currentRevision,
      managerAccessRequired: true,
      managerAccessAtStart: listener.managerAccessAtStart,
      hasManagerAccess
    }), true)
    await reportListenerError({ listener })
  }

  await reportListenerError({
    listener: activeListener,
    confirmManagerAccess: async () => true
  })

  return {
    activeRevision: activeListener.revision,
    consoleErrorCalls,
    currentRevision,
    retiredRevisions: retiredListeners.map(listener => listener.revision),
    unsubscribeCalls
  }
}

test('modele zapotrzebowania przechodzą trzy cykle odebrania i nadania bez błędów starych generacji', async () => {
  assert.deepEqual(
    await runRepeatedPermissionCycles('demand-models'),
    {
      activeRevision: 7,
      consoleErrorCalls: 1,
      currentRevision: 7,
      retiredRevisions: [1, 3, 5],
      unsubscribeCalls: 3
    }
  )
})

test('dyspozycje pracowników przechodzą trzy cykle odebrania i nadania bez błędów starych generacji', async () => {
  assert.deepEqual(
    await runRepeatedPermissionCycles('employee-availability'),
    {
      activeRevision: 7,
      consoleErrorCalls: 1,
      currentRevision: 7,
      retiredRevisions: [1, 3, 5],
      unsubscribeCalls: 3
    }
  )
})

test('store konta nie pozwala spóźnionemu potwierdzeniu nadpisać nowszego profilu', async () => {
  const source = await readFile(new URL(
    '../src/stores/accountSessionStore.js',
    import.meta.url
  ), 'utf8')

  assert.match(source, /let permissionContextRevision = 0/)
  assert.match(source, /const refreshRevision = permissionContextRevision/)
  assert.match(source, /if \(refreshRevision === permissionContextRevision\)/)
  assert.match(source, /stopSensitiveListeners[\s\S]*permissionContextRevision \+= 1/)
  assert.match(source, /startPermissionProfileListener[\s\S]*permissionContextRevision \+= 1/)
})

test('zmiana uprawnienia unieważnia managerskie dane i pozwala uruchomić nowy listener', () => {
  const ownAvailability = [{ id: 'julia_2026-09-13' }]
  let managerAvailability = [{ id: 'marzena_2026-09-13' }]
  let currentRevision = 8
  let hasManagerAccess = true

  const applyManagerSnapshot = (listenerRevision, records) => {
    if (shouldIgnoreScheduleListenerCallback({
      listenerRevision,
      currentRevision,
      managerAccessRequired: true,
      managerAccessAtStart: true,
      hasManagerAccess
    })) {
      return
    }
    managerAvailability = records
  }

  hasManagerAccess = false
  currentRevision += 1
  managerAvailability = []
  applyManagerSnapshot(8, [{ id: 'spóźniony-wpis' }])

  assert.deepEqual(managerAvailability, [])
  assert.deepEqual(ownAvailability, [{ id: 'julia_2026-09-13' }])

  hasManagerAccess = true
  currentRevision += 1
  applyManagerSnapshot(10, [{ id: 'nowy-wpis-managera' }])

  assert.deepEqual(managerAvailability, [{ id: 'nowy-wpis-managera' }])
})

test('widok zatrzymuje managerskie listenery i nie liczy obsady przy zapisie własnym', async () => {
  const source = await readFile(new URL(
    '../src/views/grafik/GrafikKalendarzDyspozycjiView.vue',
    import.meta.url
  ), 'utf8')
  const ownSave = source.slice(
    source.indexOf('const saveAvailability ='),
    source.indexOf("const selectedAvailabilityType =", source.indexOf('const saveAvailability ='))
  )

  assert.match(source, /watch\(\s*canManageSchedule,[\s\S]*synchronizeScheduleAvailabilityAccess\(\)/)
  assert.match(source, /clearManagerScheduleAvailabilityData[\s\S]*employeesStore\.clearSensitiveData\(\)/)
  assert.match(source, /clearManagerScheduleAvailabilityData[\s\S]*demandModelsStore\.clearSensitiveData\(\)/)
  assert.match(source, /currentRevision: teamAvailabilityListenerRevision/)
  assert.match(source, /currentRevision: monthAvailabilityListenerRevision/)
  assert.match(source, /wasListeningToAnotherEmployee[\s\S]*stopAvailabilityListener\(\)/)
  assert.equal(
    (source.match(/refreshCurrentPermissionAndCheck\('can_manage_schedule'\)/g) || []).length,
    3
  )
  assert.doesNotMatch(ownSave, /fetchTeamAvailabilityRecordsForDay/)
  assert.doesNotMatch(ownSave, /validateEmployeeAvailabilityCoverage/)
})

test('store modeli unieważnia callbacki przed wyczyszczeniem managerskich danych', async () => {
  const source = await readFile(new URL(
    '../src/stores/scheduleDemandModelsStore.js',
    import.meta.url
  ), 'utf8')

  assert.match(source, /let modelsListenerRevision = 0/)
  assert.match(source, /clearSensitiveData[\s\S]*modelsListenerRevision \+= 1[\s\S]*unsubscribeModels\(\)/)
  assert.match(source, /shouldIgnoreScheduleListenerCallback\([\s\S]*managerAccessAtStart/)
  assert.match(source, /shouldIgnoreScheduleListenerError\([\s\S]*refreshCurrentPermissionAndCheck/)
  assert.match(source, /console\.error\('Błąd pobierania szablonów grafiku:', error\)/)
})
