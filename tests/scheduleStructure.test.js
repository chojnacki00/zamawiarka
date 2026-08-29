import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_ATOMIC_SCHEDULE_DAYS,
  assertAtomicScheduleSize,
  assertScheduleDayBelongsToSchedule,
  canDeleteUnpublishedSchedule,
  getAtomicScheduleCreationPlan,
  getInitialScheduleStatus,
  getOccupiedScheduleDates,
  getScheduleDayDocumentId,
  shouldShowEmployeeDayQuickAdd
} from '../src/utils/scheduleStructure.js'

test('data jest bezpośrednio identyfikatorem dokumentu dnia', () => {
  assert.equal(
    getScheduleDayDocumentId('2026-09-15'),
    '2026-09-15'
  )
  assert.equal(
    getScheduleDayDocumentId('2026-09-15').includes('schedule'),
    false
  )
})

test('nieprawidłowa data dnia jest odrzucana', () => {
  assert.throws(
    () => getScheduleDayDocumentId('2026-02-30'),
    /Nieprawidłowy identyfikator dnia grafiku/
  )
  assert.throws(
    () => getScheduleDayDocumentId('schedule-1_2026-09-15'),
    /Nieprawidłowy identyfikator dnia grafiku/
  )
})

test('nowy nagłówek otrzymuje wyłącznie nowe pola statusów', () => {
  const status = getInitialScheduleStatus()

  assert.deepEqual(status, {
    lifecycleStatus: 'ready',
    publicationStatus: 'unpublished',
    publishedUntil: null,
    publishedDaysCount: 0
  })
  assert.equal(Object.hasOwn(status, 'status'), false)
})

test('wolne daty nie zgłaszają konfliktu', () => {
  assert.deepEqual(getOccupiedScheduleDates({
    dateKeys: ['2026-09-15', '2026-09-16'],
    occupiedDateKeys: []
  }), [])
})

test('istniejący dokument jednego dnia wskazuje konflikt całej operacji', () => {
  assert.deepEqual(getOccupiedScheduleDates({
    dateKeys: ['2026-09-15', '2026-09-16', '2026-09-17'],
    occupiedDateKeys: ['2026-09-16']
  }), ['2026-09-16'])
})

test('konflikt dat tworzy plan bez jakiegokolwiek zapisu', () => {
  assert.deepEqual(getAtomicScheduleCreationPlan({
    dateKeys: ['2026-09-15', '2026-09-16'],
    occupiedDateKeys: ['2026-09-16']
  }), {
    canCreate: false,
    conflictingDateKeys: ['2026-09-16'],
    createsHeader: false,
    dayDocumentIds: [],
    writesCount: 0
  })
})

test('wolny zakres tworzy plan jednego nagłówka i dokumentów dni', () => {
  assert.deepEqual(getAtomicScheduleCreationPlan({
    dateKeys: ['2026-09-15', '2026-09-16'],
    occupiedDateKeys: []
  }), {
    canCreate: true,
    conflictingDateKeys: [],
    createsHeader: true,
    dayDocumentIds: ['2026-09-15', '2026-09-16'],
    writesCount: 3
  })
})

test('sąsiedni zakres nie zajmuje dat nowego grafiku', () => {
  assert.deepEqual(getOccupiedScheduleDates({
    dateKeys: ['2026-09-16', '2026-09-17'],
    occupiedDateKeys: ['2026-09-15']
  }), [])
})

test('po zwolnieniu wszystkich dni daty są ponownie dostępne', () => {
  const dateKeys = ['2026-09-15', '2026-09-16']

  assert.deepEqual(getOccupiedScheduleDates({
    dateKeys,
    occupiedDateKeys: dateKeys
  }), dateKeys)
  assert.deepEqual(getOccupiedScheduleDates({
    dateKeys,
    occupiedDateKeys: []
  }), [])
})

test('atomowy zapis mieści nagłówek i maksymalnie 499 dni', () => {
  assert.equal(MAX_ATOMIC_SCHEDULE_DAYS, 499)
  assert.equal(assertAtomicScheduleSize(31), 32)
  assert.equal(assertAtomicScheduleSize(499), 500)
  assert.throws(
    () => assertAtomicScheduleSize(500),
    /Maksymalny bezpieczny zakres to 499 dni/
  )
})

test('usunąć można tylko gotowy i nieopublikowany grafik', () => {
  assert.equal(canDeleteUnpublishedSchedule({
    lifecycleStatus: 'ready',
    publicationStatus: 'unpublished'
  }), true)
  assert.equal(canDeleteUnpublishedSchedule({
    lifecycleStatus: 'ready',
    publicationStatus: 'published'
  }), false)
})

test('operacja dnia wymaga zgodnego identyfikatora grafiku', () => {
  assert.equal(assertScheduleDayBelongsToSchedule({
    scheduleId: 'schedule-1'
  }, 'schedule-1'), true)
  assert.throws(
    () => assertScheduleDayBelongsToSchedule({
      scheduleId: 'schedule-2'
    }, 'schedule-1'),
    /Wybrany dzień nie należy do tego grafiku/
  )
})

test('pracownik bez zmiany zawsze otrzymuje szybki plus', () => {
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [],
    hasAssignableVacancy: false
  }), true)
})

test('wolny wakat zachowuje zielony plus po zmianie dodatkowej', () => {
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [{ origin: 'MANUAL_EXTRA' }],
    hasAssignableVacancy: true
  }), true)
})

test('wolny wakat zachowuje zielony plus po zwykłej zmianie', () => {
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [{ origin: null }],
    hasAssignableVacancy: true
  }), true)
})

test('brak pasującego wakatu ukrywa plus przy istniejącej zmianie', () => {
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [{ origin: null }],
    hasAssignableVacancy: false
  }), false)
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [{ origin: 'MANUAL_EXTRA' }],
    hasAssignableVacancy: false
  }), false)
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [
      { origin: 'MANUAL_EXTRA' },
      { origin: null }
    ],
    hasAssignableVacancy: false
  }), false)
})

test('brak zmiany zachowuje fioletowy plus bez pasującego wakatu', () => {
  assert.equal(shouldShowEmployeeDayQuickAdd({
    employeeShifts: [],
    hasAssignableVacancy: false
  }), true)
})
