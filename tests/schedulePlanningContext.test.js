import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PLANNING_CONTEXT_VERSION,
  buildDemandDaySnapshot,
  buildPlanningContextSnapshot,
  buildWorkingShiftsFromDemandDay,
  getPlanningContextDocumentId,
  hydratePlanningContext,
  resolveEffectiveAvailability
} from '../src/utils/schedulePlanningContext.js'
import {
  getAtomicScheduleSnapshotCreationPlan,
  getMaximumAtomicSnapshotScheduleDays
} from '../src/utils/scheduleStructure.js'
import {
  normalizePermissionDependencies,
  togglePermissionWithDependencies
} from '../src/utils/permissionDependencies.js'

const profile = (overrides = {}) => ({
  id: 'profile-1',
  name: 'Pełny etat',
  profileVersionNumber: 4,
  profileVersionId: 'v4',
  targetHours: { applies: true, amount: 40, unit: 'week' },
  targetTolerance: { applies: true, minusHours: 10, plusHours: 10 },
  maximumDailyHours: { applies: true, hours: 12 },
  maximumWeeklyHours: { applies: true, hours: 50 },
  minimumRest: { applies: true, hours: 11 },
  minimumWeeklyRest: { applies: true, hours: 35 },
  maximumConsecutiveDays: { applies: true, days: 6 },
  weekendRotation: {
    applies: true,
    maxConsecutiveSaturdays: 1,
    maxConsecutiveSundays: 1
  },
  breaks: [],
  ...overrides
})

const employee = (overrides = {}) => ({
  id: 'employee-1',
  imie: 'Paweł',
  nazwisko: 'Paliński',
  aktywny: true,
  employmentProfileId: 'profile-1',
  employmentPercentage: 130,
  positionAssignments: [{
    positionId: 'position-1',
    competencyStars: 4,
    hourlyRateOverride: 99
  }],
  ...overrides
})

const position = (overrides = {}) => ({
  id: 'position-1',
  nazwa: 'Pizzer',
  kolor: '#ff9500',
  scheduleColor: '#FDBA74',
  ikona: 'pizza',
  active: true,
  defaultHourlyRate: 35,
  ...overrides
})

const availability = (overrides = {}) => ({
  employeeId: 'employee-1',
  date: '2026-09-01',
  employeeEntry: {
    type: 'partial',
    timeFrom: '10:00',
    timeTo: '18:00',
    note: 'prywatna notatka'
  },
  managerEntry: {
    type: 'preferred_off',
    note: 'notatka managera'
  },
  ...overrides
})

const buildContext = (overrides = {}) => buildPlanningContextSnapshot({
  scheduleId: 'schedule-1',
  dateKeys: ['2026-09-01', '2026-09-02'],
  employees: [employee()],
  positions: [position()],
  employmentProfiles: [profile()],
  generatorSettings: {
    useEmploymentProfiles: true,
    profileRules: { maximumWeeklyHours: { mode: 'hard' } }
  },
  availabilityEntries: [availability()],
  ...overrides
})

test('buduje kompletny, wersjonowany snapshot grafiku', () => {
  const context = buildContext()
  const hydrated = hydratePlanningContext(
    context.documents.map(document => ({ id: document.id, ...document.data }))
  )

  assert.equal(context.version, PLANNING_CONTEXT_VERSION)
  assert.equal(hydrated.employees.length, 1)
  assert.equal(hydrated.positions.length, 1)
  assert.equal(hydrated.employmentProfiles.length, 1)
  assert.equal(hydrated.availabilityDays.length, 2)
})

test('używa stabilnych identyfikatorów dokumentów snapshotu', () => {
  assert.equal(
    getPlanningContextDocumentId('schedule-1', 'employee', 'employee-1'),
    'schedule-1__planning__employee__employee-1'
  )
})

test('każdy dokument snapshotu ma scheduleId do atomowego usuwania', () => {
  const context = buildContext()
  assert.ok(context.documents.length > 0)
  assert.ok(context.documents.every(document => (
    document.data.scheduleId === 'schedule-1'
  )))
})

test('niekompletny snapshot jest odrzucany przy odczycie', () => {
  const context = buildContext()
  const records = context.documents
    .filter(document => document.data.contextType !== 'employee')
    .map(document => ({ id: document.id, ...document.data }))

  assert.throws(
    () => hydratePlanningContext(records),
    /niekompletny/i
  )
})

test('zmiana żywej dyspozycji nie zmienia snapshotu', () => {
  const source = availability()
  const context = buildContext({ availabilityEntries: [source] })
  source.employeeEntry.type = 'unavailable'
  const day = context.availabilityDays[0]
  assert.equal(day.entries[0].employeeEntry.type, 'partial')
})

