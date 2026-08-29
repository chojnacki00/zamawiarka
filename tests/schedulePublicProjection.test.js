import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PUBLIC_SCHEDULE_DAY_FIELDS,
  PUBLIC_SCHEDULE_HEADER_FIELDS,
  PUBLIC_SHIFT_FIELDS,
  buildPublicScheduleDay,
  buildPublicScheduleHeader,
  buildPublicScheduleShift,
  preparePublicScheduleProjection
} from '../src/utils/schedulePublicProjection.js'
import { assertAtomicPublicationSize } from '../src/utils/schedulePublication.js'

const dates = [
  '2026-09-01',
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-05'
]

const createSchedule = overrides => ({
  id: 'schedule-1',
  name: 'Grafik wrzesień 2026',
  dateFrom: dates[0],
  dateTo: dates[4],
  lifecycleStatus: 'ready',
  publicationStatus: 'unpublished',
  publishedUntil: null,
  publishedDaysCount: 0,
  publishedRevision: 0,
  ...overrides
})

const createShifts = date => ([{
  id: `regular-${date}`,
  shiftGroupId: 'group-1',
  employeeId: 'employee-1',
  employeeNameSnapshot: 'Jan Kowalski',
  positionId: 'position-1',
  positionNameSnapshot: 'Pizzer',
  positionColorSnapshot: '#FDBA74',
  from: '09:00',
  to: '17:00',
  assignmentSource: 'MANUAL',
  warnings: ['Przekroczony limit'],
  decision: { godModeAccepted: true },
  competency: 5,
  availability: 'unavailable'
}, {
  id: `vacancy-${date}`,
  shiftGroupId: 'group-2',
  employeeId: null,
  employeeNameSnapshot: null,
  positionId: 'position-2',
  positionNameSnapshot: 'Kelner',
  from: '10:00',
  to: '18:00',
  assignmentSource: null,
  warnings: []
}, {
  id: `extra-${date}`,
  shiftGroupId: null,
  employeeId: 'employee-1',
  employeeNameSnapshot: 'Jan Kowalski',
  positionId: null,
  positionNameSnapshot: 'Bez stanowiska',
  from: '18:00',
  to: '20:00',
  origin: 'MANUAL_EXTRA',
  assignmentSource: 'MANUAL',
  warnings: ['Dyspozycja'],
  decision: { godModeAccepted: true }
}])

const createPublishedDay = (date, overrides = {}) => ({
  id: date,
  date,
  scheduleId: 'schedule-1',
  workingShifts: createShifts(date),
  publishedShifts: createShifts(date),
  workingRevision: 2,
  publishedRevision: 2,
  hasUnpublishedChanges: false,
  ...overrides
})

const createFirstProjection = ({
  publishUntil = dates[4],
  dayDates = dates
} = {}) => {
  const previousSchedule = createSchedule()
  const publishedSchedule = createSchedule({
    publicationStatus: publishUntil === dates[4]
      ? 'published'
      : 'partially_published',
    publishedUntil: publishUntil,
    publishedDaysCount: dates.indexOf(publishUntil) + 1,
    publishedRevision: 1
  })

  return preparePublicScheduleProjection({
    previousSchedule,
    publishedSchedule,
    publishedDays: dayDates.map(createPublishedDay),
    publishedAt: 'timestamp-1',
    updatedAt: 'timestamp-1'
  })
}

const createExtensionInput = () => {
  const previousSchedule = createSchedule({
    publicationStatus: 'partially_published',
    publishedUntil: dates[1],
    publishedDaysCount: 2,
    publishedRevision: 1
  })
  const existingHeader = buildPublicScheduleHeader({
    schedule: previousSchedule,
    publishedAt: 'timestamp-1',
    lastPublishedAt: 'timestamp-1',
    updatedAt: 'timestamp-1'
  })
  const publishedSchedule = createSchedule({
    publicationStatus: 'published',
    publishedUntil: dates[4],
    publishedDaysCount: 5,
    publishedRevision: 2
  })

  return {
    previousSchedule,
    existingHeader,
    publishedSchedule,
    publishedDays: dates.slice(2).map(createPublishedDay),
    publishedAt: 'timestamp-2',
    updatedAt: 'timestamp-2'
  }
}

const sortedKeys = value => Object.keys(value).sort()

test('publiczny nagłówek zawiera wyłącznie dozwolone pola', () => {
  const projection = createFirstProjection()

  assert.deepEqual(
    sortedKeys(projection.header),
    [...PUBLIC_SCHEDULE_HEADER_FIELDS].sort()
  )
  assert.equal('workingRevision' in projection.header, false)
  assert.equal('hasUnpublishedChanges' in projection.header, false)
  assert.equal('publishedByEmployeeId' in projection.header, false)
})

test('publiczny dzień zawiera wyłącznie dozwolone pola', () => {
  const publicDay = createFirstProjection().days[0]

  assert.deepEqual(
    sortedKeys(publicDay),
    [...PUBLIC_SCHEDULE_DAY_FIELDS].sort()
  )
  assert.equal('workingShifts' in publicDay, false)
  assert.equal('hasUnpublishedChanges' in publicDay, false)
})

