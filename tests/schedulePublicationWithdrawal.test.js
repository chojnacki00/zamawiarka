import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnpublishSchedule,
  prepareScheduleDeletion,
  prepareScheduleUnpublication
} from '../src/utils/schedulePublicationWithdrawal.js'
import {
  prepareSchedulePublication
} from '../src/utils/schedulePublication.js'
import {
  canDeleteUnpublishedSchedule
} from '../src/utils/scheduleStructure.js'

const dates = [
  '2026-09-01',
  '2026-09-02',
  '2026-09-03'
]

const createSchedule = overrides => ({
  id: 'schedule-1',
  name: 'Grafik wrzesień',
  dateFrom: dates[0],
  dateTo: dates[2],
  lifecycleStatus: 'ready',
  publicationStatus: 'published',
  publishedUntil: dates[2],
  publishedDaysCount: 3,
  publishedRevision: 2,
  publishedAt: 'first-publication',
  lastPublishedAt: 'last-publication',
  publishedByEmployeeId: 'manager-1',
  publishedByAuthUid: null,
  lastPublishedByEmployeeId: 'manager-1',
  lastPublishedByAuthUid: null,
  hasUnpublishedChanges: true,
  workingRevision: 8,
  ...overrides
})

const createDay = (date, overrides = {}) => ({
  id: date,
  date,
  scheduleId: 'schedule-1',
  workingShifts: [{
    id: `shift-${date}`,
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    positionId: 'position-1',
    from: '09:00',
    to: '17:00'
  }],
  publishedShifts: [{ id: `published-${date}` }],
  workingRevision: 4,
  publishedRevision: 4,
  hasUnpublishedChanges: true,
  ...overrides
})

const createPublicHeader = () => ({
  id: 'schedule-1',
  scheduleId: 'schedule-1'
})

const createPublicDay = (date, overrides = {}) => ({
  id: date,
  date,
  scheduleId: 'schedule-1',
  ...overrides
})

const prepare = ({
  schedule = createSchedule(),
  days = dates.map(createDay),
  publicHeader = createPublicHeader(),
  publicDays = dates.map(createPublicDay)
} = {}) => prepareScheduleUnpublication({
  schedule,
  days,
  publicHeader,
  publicDays,
  expectedPublicationStatus: schedule.publicationStatus,
  expectedPublishedUntil: schedule.publishedUntil,
  expectedPublishedRevision: schedule.publishedRevision
})

test('wycofuje całą publikację częściową', () => {
  const schedule = createSchedule({
    publicationStatus: 'partially_published',
    publishedUntil: dates[1],
    publishedDaysCount: 2
  })
  const result = prepare({
    schedule,
    days: dates.slice(0, 2).map(createDay),
    publicDays: dates.slice(0, 2).map(createPublicDay)
  })

  assert.deepEqual(result.dateKeys, dates.slice(0, 2))
  assert.deepEqual(result.publicDayDateKeysToDelete, dates.slice(0, 2))
  assert.equal(result.writesCount, 6)
})

test('wycofuje całą pełną publikację i usuwa plan publicznej projekcji', () => {
  const result = prepare()

  assert.deepEqual(result.dateKeys, dates)
  assert.equal(result.publicHeaderShouldDelete, true)
  assert.deepEqual(result.publicDayDateKeysToDelete, dates)
  assert.equal(result.writesCount, 8)
})

test('resetuje pola nagłówka publikacji', () => {
  const result = prepare()

  assert.deepEqual(result.header, {
    publicationStatus: 'unpublished',
    publishedUntil: null,
    publishedDaysCount: 0,
    publishedRevision: 0,
    publishedAt: null,
    lastPublishedAt: null,
    publishedByEmployeeId: null,
    publishedByAuthUid: null,
    lastPublishedByEmployeeId: null,
    lastPublishedByAuthUid: null,
    hasUnpublishedChanges: false
  })
})

