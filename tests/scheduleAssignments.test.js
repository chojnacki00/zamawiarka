import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSIGNMENT_SOURCES,
  SHIFT_ORIGINS,
  assignShiftManually,
  canGeneratorModifyShift,
  clearRegularVacancyAssignment,
  createEmptyRegularVacancy,
  createManualExtraShift,
  getWorkingShiftCounters,
  isAutomaticAssignment,
  isEmptyRegularVacancy,
  isExtraShift,
  isManualAssignment,
  replaceShiftWarnings
} from '../src/utils/scheduleAssignments.js'
import { getEmploymentRuleWarnings } from '../src/utils/employmentRules.js'

const vacancy = (overrides = {}) => createEmptyRegularVacancy({
  id: 'vacancy-1',
  positionId: 'position-1',
  positionColorSnapshot: '#FDBA74',
  from: '09:00',
  to: '17:00',
  ...overrides
})

test('nowy wakat jest pusty i nie ma źródła przypisania', () => {
  const shift = vacancy()
  assert.equal(shift.employeeId, null)
  assert.equal(shift.assignmentSource, null)
  assert.equal(isEmptyRegularVacancy(shift), true)
})

test('ręczne obsadzenie zwykłego wakatu zapisuje MANUAL', () => {
  const shift = assignShiftManually(vacancy(), {
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski'
  })
  assert.equal(shift.assignmentSource, ASSIGNMENT_SOURCES.MANUAL)
  assert.equal(isManualAssignment(shift), true)
  assert.equal(shift.positionColorSnapshot, '#FDBA74')
})

test('ręczna zmiana dodatkowa zapisuje MANUAL', () => {
  const shift = createManualExtraShift({
    id: 'extra-1',
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    from: '18:00',
    to: '22:00'
  })
  assert.equal(shift.origin, SHIFT_ORIGINS.MANUAL_EXTRA)
  assert.equal(shift.assignmentSource, ASSIGNMENT_SOURCES.MANUAL)
  assert.equal(isExtraShift(shift), true)
})

test('God Mode pozostaje ręczny, a decyzja jest zapisana oddzielnie', () => {
  const shift = assignShiftManually(vacancy(), {
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    decision: { competency: 3 },
    warnings: ['Przekroczony limit tygodniowy.']
  })
  assert.equal(shift.assignmentSource, ASSIGNMENT_SOURCES.MANUAL)
  assert.equal(shift.decision.godModeAccepted, true)
  assert.deepEqual(shift.warnings, ['Przekroczony limit tygodniowy.'])
})

test('wyczyszczenie zwykłego wakatu usuwa całe przypisanie', () => {
  const assigned = assignShiftManually(vacancy(), {
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    decision: { competency: 4 },
    warnings: ['Ostrzeżenie']
  })
  const cleared = clearRegularVacancyAssignment(assigned)
  assert.equal(cleared.employeeId, null)
  assert.equal(cleared.employeeNameSnapshot, null)
  assert.equal(cleared.assignmentSource, null)
  assert.equal(cleared.decision, null)
  assert.deepEqual(cleared.warnings, [])
  assert.equal(cleared.positionColorSnapshot, '#FDBA74')
})

test('przeliczenie ostrzeżeń zachowuje snapshot koloru', () => {
  const shift = replaceShiftWarnings(vacancy(), ['Nowe ostrzeżenie'])

  assert.deepEqual(shift.warnings, ['Nowe ostrzeżenie'])
  assert.equal(shift.positionColorSnapshot, '#FDBA74')
})

test('zmiana dodatkowa ze stanowiskiem zachowuje snapshot koloru', () => {
  const shift = createManualExtraShift({
    id: 'extra-position-1',
    positionId: 'position-1',
    positionColorSnapshot: '#FDBA74',
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    from: '18:00',
    to: '22:00'
  })

  assert.equal(shift.positionColorSnapshot, '#FDBA74')
})

test('zmiana dodatkowa bez stanowiska nie otrzymuje koloru', () => {
  const shift = createManualExtraShift({
    id: 'extra-no-position-1',
    positionId: null,
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    from: '18:00',
    to: '22:00'
  })

  assert.equal('positionColorSnapshot' in shift, false)
})

