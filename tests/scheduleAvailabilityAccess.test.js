import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createScheduleListenerSlot,
  createSchedulePermissionConfirmationCoordinator,
  getScheduleAvailabilityAccessPlan,
  isSchedulePermissionDeniedError,
  normalizeAvailabilitySelectionForAccess,
  SCHEDULE_AVAILABILITY_ACCESS_MODE,
  shouldIgnoreScheduleListenerCallback,
  shouldIgnoreScheduleListenerError
} from '../src/utils/scheduleAvailabilityAccess.js'

const MANAGER_LISTENER_KINDS = [
  'demand-models',
  'employee-availability',
  'team-availability',
  'month-availability'
]

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

test('brak konta Firebase nie jest mylony z potwierdzonym odebraniem uprawnienia', async () => {
  const coordinator =
    createSchedulePermissionConfirmationCoordinator()
  const permissionToken = coordinator.capture()
  let confirmationCalls = 0

  const result = await coordinator.confirm(
    permissionToken,
    async () => {
      confirmationCalls += 1
      return false
    }
  )

  assert.equal(result, null)
  assert.equal(confirmationCalls, 0)
})

test('slot listenera utrzymuje najwyzej jedna subskrypcje i odpina kazda dokladnie raz', () => {
  const slot = createScheduleListenerSlot('test-listener')
  let unsubscribeCalls = 0

  for (let cycle = 0; cycle < 5; cycle += 1) {
    const listener = slot.begin()
    slot.attach(listener, () => {
      unsubscribeCalls += 1
    })

    assert.equal(slot.getStats().activeCount, 1)
    assert.equal(slot.getStats().startCount, cycle + 1)
  }

  assert.equal(unsubscribeCalls, 4)
  slot.stop()
  slot.stop()
  assert.equal(unsubscribeCalls, 5)
  assert.deepEqual(slot.getStats(), {
    activeCount: 0,
    currentRevision: 7,
    startCount: 5,
    unsubscribeCount: 5
  })
})

test('cztery listenery wspoldziela potwierdzenie przez piec cykli odebrania i nadania', async () => {
  const coordinator =
    createSchedulePermissionConfirmationCoordinator()
  const slots = new Map(MANAGER_LISTENER_KINDS.map(kind => [
    kind,
    createScheduleListenerSlot(kind)
  ]))
  const unsubscribeCalls = Object.fromEntries(
    MANAGER_LISTENER_KINDS.map(kind => [kind, 0])
  )
  let hasManagerAccess = false
  let confirmationCalls = 0
  let consoleErrorCalls = 0

  const setManagerAccess = granted => {
    hasManagerAccess = granted
    coordinator.update({
      nextContextKey: 'restaurant-a:employee-a:profile-a',
      hasManagerAccess: granted
    })
  }

  const startAll = () => Object.fromEntries(
    MANAGER_LISTENER_KINDS.map(kind => {
      const slot = slots.get(kind)
      const listener = slot.begin()
      slot.attach(listener, () => {
        unsubscribeCalls[kind] += 1
      })
      return [kind, {
        listener,
        permissionToken: coordinator.capture()
      }]
    })
  )

  const handleError = async (
    kind,
    state,
    confirmManagerAccess
  ) => {
    const slot = slots.get(kind)
    const ignored = await shouldIgnoreScheduleListenerError({
      listenerRevision: state.listener.revision,
      getCurrentRevision: slot.getRevision,
      managerAccessRequired: true,
      managerAccessAtStart: true,
      getHasManagerAccess: () => hasManagerAccess,
      confirmManagerAccess: () => coordinator.confirm(
        state.permissionToken,
        confirmManagerAccess
      ),
      error: { code: 'permission-denied' }
    })

    if (!ignored) consoleErrorCalls += 1
    if (ignored) slot.finish(state.listener)
    return ignored
  }

  for (let cycle = 0; cycle < 5; cycle += 1) {
    setManagerAccess(true)
    const listeners = startAll()

    MANAGER_LISTENER_KINDS.forEach(kind => {
      assert.equal(slots.get(kind).getStats().activeCount, 1)
    })

    if (cycle % 2 === 0) {
      let resolveConfirmation
      const confirmationGate = new Promise(resolve => {
        resolveConfirmation = resolve
      })
      const confirmManagerAccess = async () => {
        confirmationCalls += 1
        await confirmationGate
        return false
      }
      const errors = MANAGER_LISTENER_KINDS.map(kind => (
        handleError(kind, listeners[kind], confirmManagerAccess)
      ))

      await Promise.resolve()
      resolveConfirmation()
      assert.deepEqual(await Promise.all(errors), [
        true,
        true,
        true,
        true
      ])
      setManagerAccess(false)
    } else {
      setManagerAccess(false)
      MANAGER_LISTENER_KINDS.forEach(kind => {
        slots.get(kind).stop()
      })
      assert.deepEqual(await Promise.all(
        MANAGER_LISTENER_KINDS.map(kind => (
          handleError(
            kind,
            listeners[kind],
            async () => {
              confirmationCalls += 1
              return false
            }
          )
        ))
      ), [true, true, true, true])
    }

    MANAGER_LISTENER_KINDS.forEach(kind => {
      assert.equal(slots.get(kind).getStats().activeCount, 0)
    })
  }

  assert.equal(confirmationCalls, 3)
  assert.equal(consoleErrorCalls, 0)
  assert.deepEqual(unsubscribeCalls, {
    'demand-models': 5,
    'employee-availability': 5,
    'team-availability': 5,
    'month-availability': 5
  })

  setManagerAccess(true)
  const currentListeners = startAll()
  const unexpectedErrorIgnored = await handleError(
    'demand-models',
    currentListeners['demand-models'],
    async () => {
      confirmationCalls += 1
      return true
    }
  )

  assert.equal(unexpectedErrorIgnored, false)
  assert.equal(consoleErrorCalls, 1)
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
  assert.match(source, /createSchedulePermissionConfirmationCoordinator/)
  assert.match(source, /captureScheduleManagerPermission/)
  assert.match(source, /confirmScheduleManagerPermission/)
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
  assert.match(source, /createScheduleListenerSlot\(\s*'team-availability'/)
  assert.match(source, /createScheduleListenerSlot\(\s*'month-availability'/)
  assert.match(source, /wasListeningToAnotherEmployee[\s\S]*stopAvailabilityListener\(\)/)
  assert.equal(
    (source.match(/confirmScheduleManagerPermission\(/g) || []).length,
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

  assert.match(source, /createScheduleListenerSlot\(\s*'demand-models'/)
  assert.match(source, /clearSensitiveData[\s\S]*modelsListenerSlot\.stop\(\)/)
  assert.match(source, /shouldIgnoreScheduleListenerCallback\([\s\S]*managerAccessAtStart/)
  assert.match(source, /shouldIgnoreScheduleListenerError\([\s\S]*confirmScheduleManagerPermission/)
  assert.match(source, /console\.error\('Błąd pobierania szablonów grafiku:', error\)/)
})