test('zostawia workingShifts i workingRevision oraz czyści publikację dnia', () => {
  const sourceDays = dates.map(createDay)
  const result = prepare({ days: sourceDays })

  result.days.forEach((day, index) => {
    assert.deepEqual(day.workingShifts, sourceDays[index].workingShifts)
    assert.equal(day.workingRevision, sourceDays[index].workingRevision)
    assert.deepEqual(day.publishedShifts, [])
    assert.equal(day.publishedRevision, 0)
    assert.equal(day.hasUnpublishedChanges, false)
  })
})

test('brak publicznego nagłówka i dnia nie blokuje wycofania', () => {
  const result = prepare({
    publicHeader: null,
    publicDays: dates.slice(0, 2).map(createPublicDay)
  })

  assert.equal(result.publicHeaderShouldDelete, false)
  assert.deepEqual(result.publicDayDateKeysToDelete, dates.slice(0, 2))
})

test('publiczny dzień innego grafiku blokuje całą operację bez mutacji', () => {
  const sourceDays = dates.map(createDay)
  const sourceSchedule = createSchedule()

  assert.throws(
    () => prepare({
      schedule: sourceSchedule,
      days: sourceDays,
      publicDays: [
        createPublicDay(dates[0]),
        createPublicDay(dates[1], { scheduleId: 'schedule-2' })
      ]
    }),
    /należy do innego grafiku/
  )
  assert.equal(sourceSchedule.publicationStatus, 'published')
  assert.ok(sourceDays.every(day => day.publishedRevision === 4))
})

test('po wycofaniu można ponownie opublikować aktualne workingShifts', () => {
  const withdrawal = prepare()
  const unpublishedSchedule = {
    ...createSchedule(),
    ...withdrawal.header
  }
  const changedDays = withdrawal.days.map((day, index) => ({
    ...day,
    workingShifts: [{
      ...day.workingShifts[0],
      from: index === 0 ? '10:00' : day.workingShifts[0].from
    }]
  }))
  const publication = prepareSchedulePublication({
    schedule: unpublishedSchedule,
    publishUntil: unpublishedSchedule.dateTo,
    days: changedDays,
    expectedPublicationStatus: 'unpublished',
    expectedPublishedUntil: null,
    expectedPublishedRevision: 0,
    expectedDayRevisions: Object.fromEntries(
      changedDays.map(day => [day.date, day.workingRevision])
    )
  })

  assert.equal(publication.header.publicationStatus, 'published')
  assert.equal(publication.days[0].publishedShifts[0].from, '10:00')
})

test('uprawnienie do wycofania odpowiada zarządzaniu grafikiem', () => {
  assert.equal(canUnpublishSchedule({
    hasEmployeeSession: true,
    employeePermissions: { can_view_schedule: true },
    hasAdminSession: true
  }), false)
  assert.equal(canUnpublishSchedule({
    hasEmployeeSession: true,
    employeePermissions: { can_manage_schedule: true }
  }), true)
  assert.equal(canUnpublishSchedule({ hasAdminSession: true }), true)
})

test('po wycofaniu ponownie można usunąć grafik', () => {
  const result = prepare()

  assert.equal(canDeleteUnpublishedSchedule({
    ...createSchedule(),
    ...result.header
  }), true)
})

test('atomowy plan usunięcia obejmuje wersję roboczą i pozostałości publiczne', () => {
  const withdrawal = prepare()
  const schedule = {
    ...createSchedule(),
    ...withdrawal.header
  }
  const result = prepareScheduleDeletion({
    schedule,
    days: withdrawal.days,
    updates: [{ id: 'planning-context', scheduleId: schedule.id }],
    publicHeader: createPublicHeader(),
    publicDays: [createPublicDay(dates[0])]
  })

  assert.equal(result.deleteScheduleHeader, true)
  assert.equal(result.deletePublicHeader, true)
  assert.deepEqual(result.dayDocumentIds, dates)
  assert.deepEqual(result.updateDocumentIds, ['planning-context'])
  assert.deepEqual(result.publicDayDocumentIds, [dates[0]])
  assert.equal(result.writesCount, 7)
})