test('usunięcie żywej dyspozycji nie zmienia snapshotu', () => {
  const source = [availability()]
  const context = buildContext({ availabilityEntries: source })
  source.length = 0
  assert.equal(context.availabilityDays[0].entries.length, 1)
})

test('zmiana wpisu managera nie zmienia rozstrzygnięcia snapshotu', () => {
  const source = availability()
  const context = buildContext({ availabilityEntries: [source] })
  source.managerEntry.type = 'full'
  assert.equal(
    context.availabilityDays[0].entries[0].effective.type,
    'preferred_off'
  )
})

test('pierwszeństwo wpisu managera jest zapisane jawnie', () => {
  const result = resolveEffectiveAvailability(availability())
  assert.equal(result.source, 'manager')
  assert.equal(result.entry.type, 'preferred_off')
})

test('brak wpisu oznacza pełną dyspozycyjność domyślną', () => {
  assert.deepEqual(resolveEffectiveAvailability(null), {
    entry: { type: 'full', timeFrom: null, timeTo: null },
    source: 'default'
  })
})

test('zmiana imienia pracownika nie zmienia snapshotu', () => {
  const source = employee()
  const context = buildContext({ employees: [source] })
  source.imie = 'Jan'
  assert.equal(context.employees[0].fullNameSnapshot, 'Paweł Paliński')
})

test('dezaktywacja pracownika nie usuwa go ze snapshotu', () => {
  const source = employee()
  const context = buildContext({ employees: [source] })
  source.aktywny = false
  assert.equal(context.employees.length, 1)
  assert.equal(context.employees[0].aktywny, true)
})

test('zmiana kompetencji nie zmienia snapshotu', () => {
  const source = employee()
  const context = buildContext({ employees: [source] })
  source.positionAssignments[0].competencyStars = 1
  assert.equal(context.employees[0].positionAssignments[0].competencyStars, 4)
})

test('zmiana nazwy i koloru stanowiska nie zmienia snapshotu', () => {
  const source = position()
  const context = buildContext({ positions: [source] })
  source.nazwa = 'Kucharz'
  source.kolor = '#000000'
  source.scheduleColor = '#86EFAC'
  assert.equal(context.positions[0].nazwa, 'Pizzer')
  assert.equal(context.positions[0].kolor, '#ff9500')
  assert.equal(context.positions[0].scheduleColor, '#FDBA74')
})

test('kolor kalendarza trafia do snapshotu stanowiska', () => {
  const context = buildContext()

  assert.equal(context.positions[0].scheduleColor, '#FDBA74')
})

test('snapshot pracownika nie zawiera danych finansowych', () => {
  const snapshotEmployee = buildContext().employees[0]
  assert.equal('compensation' in snapshotEmployee, false)
  assert.equal('hourlyRateOverride' in snapshotEmployee.positionAssignments[0], false)
})

test('zmiana profilu nie zmienia reguł snapshotu', () => {
  const sourceProfile = profile()
  const context = buildContext({ employmentProfiles: [sourceProfile] })
  sourceProfile.maximumWeeklyHours.hours = 20
  assert.equal(context.employmentProfiles[0].maximumWeeklyHours.hours, 50)
})

test('efektywne reguły są przeliczone przez wymiar pracy', () => {
  const rules = buildContext().employees[0].effectiveEmploymentRules
  assert.equal(rules.targetHours.amount, 52)
  assert.equal(rules.targetTolerance.minusHours, 13)
  assert.equal(rules.maximumWeeklyHours.hours, 65)
})

test('zmiana wymiaru po utworzeniu nie zmienia efektywnych reguł', () => {
  const source = employee()
  const context = buildContext({ employees: [source] })
  source.employmentPercentage = 50
  assert.equal(context.employees[0].effectiveEmploymentRules.targetHours.amount, 52)
})

test('zmiana ustawień generatora nie zmienia snapshotu', () => {
  const settings = {
    profileRules: { maximumWeeklyHours: { mode: 'hard' } }
  }
  const context = buildContext({ generatorSettings: settings })
  settings.profileRules.maximumWeeklyHours.mode = 'off'
  assert.equal(
    context.generatorSettings.profileRules.maximumWeeklyHours.mode,
    'hard'
  )
})

test('wynik modelu zapotrzebowania jest niezależną kopią', () => {
  const model = {
    id: 'model-1',
    name: 'Wrzesień',
    version: 7,
    days: {
      tuesday: [{
        id: 'shift-1',
        positionId: 'position-1',
        from: '09:00',
        to: '17:00',
        requiredPeople: 2
      }]
    }
  }
  const result = buildDemandDaySnapshot({
    dateKey: '2026-09-01',
    demandModel: model,
    positions: [position()]
  })
  model.days.tuesday[0].requiredPeople = 5
  assert.equal(result.slotsCount, 2)
  assert.equal(result.modelVersionSnapshot, 7)
  assert.equal(result.shiftGroups[0].positionColorSnapshot, '#FDBA74')
})

