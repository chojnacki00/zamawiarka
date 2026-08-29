import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PUBLICATION_STATUSES,
  assertAtomicPublicationSize,
  canPublishSchedule,
  getDefaultPublicationEndDate,
  getPublicationDateKeys,
  getWorkingEditPublicationState,
  prepareSchedulePublication
} from '../src/utils/schedulePublication.js'

const createSchedule = overrides => ({
  id: 'schedule-1',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-05',
  daysCount: 5,
  lifecycleStatus: 'ready',
  publicationStatus: 'unpublished',
  publishedUntil: null,
  publishedDaysCount: 0,
  publishedRevision: 0,
  hasUnpublishedChanges: false,
  ...overrides
})

const shiftsForDate = date => ([{
  id: `regular-${date}`,
  shiftGroupId: 'group-1',
  positionId: 'position-1',
  positionNameSnapshot: 'Pizzer',
  employeeId: date.endsWith('01') ? null : 'employee-1',
  employeeNameSnapshot: date.endsWith('01') ? null : 'Jan Kowalski',
  assignmentSource: date.endsWith('02') ? 'AUTO' : 'MANUAL',
  from: '09:00',
  to: '17:00',
  decision: date.endsWith('03')
    ? { godModeAccepted: true }
    : null,
  warnings: date.endsWith('03') ? ['Ostrzeżenie'] : []
}, {
  id: `extra-${date}`,
  shiftGroupId: null,
  positionId: null,
  positionNameSnapshot: 'Bez stanowiska',
  employeeId: 'employee-2',
  employeeNameSnapshot: 'Anna Nowak',
  assignmentSource: 'MANUAL',
  origin: 'MANUAL_EXTRA',
  from: '18:00',
  to: '20:00',
  decision: null,
  warnings: []
}])

const createDay = (date, overrides = {}) => ({
  id: date,
  date,
  scheduleId: 'schedule-1',
  workingShifts: shiftsForDate(date),
  publishedShifts: [],
  workingRevision: 2,
  publishedRevision: 0,
  hasUnpublishedChanges: false,
  ...overrides
})

const dates = [
  '2026-09-01',
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-05'
]

const prepare = ({
  schedule = createSchedule(),
  publishUntil = '2026-09-05',
  days = dates.map(date => createDay(date))
} = {}) => prepareSchedulePublication({
  schedule,
  publishUntil,
  days,
  expectedPublicationStatus: schedule.publicationStatus,
  expectedPublishedUntil: schedule.publishedUntil ?? null,
  expectedPublishedRevision: schedule.publishedRevision,
  expectedDayRevisions: Object.fromEntries(
    days.map(day => [day.date, day.workingRevision])
  )
})

test('pierwsza publikacja całego grafiku ustawia status published', () => {
  const result = prepare()

  assert.equal(result.header.publicationStatus, 'published')
  assert.equal(result.header.publishedUntil, '2026-09-05')
  assert.equal(result.header.publishedDaysCount, 5)
  assert.equal(result.header.publishedRevision, 1)
  assert.equal(result.days.length, 5)
})

test('pierwsza publikacja działa przy publishedUntil równym null', () => {
  const schedule = createSchedule({ publishedUntil: null })
  const result = prepare({ schedule })

  assert.equal(result.header.publishedUntil, schedule.dateTo)
  assert.equal(result.header.publicationStatus, PUBLICATION_STATUSES.PUBLISHED)
})

test('pierwsza publikacja normalizuje brak publishedUntil do null', () => {
  const schedule = createSchedule()
  delete schedule.publishedUntil
  const result = prepare({ schedule })

  assert.equal(result.header.publishedUntil, schedule.dateTo)
  assert.equal(result.header.publicationStatus, PUBLICATION_STATUSES.PUBLISHED)
})

