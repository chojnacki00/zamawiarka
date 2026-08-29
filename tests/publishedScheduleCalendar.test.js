import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublishedCalendarIndex,
  buildPublishedMonthGrid,
  chooseInitialPublishedMonth,
  getEmployeePublishedShifts,
  getPublishedCalendarAccess,
  mergePublishedCalendarMonth,
  resolvePublishedCalendarEmployeeId
} from '../src/utils/publishedScheduleCalendar.js'

const createHeader = (id, dateFrom, publishedUntil, overrides = {}) => ({
  id,
  scheduleId: id,
  name: id,
  dateFrom,
  dateTo: publishedUntil,
  publicationStatus: 'published',
  publishedUntil,
  ...overrides
})

const createShift = (id, employeeId) => ({
  id,
  shiftGroupId: null,
  employeeId,
  employeeNameSnapshot: 'Jan Kowalski',
  positionId: 'position-1',
  positionNameSnapshot: 'Pizzer',
  from: '09:00',
  to: '17:00',
  shiftType: 'REGULAR'
})

const createDay = (date, scheduleId = 'schedule-1', shifts = []) => ({
  id: date,
  date,
  scheduleId,
  publishedRevision: 1,
  employeeIds: [...new Set(shifts.map(shift => shift.employeeId))],
  shifts,
  schemaVersion: 1,
  publishedAt: 'timestamp',
  updatedAt: 'timestamp'
})

test('buduje 42 pola miesiąca zaczynającego się w poniedziałek', () => {
  const grid = buildPublishedMonthGrid({ monthKey: '2026-06' })

  assert.equal(grid.length, 42)
  assert.equal(grid[0].dateKey, '2026-06-01')
  assert.equal(grid[0].columnIndex, 0)
  assert.equal(grid[41].columnIndex, 6)
})

test('miesiąc zaczynający się w niedzielę ma sześć pól poprzedzających', () => {
  const grid = buildPublishedMonthGrid({ monthKey: '2026-02' })

  assert.equal(grid[0].dateKey, '2026-01-26')
  assert.equal(grid[6].dateKey, '2026-02-01')
})

test('luty roku przestępnego zawiera 29 dni', () => {
  const grid = buildPublishedMonthGrid({ monthKey: '2028-02' })

  assert.equal(
    grid.filter(day => day.isCurrentMonth).at(-1).dateKey,
    '2028-02-29'
  )
})

test('każdy wiersz stabilnej siatki ma siedem kolumn', () => {
  const grid = buildPublishedMonthGrid({ monthKey: '2026-08' })

  assert.equal(grid.length / 7, 6)
  assert.deepEqual(grid.slice(0, 7).map(day => day.columnIndex), [0, 1, 2, 3, 4, 5, 6])
})

test('rozpoznaje opublikowany i nieopublikowany dzień', () => {
  const index = buildPublishedCalendarIndex([
    createHeader('schedule-1', '2026-09-01', '2026-09-02')
  ])

  assert.equal(index.scheduleIdByDate['2026-09-01'], 'schedule-1')
  assert.equal(index.scheduleIdByDate['2026-09-03'], undefined)
})

test('łączy publiczne zakresy kilku grafików', () => {
  const index = buildPublishedCalendarIndex([
    createHeader('schedule-1', '2026-08-30', '2026-09-02'),
    createHeader('schedule-2', '2026-10-01', '2026-10-03')
  ])

  assert.deepEqual(index.publishedMonthKeys, ['2026-08', '2026-09', '2026-10'])
})

test('wykrywa nachodzące publiczne zakresy', () => {
  assert.throws(() => buildPublishedCalendarIndex([
    createHeader('schedule-1', '2026-09-01', '2026-09-03'),
    createHeader('schedule-2', '2026-09-03', '2026-09-05')
  ]), /należy do dwóch/)
})

test('wykrywa brak publicznego dokumentu dnia', () => {
  const calendarIndex = buildPublishedCalendarIndex([
    createHeader('schedule-1', '2026-09-01', '2026-09-02')
  ])

  assert.throws(() => mergePublishedCalendarMonth({
    monthKey: '2026-09',
    calendarIndex,
    publicDays: [createDay('2026-09-01')]
  }), /Brakuje publicznych dokumentów/)
})