test('zwykły wakat otrzymuje zamrożony kolor stanowiska', () => {
  const demandDay = buildDemandDaySnapshot({
    dateKey: '2026-09-01',
    demandModel: {
      id: 'model-1',
      name: 'Wrzesień',
      days: {
        tuesday: [{
          id: 'shift-1',
          positionId: 'position-1',
          from: '09:00',
          to: '17:00',
          requiredPeople: 1
        }]
      }
    },
    positions: [position()]
  })
  const shifts = buildWorkingShiftsFromDemandDay(demandDay)

  assert.equal(shifts[0].positionColorSnapshot, '#FDBA74')
})

test('nowy grafik po zmianie stanowiska otrzymuje nowy kolor', () => {
  const oldContext = buildContext()
  const newContext = buildContext({
    positions: [position({ scheduleColor: '#86EFAC' })]
  })

  assert.equal(oldContext.positions[0].scheduleColor, '#FDBA74')
  assert.equal(newContext.positions[0].scheduleColor, '#86EFAC')
})

test('stary grafik bez koloru pozostaje bez snapshotu koloru', () => {
  const day = {
    shiftGroups: [{
      id: 'old-group',
      positionId: 'position-1',
      positionName: 'Pizzer',
      from: '09:00',
      to: '17:00',
      slotsCount: 1
    }]
  }
  const shifts = buildWorkingShiftsFromDemandDay(day)

  assert.equal('positionColorSnapshot' in shifts[0], false)
})

test('nowy snapshot utworzony po zmianie korzysta z nowych danych', () => {
  const oldContext = buildContext()
  const newContext = buildContext({
    employees: [employee({ imie: 'Jan' })]
  })
  assert.equal(oldContext.employees[0].imie, 'Paweł')
  assert.equal(newContext.employees[0].imie, 'Jan')
})

test('atomowy plan uwzględnia dokumenty snapshotu', () => {
  const plan = getAtomicScheduleSnapshotCreationPlan({
    dateKeys: ['2026-09-01', '2026-09-02'],
    planningContextDocumentsCount: 7
  })
  assert.equal(plan.writesCount, 10)
})

test('konflikt dat daje plan bez zapisów i snapshotu', () => {
  const plan = getAtomicScheduleSnapshotCreationPlan({
    dateKeys: ['2026-09-01'],
    occupiedDateKeys: ['2026-09-01'],
    planningContextDocumentsCount: 6
  })
  assert.equal(plan.canCreate, false)
  assert.equal(plan.writesCount, 0)
})

test('limit zakresu uwzględnia zespół, stanowiska i profile', () => {
  assert.equal(getMaximumAtomicSnapshotScheduleDays({
    employeesCount: 40,
    positionsCount: 10,
    employmentProfilesCount: 8
  }), 220)
})

test('przekroczenie limitu podaje maksymalny zakres dla zespołu', () => {
  const dateKeys = Array.from(
    { length: 250 },
    (_, index) => {
      const date = new Date(Date.UTC(2026, 0, index + 1))
      return date.toISOString().slice(0, 10)
    }
  )

  assert.throws(() => getAtomicScheduleSnapshotCreationPlan({
    dateKeys,
    planningContextDocumentsCount: 271
  }), /maksymalny zakres.*239 dni/i)
})

test('nie można zaznaczyć zarządzania grafikiem bez dostępu', () => {
  const permissions = togglePermissionWithDependencies(
    { can_view_schedule: false, can_manage_schedule: false },
    'can_manage_schedule'
  )
  assert.equal(permissions.can_view_schedule, false)
  assert.equal(permissions.can_manage_schedule, false)
})

test('zarządzanie grafikiem można zaznaczyć po włączeniu dostępu', () => {
  const permissions = togglePermissionWithDependencies(
    { can_view_schedule: true, can_manage_schedule: false },
    'can_manage_schedule'
  )
  assert.equal(permissions.can_view_schedule, true)
  assert.equal(permissions.can_manage_schedule, true)
})

test('odznaczenie dostępu wyłącza zarządzanie grafikiem', () => {
  const permissions = togglePermissionWithDependencies(
    { can_view_schedule: true, can_manage_schedule: true },
    'can_view_schedule'
  )
  assert.equal(permissions.can_view_schedule, false)
  assert.equal(permissions.can_manage_schedule, false)
})

test('normalizacja store nie pozwala zapisać niespójnych uprawnień', () => {
  const permissions = normalizePermissionDependencies({
    can_view_schedule: false,
    can_manage_schedule: true
  })
  assert.equal(permissions.can_view_schedule, true)
  assert.equal(permissions.can_manage_schedule, true)
})