test('domyślna data pierwszej publikacji wskazuje koniec grafiku', () => {
  const schedule = createSchedule()
  const publishUntil = getDefaultPublicationEndDate(schedule)
  const result = prepare({ schedule, publishUntil })

  assert.equal(publishUntil, schedule.dateTo)
  assert.equal(result.header.publishedUntil, schedule.dateTo)
  assert.equal(result.header.publishedDaysCount, schedule.daysCount)
})

test('pierwsza publikacja części zakresu ustawia status częściowy', () => {
  const result = prepare({ publishUntil: '2026-09-03' })

  assert.equal(result.header.publicationStatus, 'partially_published')
  assert.equal(result.header.publishedUntil, '2026-09-03')
  assert.equal(result.header.publishedDaysCount, 3)
  assert.deepEqual(result.dateKeys, dates.slice(0, 3))
})

test('domyślna data rozszerzenia wskazuje koniec grafiku', () => {
  const schedule = createSchedule({
    publicationStatus: 'partially_published',
    publishedUntil: '2026-09-02',
    publishedDaysCount: 2,
    publishedRevision: 1
  })
  const publishUntil = getDefaultPublicationEndDate(schedule)
  const result = prepare({
    schedule,
    publishUntil,
    days: dates.slice(2).map(date => createDay(date))
  })

  assert.equal(publishUntil, schedule.dateTo)
  assert.deepEqual(result.dateKeys, dates.slice(2))
  assert.equal(result.header.publicationStatus, PUBLICATION_STATUSES.PUBLISHED)
})

test('pusta, nieprawidłowa i niedozwolona data publikacji są blokowane', () => {
  const schedule = createSchedule()

  assert.throws(
    () => getPublicationDateKeys({ schedule, publishUntil: '' }),
    /prawidłową datę/
  )
  assert.throws(
    () => getPublicationDateKeys({ schedule, publishUntil: '2026-09-31' }),
    /prawidłową datę/
  )
  assert.throws(
    () => getPublicationDateKeys({ schedule, publishUntil: '2026-08-31' }),
    /musi należeć do zakresu/
  )
  assert.equal(
    getDefaultPublicationEndDate(createSchedule({ dateTo: 'błędna-data' })),
    ''
  )
})

test('wylicza wszystkie trzy statusy publikacji', () => {
  assert.equal(createSchedule().publicationStatus, 'unpublished')
  assert.equal(
    prepare({ publishUntil: '2026-09-03' }).header.publicationStatus,
    PUBLICATION_STATUSES.PARTIALLY_PUBLISHED
  )
  assert.equal(
    prepare().header.publicationStatus,
    PUBLICATION_STATUSES.PUBLISHED
  )
})

test('brak dnia w ciągłym zakresie blokuje całą publikację', () => {
  const days = dates
    .filter(date => date !== '2026-09-02')
    .map(date => createDay(date))

  assert.throws(
    () => prepare({ publishUntil: '2026-09-03', days }),
    /Brakuje dnia 2026-09-02/
  )
  assert.ok(days.every(day => day.publishedShifts.length === 0))
})

test('data spoza grafiku jest blokowana', () => {
  assert.throws(
    () => prepare({ publishUntil: '2026-09-06' }),
    /musi należeć do zakresu grafiku/
  )
})

test('rozszerzenie do tej samej albo wcześniejszej daty jest blokowane', () => {
  const schedule = createSchedule({
    publicationStatus: 'partially_published',
    publishedUntil: '2026-09-03',
    publishedDaysCount: 3,
    publishedRevision: 1
  })

  assert.throws(
    () => getPublicationDateKeys({
      schedule,
      publishUntil: '2026-09-03'
    }),
    /musi kończyć się po/
  )
  assert.throws(
    () => getPublicationDateKeys({
      schedule,
      publishUntil: '2026-09-02'
    }),
    /musi kończyć się po/
  )
})

test('rozszerzenie publikuje tylko nowe dni', () => {
  const schedule = createSchedule({
    publicationStatus: 'partially_published',
    publishedUntil: '2026-09-02',
    publishedDaysCount: 2,
    publishedRevision: 1
  })
  const days = dates.slice(2).map(date => createDay(date))
  const result = prepare({
    schedule,
    publishUntil: '2026-09-04',
    days
  })

  assert.deepEqual(result.dateKeys, ['2026-09-03', '2026-09-04'])
  assert.equal(result.header.publishedDaysCount, 4)
  assert.equal(result.header.publishedRevision, 2)
})

