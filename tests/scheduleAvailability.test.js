import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyAvailabilityPeriodDeletion,
  buildAvailabilityPeriodDeletePlan,
  buildManagerAvailabilityWrite,
  canEditAvailabilityDate,
  findAvailabilityPeriodForDate,
  getAvailabilityDocumentId,
  getAvailabilityEntriesForDate,
  getAvailabilityEntry,
  isDateInAvailabilityPeriod,
  removeAvailabilityEntry
} from '../src/utils/scheduleAvailability.js'
import { getScheduleRangeConflicts } from '../src/utils/scheduleCreationValidation.js'

const period = (overrides = {}) => ({
  id: 'period-1',
  dateFrom: '2027-01-02',
  dateTo: '2027-01-31',
  status: 'open',
  blockedDates: [],
  ...overrides
})

const entry = (overrides = {}) => ({
  id: 'employee-1_2027-01-15',
  employeeId: 'employee-1',
  date: '2027-01-15',
  periodId: 'period-1',
  employeeEntry: { type: 'partial' },
  ...overrides
})

const isEffectivelyOpen = item => item.status === 'open'

test('ID dyspozycji zależy wyłącznie od pracownika i daty', () => {
  assert.equal(
    getAvailabilityDocumentId('employee-1', '2027-01-15'),
    'employee-1_2027-01-15'
  )
})

test('wpis managera korzysta z tego samego ID i zachowuje wpis pracownika', () => {
  const employeeEntry = {
    type: 'preferred_off',
    note: 'Prośba pracownika'
  }
  const enteredAt = 'timestamp-testowy'
  const write = buildManagerAvailabilityWrite({
    employeeId: 'employee-1',
    dateKey: '2027-01-15',
    periodId: null,
    type: 'partial',
    timeFrom: '10:00',
    timeTo: '16:00',
    note: '  Zmiana managera  ',
    editorId: 'manager-1',
    editorName: 'Anna Manager',
    enteredAt,
    employeeEntry
  })

  assert.equal(write.documentId, 'employee-1_2027-01-15')
  assert.equal(write.data.periodId, null)
  assert.equal(write.data.effectiveSource, 'manager')
  assert.equal(write.data.note, 'Zmiana managera')
  assert.equal(write.data.managerEntry.timeFrom, '10:00')
  assert.equal(write.data.managerEntry.timeTo, '16:00')
  assert.strictEqual(write.data.employeeEntry, employeeEntry)
})

test('usunięcie pustego okresu usuwa wyłącznie okres', () => {
  const state = applyAvailabilityPeriodDeletion({
    periods: [period()],
    availabilityEntries: [],
    versionDocuments: [],
    schedules: []
  }, 'period-1')

  assert.deepEqual(state.periods, [])
  assert.deepEqual(state.availabilityEntries, [])
  assert.deepEqual(state.versionDocuments, [])
  assert.deepEqual(state.schedules, [])
  assert.deepEqual(buildAvailabilityPeriodDeletePlan('period-1'), [{
    collectionName: 'grafik_okresy_dyspozycji',
    documentId: 'period-1'
  }])
})

test('usunięcie okresu zachowuje dyspozycje, wersje i grafik', () => {
  const availabilityEntries = [entry()]
  const versionDocuments = [{ date: '2027-01-15', version: 4 }]
  const schedules = [{ id: 'schedule-1' }]
  const state = applyAvailabilityPeriodDeletion({
    periods: [period()],
    availabilityEntries,
    versionDocuments,
    schedules
  }, 'period-1')

  assert.deepEqual(state.periods, [])
  assert.strictEqual(state.availabilityEntries, availabilityEntries)
  assert.strictEqual(state.versionDocuments, versionDocuments)
  assert.strictEqual(state.schedules, schedules)
  assert.equal(state.availabilityEntries[0].periodId, 'period-1')
})

test('wpis managera spoza okresu pozostaje widoczny niezależnie od okresów', () => {
  const managerEntry = entry({
    id: 'employee-1_2027-01-01',
    date: '2027-01-01',
    periodId: null,
    employeeEntry: undefined,
    managerEntry: { type: 'unavailable' }
  })
  const entries = [managerEntry]

  assert.strictEqual(getAvailabilityEntry({
    entries,
    employeeId: 'employee-1',
    dateKey: '2027-01-01'
  }), managerEntry)

  const state = applyAvailabilityPeriodDeletion({
    periods: [period()],
    availabilityEntries: entries
  }, 'period-1')

  assert.strictEqual(state.availabilityEntries[0], managerEntry)
})