test('publiczna zmiana korzysta z jawnej listy dozwolonych pól', () => {
  const publicShift = createFirstProjection().days[0].shifts[0]

  assert.deepEqual(sortedKeys(publicShift), [...PUBLIC_SHIFT_FIELDS].sort())
  assert.equal('warnings' in publicShift, false)
  assert.equal('decision' in publicShift, false)
  assert.equal('assignmentSource' in publicShift, false)
  assert.equal('origin' in publicShift, false)
})

test('pusty wakat nie trafia do publicznych zmian', () => {
  const publicDay = createFirstProjection().days[0]

  assert.equal(publicDay.shifts.length, 2)
  assert.ok(publicDay.shifts.every(shift => shift.employeeId))
  assert.ok(!publicDay.shifts.some(shift => shift.id.startsWith('vacancy-')))
})

test('zwykła zmiana otrzymuje REGULAR, a dodatkowa EXTRA', () => {
  const publicDay = createFirstProjection().days[0]

  assert.equal(publicDay.shifts[0].shiftType, 'REGULAR')
  assert.equal(publicDay.shifts[1].shiftType, 'EXTRA')
  assert.equal('origin' in publicDay.shifts[1], false)
})

test('employeeIds pozostaje unikalne przy kilku zmianach pracownika', () => {
  const publicDay = createFirstProjection().days[0]

  assert.deepEqual(publicDay.employeeIds, ['employee-1'])
})

test('snapshot koloru jest kopiowany tylko gdy istnieje w zmianie', () => {
  const shift = createShifts(dates[0])[0]
  delete shift.positionColorSnapshot
  const withoutColor = buildPublicScheduleShift(shift)
  const withColor = buildPublicScheduleShift({
    ...shift,
    positionColorSnapshot: '#86EFAC'
  })

  assert.equal('positionColorSnapshot' in withoutColor, false)
  assert.equal(withColor.positionColorSnapshot, '#86EFAC')
})

test('publiczna zmiana REGULAR zawiera zamrożony kolor', () => {
  const publicShift = createFirstProjection().days[0].shifts[0]

  assert.equal(publicShift.shiftType, 'REGULAR')
  assert.equal(publicShift.positionColorSnapshot, '#FDBA74')
})

test('publiczna zmiana EXTRA ze stanowiskiem zawiera zamrożony kolor', () => {
  const publicShift = buildPublicScheduleShift({
    ...createShifts(dates[0])[2],
    positionId: 'position-1',
    positionNameSnapshot: 'Pizzer',
    positionColorSnapshot: '#FDBA74'
  })

  assert.equal(publicShift.shiftType, 'EXTRA')
  assert.equal(publicShift.positionColorSnapshot, '#FDBA74')
})

test('publiczna zmiana EXTRA bez stanowiska nie zawiera koloru', () => {
  const publicShift = buildPublicScheduleShift({
    ...createShifts(dates[0])[2],
    positionColorSnapshot: '#FDBA74'
  })

  assert.equal(publicShift.shiftType, 'EXTRA')
  assert.equal('positionColorSnapshot' in publicShift, false)
})

test('starsza publiczna zmiana bez koloru nie pobiera go na żywo', () => {
  const shift = createShifts(dates[0])[0]
  delete shift.positionColorSnapshot
  const publicShift = buildPublicScheduleShift(shift)

  assert.equal('positionColorSnapshot' in publicShift, false)
})

test('undefined i nieznane pola nie trafiają do publicznej projekcji', () => {
  const shift = createShifts(dates[0])[0]
  shift.employeeNameSnapshot = undefined
  shift.secretManagerField = undefined
  const publicShift = buildPublicScheduleShift(shift)
  const publicDay = buildPublicScheduleDay({
    day: createPublishedDay(dates[0], {
      publishedShifts: [shift]
    }),
    publishedAt: 'timestamp-1'
  })
  const containsUndefined = value => {
    if (value === undefined) return true
    if (Array.isArray(value)) return value.some(containsUndefined)
    if (value && typeof value === 'object') {
      return Object.values(value).some(containsUndefined)
    }
    return false
  }

  assert.equal(publicShift.employeeNameSnapshot, null)
  assert.equal('secretManagerField' in publicShift, false)
  assert.equal(containsUndefined(publicDay), false)
})

test('pierwsza częściowa publikacja tworzy tylko wymagane publiczne dni', () => {
  const projection = createFirstProjection({
    publishUntil: dates[1],
    dayDates: dates.slice(0, 2)
  })

  assert.deepEqual(projection.days.map(day => day.date), dates.slice(0, 2))
  assert.equal(projection.header.publicationStatus, 'partially_published')
  assert.equal(projection.header.publishedUntil, dates[1])
})

test('pełna publikacja tworzy komplet publicznych dni', () => {
  const projection = createFirstProjection()

  assert.deepEqual(projection.days.map(day => day.date), dates)
  assert.equal(projection.header.publicationStatus, 'published')
})