test('wcześniej opublikowane dni nie są ponownie kopiowane', () => {
  const schedule = createSchedule({
    publicationStatus: 'partially_published',
    publishedUntil: '2026-09-02',
    publishedDaysCount: 2,
    publishedRevision: 1
  })
  const result = prepare({
    schedule,
    publishUntil: '2026-09-04',
    days: dates.slice(2).map(date => createDay(date))
  })

  assert.ok(!result.dateKeys.includes('2026-09-01'))
  assert.ok(!result.dateKeys.includes('2026-09-02'))
})

test('publishedShifts jest niezależną, pełną kopią workingShifts', () => {
  const result = prepare({ publishUntil: '2026-09-01' })
  const publishedDay = result.days[0]

  assert.deepEqual(publishedDay.publishedShifts, publishedDay.workingShifts)
  assert.notEqual(publishedDay.publishedShifts, publishedDay.workingShifts)
  assert.notEqual(
    publishedDay.publishedShifts[0],
    publishedDay.workingShifts[0]
  )
  publishedDay.workingShifts[0].from = '12:00'
  assert.equal(publishedDay.publishedShifts[0].from, '09:00')
  assert.equal(publishedDay.publishedShifts[0].employeeId, null)
})

test('dane zmian przygotowane do Firestore nie zawierają undefined', () => {
  const day = createDay('2026-09-01')
  day.workingShifts[0].optionalValue = undefined
  day.workingShifts[0].decision = {
    godModeAccepted: true,
    optionalReason: undefined
  }
  day.workingShifts[0].warnings = ['Ostrzeżenie', undefined]

  const result = prepare({
    publishUntil: '2026-09-01',
    days: [day]
  })
  const containsUndefined = value => {
    if (value === undefined) return true
    if (Array.isArray(value)) return value.some(containsUndefined)
    if (value && typeof value === 'object') {
      return Object.values(value).some(containsUndefined)
    }
    return false
  }

  assert.equal(containsUndefined(result.header), false)
  assert.equal(
    containsUndefined(result.days[0].publishedShifts),
    false
  )
  assert.equal(
    Object.hasOwn(result.days[0].publishedShifts[0], 'optionalValue'),
    false
  )
  assert.equal(result.days[0].publishedShifts[0].warnings[1], null)
})

test('publikacja zachowuje źródła, zmianę dodatkową, decyzję i ostrzeżenia', () => {
  const result = prepare({ publishUntil: '2026-09-03' })
  const secondDay = result.days[1].publishedShifts
  const thirdDay = result.days[2].publishedShifts

  assert.equal(secondDay[0].assignmentSource, 'AUTO')
  assert.equal(secondDay[1].assignmentSource, 'MANUAL')
  assert.equal(secondDay[1].origin, 'MANUAL_EXTRA')
  assert.equal(thirdDay[0].decision.godModeAccepted, true)
  assert.deepEqual(thirdDay[0].warnings, ['Ostrzeżenie'])
})

test('nieobsadzony wakat nie blokuje publikacji', () => {
  const result = prepare({ publishUntil: '2026-09-01' })

  assert.equal(result.days[0].publishedShifts[0].employeeId, null)
})

test('błąd przynależności dnia nie przygotowuje częściowego wyniku', () => {
  const days = dates.slice(0, 3).map(date => createDay(date))
  days[1].scheduleId = 'schedule-2'

  assert.throws(
    () => prepare({ publishUntil: '2026-09-03', days }),
    /nie należy do tego grafiku/
  )
  assert.ok(days.every(day => day.publishedShifts.length === 0))
})