test('odrzuca publiczny dzień z niewłaściwym scheduleId', () => {
  const calendarIndex = buildPublishedCalendarIndex([
    createHeader('schedule-1', '2026-09-01', '2026-09-01')
  ])

  assert.throws(() => mergePublishedCalendarMonth({
    monthKey: '2026-09',
    calendarIndex,
    publicDays: [createDay('2026-09-01', 'schedule-2')]
  }), /należy do innego grafiku/)
})

test('odrzuca dokument, którego ID jest niezgodne z datą', () => {
  const calendarIndex = buildPublishedCalendarIndex([
    createHeader('schedule-1', '2026-09-01', '2026-09-01')
  ])

  assert.throws(() => mergePublishedCalendarMonth({
    monthKey: '2026-09',
    calendarIndex,
    publicDays: [{
      ...createDay('2026-09-01'),
      documentId: '2026-09-02'
    }]
  }), /identyfikator niezgodny z datą/)
})

test('filtruje zmiany po employeeId', () => {
  const day = createDay('2026-09-01', 'schedule-1', [
    createShift('shift-1', 'employee-1'),
    createShift('shift-2', 'employee-2')
  ])

  assert.deepEqual(
    getEmployeePublishedShifts({ day, employeeId: 'employee-2' }).map(shift => shift.id),
    ['shift-2']
  )
})

test('zwraca kilka zmian jednego pracownika w jednym dniu', () => {
  const day = createDay('2026-09-01', 'schedule-1', [
    createShift('shift-1', 'employee-1'),
    createShift('shift-2', 'employee-1')
  ])

  assert.equal(getEmployeePublishedShifts({
    day,
    employeeId: 'employee-1'
  }).length, 2)
})

test('opublikowany dzień bez zmiany pracownika zwraca pustą listę', () => {
  assert.deepEqual(getEmployeePublishedShifts({
    day: createDay('2026-09-01'),
    employeeId: 'employee-1'
  }), [])
})

test('wybiera bieżący opublikowany miesiąc', () => {
  assert.equal(chooseInitialPublishedMonth({
    currentMonthKey: '2026-09',
    publishedMonthKeys: ['2026-08', '2026-09', '2026-10']
  }), '2026-09')
})

test('wybiera najbliższy przyszły opublikowany miesiąc', () => {
  assert.equal(chooseInitialPublishedMonth({
    currentMonthKey: '2026-09',
    publishedMonthKeys: ['2026-07', '2026-11', '2027-01']
  }), '2026-11')
})

test('bez przyszłego miesiąca wybiera ostatni przeszły', () => {
  assert.equal(chooseInitialPublishedMonth({
    currentMonthKey: '2026-09',
    publishedMonthKeys: ['2026-05', '2026-08']
  }), '2026-08')
})

test('bez publikacji pozostawia bieżący miesiąc', () => {
  assert.equal(chooseInitialPublishedMonth({
    currentMonthKey: '2026-09',
    publishedMonthKeys: []
  }), '2026-09')
})

test('podstawowy pracownik jest ograniczony do własnego employeeId', () => {
  const access = getPublishedCalendarAccess({
    hasEmployeeSession: true,
    employeeId: 'employee-1',
    employeePermissions: { can_view_schedule: true }
  })

  assert.equal(access.canSelectEmployee, false)
  assert.equal(resolvePublishedCalendarEmployeeId({
    access,
    requestedEmployeeId: 'employee-2'
  }), 'employee-1')
})

test('can_manage_schedule pozwala zmienić pracownika', () => {
  const access = getPublishedCalendarAccess({
    hasEmployeeSession: true,
    employeeId: 'employee-1',
    employeePermissions: {
      can_view_schedule: true,
      can_manage_schedule: true
    }
  })

  assert.equal(access.canSelectEmployee, true)
  assert.equal(resolvePublishedCalendarEmployeeId({
    access,
    requestedEmployeeId: 'employee-2'
  }), 'employee-2')
})

test('administrator rozpoczyna bez wybranego pracownika', () => {
  const access = getPublishedCalendarAccess({ hasAdminSession: true })

  assert.equal(access.canSelectEmployee, true)
  assert.equal(resolvePublishedCalendarEmployeeId({ access }), null)
})

test('osoba bez can_view_schedule nie ma dostępu', () => {
  const access = getPublishedCalendarAccess({
    hasEmployeeSession: true,
    employeeId: 'employee-1',
    employeePermissions: { can_manage_schedule: true }
  })

  assert.equal(access.canAccess, false)
  assert.equal(resolvePublishedCalendarEmployeeId({ access }), null)
})