test('wpis managera w zakresie nowego okresu jest widoczny bez przepisywania', () => {
  const managerEntry = entry({
    periodId: null,
    employeeEntry: undefined,
    managerEntry: { type: 'preferred_off' }
  })

  assert.equal(isDateInAvailabilityPeriod(period(), managerEntry.date), true)
  assert.strictEqual(getAvailabilityEntriesForDate(
    [managerEntry],
    '2027-01-15'
  )[0], managerEntry)
  assert.equal(managerEntry.periodId, null)
})

test('zamknięcie okresu zachowuje wpis, ale blokuje edycję pracownika', () => {
  const entries = [entry()]
  const closedPeriod = period({ status: 'closed' })

  assert.strictEqual(getAvailabilityEntry({
    entries,
    employeeId: 'employee-1',
    dateKey: '2027-01-15'
  }), entries[0])
  assert.equal(canEditAvailabilityDate({
    periods: [closedPeriod],
    dateKey: '2027-01-15',
    isEffectivelyOpen
  }), false)
})

test('usunięcie okresu zachowuje wpis i blokuje edycję pracownika', () => {
  const entries = [entry()]
  const state = applyAvailabilityPeriodDeletion({
    periods: [period()],
    availabilityEntries: entries
  }, 'period-1')

  assert.strictEqual(state.availabilityEntries, entries)
  assert.equal(canEditAvailabilityDate({
    periods: state.periods,
    dateKey: '2027-01-15',
    isEffectivelyOpen
  }), false)
})

test('manager może edytować datę bez okresu', () => {
  assert.equal(canEditAvailabilityDate({
    periods: [],
    dateKey: '2027-01-15',
    isManager: true,
    isEffectivelyOpen
  }), true)
})

test('nowy otwarty okres ponownie udostępnia zachowaną dyspozycję', () => {
  const preservedEntry = entry({ periodId: 'deleted-period' })
  const newPeriod = period({ id: 'period-2' })

  assert.strictEqual(getAvailabilityEntry({
    entries: [preservedEntry],
    employeeId: 'employee-1',
    dateKey: '2027-01-15'
  }), preservedEntry)
  assert.equal(canEditAvailabilityDate({
    periods: [newPeriod],
    dateKey: '2027-01-15',
    isEffectivelyOpen
  }), true)
})

test('ręczne usunięcie dyspozycji usuwa tylko wskazanego pracownika i dzień', () => {
  const entries = [
    entry(),
    entry({
      id: 'employee-2_2027-01-15',
      employeeId: 'employee-2'
    }),
    entry({
      id: 'employee-1_2027-01-16',
      date: '2027-01-16'
    })
  ]

  const result = removeAvailabilityEntry({
    entries,
    employeeId: 'employee-1',
    dateKey: '2027-01-15'
  })

  assert.deepEqual(result.map(item => item.id), [
    'employee-2_2027-01-15',
    'employee-1_2027-01-16'
  ])
})

test('dyspozycja bez periodId jest poprawnie odczytywana', () => {
  const item = entry({ periodId: undefined })

  assert.strictEqual(getAvailabilityEntry({
    entries: [item],
    employeeId: 'employee-1',
    dateKey: '2027-01-15'
  }), item)
})

test('pierwszy i ostatni dzień należą do okresu', () => {
  assert.equal(isDateInAvailabilityPeriod(period(), '2027-01-02'), true)
  assert.equal(isDateInAvailabilityPeriod(period(), '2027-01-31'), true)
  assert.equal(findAvailabilityPeriodForDate({
    periods: [period()],
    dateKey: '2027-01-31'
  })?.id, 'period-1')
})

test('otwarcie okresu nachodzącego na grafik nadal jest konfliktem', () => {
  assert.equal(getScheduleRangeConflicts({
    schedules: [{
      id: 'schedule-1',
      dateFrom: '2027-01-10',
      dateTo: '2027-01-20'
    }],
    dateFrom: '2027-01-02',
    dateTo: '2027-01-31'
  }).length, 1)
})