test('zmiana dodatkowa jest usuwana oddzielnie od zwykłych wakatów', () => {
  const regular = vacancy()
  const extra = createManualExtraShift({
    id: 'extra-1',
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    from: '18:00',
    to: '22:00'
  })
  const remaining = [regular, extra].filter(shift => shift.id !== extra.id)
  assert.deepEqual(remaining, [regular])
})

test('generator może obsadzić wyłącznie pusty zwykły wakat', () => {
  const empty = vacancy()
  const manual = assignShiftManually(empty, {
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski'
  })
  const extra = createManualExtraShift({
    id: 'extra-1',
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    from: '18:00',
    to: '22:00'
  })
  assert.equal(canGeneratorModifyShift(empty), true)
  assert.equal(canGeneratorModifyShift(manual), false)
  assert.equal(canGeneratorModifyShift(extra), false)
})

test('przypisanie AUTO jest rozpoznawane bez uruchamiania generatora', () => {
  const shift = {
    ...vacancy(),
    employeeId: 'employee-1',
    employeeNameSnapshot: 'Jan Kowalski',
    assignmentSource: ASSIGNMENT_SOURCES.AUTO
  }
  assert.equal(isAutomaticAssignment(shift), true)
  assert.equal(isManualAssignment(shift), false)
  assert.equal(canGeneratorModifyShift(shift), false)
})

test('ręczne, automatyczne i dodatkowe zmiany wchodzą do sumy godzin', () => {
  const shifts = [
    assignShiftManually(vacancy({ from: '09:00', to: '17:00' }), {
      employeeId: 'employee-1',
      employeeNameSnapshot: 'Jan Kowalski'
    }),
    {
      ...vacancy({ id: 'auto-1', from: '17:00', to: '21:00' }),
      employeeId: 'employee-1',
      employeeNameSnapshot: 'Jan Kowalski',
      assignmentSource: ASSIGNMENT_SOURCES.AUTO
    },
    createManualExtraShift({
      id: 'extra-1',
      employeeId: 'employee-1',
      employeeNameSnapshot: 'Jan Kowalski',
      from: '21:00',
      to: '23:00'
    })
  ]
  const days = [
    { id: '2026-09-07', date: '2026-09-07', workingShifts: shifts },
    { id: '2026-09-08', date: '2026-09-08', workingShifts: [] }
  ]
  const warnings = getEmploymentRuleWarnings({
    employee: {
      id: 'employee-1',
      effectiveEmploymentRules: {
        targetHours: { applies: false, amount: 0, unit: 'week' },
        targetTolerance: { applies: false, minusHours: 0, plusHours: 0 },
        maximumDailyHours: { applies: false, hours: 24 },
        maximumWeeklyHours: { applies: true, hours: 14 },
        maximumConsecutiveDays: { applies: false, days: 7 }
      }
    },
    profile: null,
    days,
    day: days[1],
    shift: {
      id: 'candidate-1',
      employeeId: 'employee-1',
      from: '09:00',
      to: '10:00'
    }
  })

  assert.ok(warnings.some(warning => warning.includes(
    '15 h zamiast maksymalnie 14 h'
  )))
})

test('liczniki oddzielają wakaty od zmian dodatkowych', () => {
  const shifts = [
    vacancy({ id: 'empty-1' }),
    assignShiftManually(vacancy({ id: 'manual-1' }), {
      employeeId: 'employee-1',
      employeeNameSnapshot: 'Jan Kowalski'
    }),
    {
      ...vacancy({ id: 'auto-1' }),
      employeeId: 'employee-2',
      employeeNameSnapshot: 'Anna Nowak',
      assignmentSource: ASSIGNMENT_SOURCES.AUTO
    },
    createManualExtraShift({
      id: 'extra-1',
      employeeId: 'employee-1',
      employeeNameSnapshot: 'Jan Kowalski',
      from: '18:00',
      to: '22:00'
    })
  ]
  assert.deepEqual(getWorkingShiftCounters(shifts), {
    assignedCount: 2,
    unfilledCount: 1,
    extraShiftsCount: 1
  })
})
