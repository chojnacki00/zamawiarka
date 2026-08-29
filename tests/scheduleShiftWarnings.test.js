import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasAvailabilityRangeWarning,
  hasNonAvailabilityWarnings,
  isAvailabilityWarning,
  shouldShowGeneralOverride
} from '../src/utils/scheduleShiftWarnings.js'

test('ostrzeżenia dyspozycji są rozpoznawane oddzielnie', () => {
  assert.equal(
    isAvailabilityWarning(
      'Pracownik oznaczył, że nie może pracować.'
    ),
    true
  )
  assert.equal(
    isAvailabilityWarning('Pracownik poprosił o wolne.'),
    true
  )
  assert.equal(
    isAvailabilityWarning(
      'Dyspozycja 09:00–15:00 nie obejmuje całej zmiany.'
    ),
    true
  )
})

test('sama dyspozycja nie pokazuje ogólnego pominięcia ograniczeń', () => {
  const shift = {
    employeeId: 'employee-1',
    assignmentSource: 'MANUAL',
    warnings: ['Pracownik poprosił o wolne.']
  }

  assert.equal(hasNonAvailabilityWarnings(shift.warnings), false)
  assert.equal(shouldShowGeneralOverride(shift), false)
})

test('inne ostrzeżenie zachowuje ogólne pominięcie ograniczeń', () => {
  const shift = {
    employeeId: 'employee-1',
    assignmentSource: 'MANUAL',
    warnings: [
      'Pracownik poprosił o wolne.',
      'Przekroczony limit dzienny profilu.'
    ]
  }

  assert.equal(hasNonAvailabilityWarnings(shift.warnings), true)
  assert.equal(shouldShowGeneralOverride(shift), true)
})

test('ostrzeżenia przypisania AUTO nie są decyzją God Mode managera', () => {
  const shift = {
    employeeId: 'employee-1',
    assignmentSource: 'AUTO',
    warnings: ['Przekroczony limit dzienny profilu.']
  }

  assert.equal(shouldShowGeneralOverride(shift), false)
})

test('wyjście poza podane godziny jest wykrywane dla drugiej ikony', () => {
  assert.equal(
    hasAvailabilityRangeWarning([
      'Dyspozycja 09:00–15:00 nie obejmuje całej zmiany.'
    ]),
    true
  )
  assert.equal(
    hasAvailabilityRangeWarning([
      'Pracownik poprosił o wolne.'
    ]),
    false
  )
})
