import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublishedCalendarIndex,
  buildPublishedCalendarDayPresentation,
  buildPublishedDayAriaLabel,
  buildPublishedMonthGrid,
  buildPublishedShiftStack,
  chooseInitialPublishedMonth,
  getEmployeePublishedShifts,
  getPublishedCalendarAccess,
  getPublishedShiftCardPresentation,
  mergePublishedCalendarMonth,
  PUBLISHED_POSITION_LABEL_LIMITS,
  resolvePublishedCalendarEmployeeId,
  sortPublishedShiftsForDisplay,
  truncatePublishedPositionName
} from '../src/utils/publishedScheduleCalendar.js'
import {
  PUBLISHED_SCHEDULE_EXTRA_COLOR,
  PUBLISHED_SCHEDULE_NEUTRAL_COLOR
} from '../src/utils/schedulePositionColors.js'

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

const createShift = (id, employeeId, overrides = {}) => ({
  id,
  shiftGroupId: null,
  employeeId,
  employeeNameSnapshot: 'Jan Kowalski',
  positionId: 'position-1',
  positionNameSnapshot: 'Pizzer',
  from: '09:00',
  to: '17:00',
  shiftType: 'REGULAR',
  ...overrides
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

test('sortuje zmiany prezentacyjne według godziny rozpoczęcia', () => {
  const shifts = [
    createShift('shift-late', 'employee-1', { from: '18:00' }),
    createShift('shift-early', 'employee-1', { from: '07:00' })
  ]

  assert.deepEqual(
    sortPublishedShiftsForDisplay(shifts).map(shift => shift.id),
    ['shift-early', 'shift-late']
  )
  assert.deepEqual(shifts.map(shift => shift.id), ['shift-late', 'shift-early'])
})

test('przy tej samej godzinie REGULAR poprzedza EXTRA', () => {
  const shifts = [
    createShift('extra', 'employee-1', { shiftType: 'EXTRA' }),
    createShift('regular', 'employee-1')
  ]

  assert.deepEqual(
    sortPublishedShiftsForDisplay(shifts).map(shift => shift.id),
    ['regular', 'extra']
  )
})

test('przy tej samej godzinie i typie sortuje stabilnie według id', () => {
  const shifts = [
    createShift('shift-c', 'employee-1'),
    createShift('shift-a', 'employee-1'),
    createShift('shift-b', 'employee-1')
  ]

  assert.deepEqual(
    sortPublishedShiftsForDisplay(shifts).map(shift => shift.id),
    ['shift-a', 'shift-b', 'shift-c']
  )
})

test('zwykła zmiana korzysta z koloru i koloru tekstu centralnej palety', () => {
  const card = getPublishedShiftCardPresentation(createShift(
    'regular',
    'employee-1',
    { positionColorSnapshot: '#FDBA74' }
  ))

  assert.equal(card.backgroundColor, '#FDBA74')
  assert.equal(card.textColor, '#7C2D12')
  assert.equal(card.positionLabel, 'Pizzer')
  assert.equal(card.isExtra, false)
})

test('zwykła zmiana bez koloru korzysta z neutralnego wariantu', () => {
  const card = getPublishedShiftCardPresentation(createShift(
    'regular',
    'employee-1'
  ))

  assert.equal(card.backgroundColor, PUBLISHED_SCHEDULE_NEUTRAL_COLOR)
  assert.equal(card.textColor, '#1F2937')
})

test('zmiana dodatkowa ze stanowiskiem zachowuje jego kolor i typ EXTRA', () => {
  const card = getPublishedShiftCardPresentation(createShift(
    'extra',
    'employee-1',
    {
      shiftType: 'EXTRA',
      positionColorSnapshot: '#86EFAC'
    }
  ))

  assert.equal(card.backgroundColor, '#86EFAC')
  assert.equal(card.textColor, '#14532D')
  assert.equal(card.positionLabel, 'Pizzer')
  assert.equal(card.isExtra, true)
})

test('zmiana dodatkowa bez stanowiska jest fioletowa i opisana jako Dodatkowa', () => {
  const card = getPublishedShiftCardPresentation(createShift(
    'extra',
    'employee-1',
    {
      shiftType: 'EXTRA',
      positionId: null,
      positionNameSnapshot: 'Bez stanowiska'
    }
  ))

  assert.equal(card.backgroundColor, PUBLISHED_SCHEDULE_EXTRA_COLOR)
  assert.equal(card.textColor, '#4C1D95')
  assert.equal(card.positionLabel, 'Dodatkowa')
})

test('zmiana dodatkowa bez koloru stanowiska korzysta z jednego fioletowego wariantu', () => {
  const card = getPublishedShiftCardPresentation(createShift(
    'extra',
    'employee-1',
    { shiftType: 'EXTRA' }
  ))

  assert.equal(card.backgroundColor, PUBLISHED_SCHEDULE_EXTRA_COLOR)
  assert.equal(card.positionLabel, 'Dodatkowa')
})

test('nieprawidłowy kolor snapshotu jest zastępowany neutralnym', () => {
  const card = getPublishedShiftCardPresentation(createShift(
    'regular',
    'employee-1',
    { positionColorSnapshot: '#123456' }
  ))

  assert.equal(card.backgroundColor, PUBLISHED_SCHEDULE_NEUTRAL_COLOR)
  assert.equal(card.textColor, '#1F2937')
})

test('jedna zmiana tworzy jedną warstwę bez licznika', () => {
  const stack = buildPublishedShiftStack({
    shifts: [createShift('shift-1', 'employee-1')]
  })

  assert.equal(stack.cards.length, 1)
  assert.equal(stack.totalCount, 1)
  assert.equal(stack.hiddenCount, 0)
})

test('wcześniejsza zmiana znajduje się nad późniejszą w stosie', () => {
  const stack = buildPublishedShiftStack({
    shifts: [
      createShift('shift-late', 'employee-1', { from: '15:00' }),
      createShift('shift-early', 'employee-1', { from: '09:00' })
    ]
  })

  assert.deepEqual(
    stack.cards.map(card => card.id),
    ['shift-early', 'shift-late']
  )
  assert.deepEqual(stack.cards.map(card => card.layerIndex), [0, 1])
  assert.deepEqual(stack.cards.map(card => card.zIndex), [2, 1])
  assert.ok(stack.cards[0].zIndex > stack.cards[1].zIndex)
  assert.equal(stack.hiddenCount, 0)
})

test('trzy zmiany wykorzystują maksymalnie trzy widoczne warstwy', () => {
  const stack = buildPublishedShiftStack({
    shifts: [1, 2, 3].map(index => createShift(
      `shift-${index}`,
      'employee-1',
      { from: `0${index + 7}:00` }
    ))
  })

  assert.equal(stack.cards.length, 3)
  assert.deepEqual(stack.cards.map(card => card.layerIndex), [0, 1, 2])
  assert.equal(stack.hiddenCount, 0)
})

test('pięć zmian pokazuje trzy warstwy i licznik dwóch ukrytych', () => {
  const stack = buildPublishedShiftStack({
    shifts: [1, 2, 3, 4, 5].map(index => createShift(
      `shift-${index}`,
      'employee-1',
      { from: `${String(index + 7).padStart(2, '0')}:00` }
    ))
  })

  assert.equal(stack.cards.length, 3)
  assert.equal(stack.totalCount, 5)
  assert.equal(stack.hiddenCount, 2)
})

test('długa nazwa stanowiska pozostaje w modelu kapsla do ucięcia przez CSS', () => {
  const longName = 'Starszy specjalista przygotowania wyjątkowo długich zamówień'
  const card = getPublishedShiftCardPresentation(createShift(
    'regular',
    'employee-1',
    { positionNameSnapshot: longName }
  ))

  assert.equal(card.positionLabel, longName)
  assert.match(card.compactPositionLabel, /\/$/)
  assert.match(card.mediumPositionLabel, /\/$/)
  assert.match(card.desktopPositionLabel, /\/$/)
})

test('krótka nazwa stanowiska pozostaje bez znaku skrócenia', () => {
  assert.equal(truncatePublishedPositionName('Bar', 7), 'Bar')
})

test('długa nazwa stanowiska kończy się pojedynczym znakiem ukośnika', () => {
  assert.equal(
    truncatePublishedPositionName('Kucharka zmianowa', 7),
    'Kuchar/'
  )
})

test('skrócona nazwa mieści się w limicie wariantu kompaktowego', () => {
  const result = truncatePublishedPositionName(
    'Bardzo długie stanowisko',
    PUBLISHED_POSITION_LABEL_LIMITS.compact
  )

  assert.equal(
    Array.from(result).length,
    PUBLISHED_POSITION_LABEL_LIMITS.compact
  )
  assert.equal(result.endsWith('/'), true)
})

test('buduje czytelny opis aria-label dnia wraz ze wszystkimi zmianami', () => {
  const label = buildPublishedDayAriaLabel({
    dateKey: '2026-09-12',
    shifts: [
      createShift('regular', 'employee-1'),
      createShift('extra', 'employee-1', {
        from: '18:00',
        to: '22:00',
        shiftType: 'EXTRA',
        positionId: null,
        positionNameSnapshot: null
      })
    ]
  })

  assert.match(label, /^12 września, 2 zmiany:/)
  assert.match(label, /9:00–17:00 Pizzer/)
  assert.match(label, /18:00–22:00 zmiana dodatkowa/)
})

test('bez wybranego pracownika opublikowany dzień nie tworzy kapsli', () => {
  const presentation = buildPublishedCalendarDayPresentation({
    dateKey: '2026-09-01',
    day: createDay('2026-09-01', 'schedule-1', [
      createShift('shift-1', 'employee-1')
    ]),
    employeeId: null
  })

  assert.equal(presentation.shiftStack.cards.length, 0)
})

test('opublikowany dzień bez zmiany wybranego pracownika nie tworzy kapsla', () => {
  const presentation = buildPublishedCalendarDayPresentation({
    dateKey: '2026-09-01',
    day: createDay('2026-09-01', 'schedule-1', [
      createShift('shift-1', 'employee-2')
    ]),
    employeeId: 'employee-1'
  })

  assert.equal(presentation.shiftStack.cards.length, 0)
  assert.equal(presentation.isPublished, true)
})

test('kapsle nie wpływają na rozpoznanie aktywności opublikowanego dnia', () => {
  const publishedWithoutShifts = buildPublishedCalendarDayPresentation({
    dateKey: '2026-09-01',
    day: createDay('2026-09-01'),
    employeeId: 'employee-1'
  })
  const unpublished = buildPublishedCalendarDayPresentation({
    dateKey: '2026-09-02',
    day: null,
    employeeId: 'employee-1'
  })

  assert.equal(publishedWithoutShifts.isInteractive, true)
  assert.equal(unpublished.isInteractive, false)
  assert.equal(unpublished.ariaLabel, null)
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