test('rozszerzenie tworzy wyłącznie nowe dni', () => {
  const projection = preparePublicScheduleProjection(createExtensionInput())

  assert.deepEqual(projection.days.map(day => day.date), dates.slice(2))
  assert.deepEqual(
    projection.daysToCreate.map(day => day.date),
    dates.slice(2)
  )
})

test('rozszerzenie zachowuje datę pierwszej publikacji nagłówka', () => {
  const projection = preparePublicScheduleProjection(createExtensionInput())

  assert.equal(projection.header.publishedAt, 'timestamp-1')
  assert.equal(projection.header.lastPublishedAt, 'timestamp-2')
})

test('wcześniejsze publiczne dni nie zmieniają się podczas rozszerzenia', () => {
  const oldPublicDay = buildPublicScheduleDay({
    day: createPublishedDay(dates[0]),
    publishedAt: 'timestamp-1'
  })
  const before = structuredClone(oldPublicDay)

  preparePublicScheduleProjection(createExtensionInput())

  assert.deepEqual(oldPublicDay, before)
})

test('edycja robocza nie zmienia istniejącego publicznego dnia', () => {
  const day = createPublishedDay(dates[0])
  const publicDay = buildPublicScheduleDay({
    day,
    publishedAt: 'timestamp-1'
  })
  const before = structuredClone(publicDay)

  day.workingShifts[0].from = '12:00'
  day.hasUnpublishedChanges = true

  assert.deepEqual(publicDay, before)
  assert.equal(publicDay.shifts[0].from, '09:00')
})

test('zgodny istniejący publiczny dzień nie jest nadpisywany', () => {
  const input = createExtensionInput()
  const existingDay = buildPublicScheduleDay({
    day: input.publishedDays[0],
    publishedAt: 'starszy-timestamp'
  })
  const projection = preparePublicScheduleProjection({
    ...input,
    existingDays: [existingDay]
  })

  assert.ok(!projection.daysToCreate.some(day => day.date === dates[2]))
})

test('konflikt publicznego dnia przerywa przygotowanie publikacji', () => {
  const input = createExtensionInput()
  const existingDay = buildPublicScheduleDay({
    day: input.publishedDays[0],
    publishedAt: 'timestamp-1'
  })
  existingDay.shifts[0].from = '12:00'

  assert.throws(
    () => preparePublicScheduleProjection({
      ...input,
      existingDays: [existingDay]
    }),
    /niespodziewany stan/
  )
})

test('błędny scheduleId publicznego dnia przerywa operację', () => {
  const input = createExtensionInput()
  const existingDay = buildPublicScheduleDay({
    day: {
      ...input.publishedDays[0],
      scheduleId: 'schedule-2'
    },
    publishedAt: 'timestamp-1'
  })

  assert.throws(
    () => preparePublicScheduleProjection({
      ...input,
      existingDays: [existingDay]
    }),
    /należy już do innego grafiku/
  )
})

test('brak albo konflikt publicznego nagłówka blokuje rozszerzenie', () => {
  const input = createExtensionInput()

  assert.throws(
    () => preparePublicScheduleProjection({
      ...input,
      existingHeader: null
    }),
    /Brakuje publicznego nagłówka/
  )
  assert.throws(
    () => preparePublicScheduleProjection({
      ...input,
      existingHeader: {
        ...input.existingHeader,
        publishedRevision: 99
      }
    }),
    /niespodziewany stan/
  )
})

test('niespodziewany nagłówek blokuje pierwszą publikację', () => {
  const previousSchedule = createSchedule()
  const existingHeader = buildPublicScheduleHeader({
    schedule: createSchedule({
      publicationStatus: 'partially_published',
      publishedUntil: dates[0],
      publishedDaysCount: 1,
      publishedRevision: 1
    }),
    publishedAt: 'timestamp-1',
    lastPublishedAt: 'timestamp-1'
  })

  assert.throws(
    () => preparePublicScheduleProjection({
      previousSchedule,
      publishedSchedule: createSchedule({
        publicationStatus: 'published',
        publishedUntil: dates[4],
        publishedDaysCount: 5,
        publishedRevision: 1
      }),
      publishedDays: dates.map(createPublishedDay),
      existingHeader,
      publishedAt: 'timestamp-2'
    }),
    /już istnieje/
  )
})

test('limit publikacji liczy 2N + 2 zapisów', () => {
  assert.equal(assertAtomicPublicationSize(1), 4)
  assert.equal(assertAtomicPublicationSize(249), 500)
  assert.throws(
    () => assertAtomicPublicationSize(250),
    /zbyt długi, aby zapisać go atomowo/
  )
})

test('błąd projekcji nie modyfikuje danych wejściowych', () => {
  const input = createExtensionInput()
  const beforeSchedule = structuredClone(input.publishedSchedule)
  const beforeDays = structuredClone(input.publishedDays)
  const existingDay = buildPublicScheduleDay({
    day: input.publishedDays[0],
    publishedAt: 'timestamp-1'
  })
  existingDay.scheduleId = 'schedule-2'

  assert.throws(() => preparePublicScheduleProjection({
    ...input,
    existingDays: [existingDay]
  }))
  assert.deepEqual(input.publishedSchedule, beforeSchedule)
  assert.deepEqual(input.publishedDays, beforeDays)
})