test('opublikowany dzień dostaje kopię rewizji roboczej i zeruje flagę', () => {
  const result = prepare({
    publishUntil: '2026-09-01',
    days: [createDay('2026-09-01', {
      workingRevision: 7,
      hasUnpublishedChanges: true
    })]
  })

  assert.equal(result.days[0].workingRevision, 7)
  assert.equal(result.days[0].publishedRevision, 7)
  assert.equal(result.days[0].hasUnpublishedChanges, false)
})

test('publikacja zachowuje liczniki i rozdziela rewizje nagłówka oraz dnia', () => {
  const schedule = createSchedule({
    assignedCount: 3,
    unfilledCount: 2,
    extraShiftsCount: 1,
    workingRevision: 9,
    publishedRevision: 2
  })
  const result = prepare({
    schedule,
    publishUntil: '2026-09-01',
    days: [createDay('2026-09-01', { workingRevision: 7 })]
  })
  const mergedHeader = { ...schedule, ...result.header }

  assert.equal(mergedHeader.assignedCount, 3)
  assert.equal(mergedHeader.unfilledCount, 2)
  assert.equal(mergedHeader.extraShiftsCount, 1)
  assert.equal(mergedHeader.workingRevision, 9)
  assert.equal(mergedHeader.publishedRevision, 3)
  assert.equal(result.days[0].publishedRevision, 7)
})

test('jawna kontrola limitu uwzględnia dni wewnętrzne i publiczne', () => {
  assert.equal(assertAtomicPublicationSize(249), 500)
  assert.throws(
    () => assertAtomicPublicationSize(250),
    /zbyt długi, aby zapisać go atomowo/
  )
})

test('edycja opublikowanego dnia oznacza poprawkę bez zmiany publikacji', () => {
  const publishedShifts = shiftsForDate('2026-09-01')
  const day = createDay('2026-09-01', {
    publishedShifts,
    publishedRevision: 2
  })
  const state = getWorkingEditPublicationState({
    day,
    schedule: createSchedule({
      publicationStatus: 'partially_published',
      publishedUntil: '2026-09-01',
      publishedDaysCount: 1,
      publishedRevision: 1
    })
  })
  const editedDay = {
    ...day,
    workingShifts: [],
    hasUnpublishedChanges: state.dayHasUnpublishedChanges
  }

  assert.equal(editedDay.hasUnpublishedChanges, true)
  assert.deepEqual(editedDay.publishedShifts, publishedShifts)
})

test('edycja nieopublikowanego dnia nie jest poprawką publikacji', () => {
  const state = getWorkingEditPublicationState({
    day: createDay('2026-09-04'),
    schedule: createSchedule({
      publicationStatus: 'partially_published',
      publishedUntil: '2026-09-03',
      publishedDaysCount: 3,
      publishedRevision: 1,
      hasUnpublishedChanges: false
    })
  })

  assert.equal(state.dayHasUnpublishedChanges, false)
  assert.equal(state.scheduleHasUnpublishedChanges, false)
})

test('zmiana rewizji dnia na innym urządzeniu blokuje publikację', () => {
  const schedule = createSchedule()
  const day = createDay('2026-09-01', { workingRevision: 3 })

  assert.throws(() => prepareSchedulePublication({
    schedule,
    publishUntil: '2026-09-01',
    days: [day],
    expectedPublicationStatus: 'unpublished',
    expectedPublishedUntil: null,
    expectedPublishedRevision: 0,
    expectedDayRevisions: { '2026-09-01': 2 }
  }), /zmienił się na innym urządzeniu/)
})

test('sam podstawowy dostęp do grafiku nie pozwala publikować', () => {
  assert.equal(canPublishSchedule({
    hasEmployeeSession: true,
    employeePermissions: {
      can_view_schedule: true,
      can_manage_schedule: false
    },
    hasAdminSession: true
  }), false)
  assert.equal(canPublishSchedule({
    hasEmployeeSession: true,
    employeePermissions: {
      can_manage_schedule: true
    }
  }), true)
  assert.equal(canPublishSchedule({ hasAdminSession: true }), true)
})
