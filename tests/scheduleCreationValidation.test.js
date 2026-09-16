import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildScheduleRangeProblems,
  dateRangesOverlap,
  getMissingDemandModelDates,
  getOpenAvailabilityPeriodConflicts,
  getScheduleContinuity,
  getScheduleRangeConflicts,
  isPeriodEffectivelyOpen,
  isValidDateRange
} from '../src/utils/scheduleCreationValidation.js'

const nowMs = Date.UTC(2026, 7, 27, 12)
const todayDateKey = '2026-08-27'
const closesAfterNow = new Date(Date.UTC(2026, 7, 28, 20)).toISOString()
const closesBeforeNow = new Date(Date.UTC(2026, 7, 26, 20)).toISOString()

test('nieprawidłowe i odwrócone daty są odrzucane', () => {
  assert.equal(isValidDateRange('2026-02-30', '2026-03-01'), false)
  assert.equal(isValidDateRange('2026-09-20', '2026-09-10'), false)
  assert.equal(isValidDateRange('2026-09-10', '2026-09-20'), true)
})

const period = overrides => ({
  id: 'period-1',
  name: 'Dyspozycje wrzesień',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-30',
  status: 'open',
  closesAt: closesAfterNow,
  ...overrides
})

const getOpenConflicts = periods => getOpenAvailabilityPeriodConflicts({
  periods,
  dateFrom: '2026-09-10',
  dateTo: '2026-09-20',
  nowMs,
  todayDateKey
})

test('skutecznie otwarty okres przecinający zakres blokuje tworzenie', () => {
  assert.equal(
    isPeriodEffectivelyOpen(period(), { nowMs, todayDateKey }),
    true
  )
  assert.equal(getOpenConflicts([period()]).length, 1)
})

test('okres wstrzymany nie jest skutecznie otwarty', () => {
  assert.equal(getOpenConflicts([period({ status: 'closed' })]).length, 0)
})

test('zapisany status open po upływie terminu nie blokuje tworzenia', () => {
  assert.equal(
    getOpenConflicts([period({ closesAt: closesBeforeNow })]).length,
    0
  )
})

test('kilka zamkniętych okresów w jednym zakresie jest dozwolone', () => {
  assert.equal(getOpenConflicts([
    period({ id: 'period-1', status: 'closed' }),
    period({
      id: 'period-2',
      status: 'closed',
      dateFrom: '2026-09-15',
      dateTo: '2026-10-15'
    })
  ]).length, 0)
})

test('otwarty okres przecinający tylko jeden dzień zakresu blokuje', () => {
  assert.equal(getOpenConflicts([
    period({ dateFrom: '2026-09-20', dateTo: '2026-10-10' })
  ]).length, 1)
})

const schedule = (dateFrom, dateTo) => ({
  id: 'schedule-1',
  name: 'Grafik testowy',
  dateFrom,
  dateTo,
  lifecycleStatus: 'ready',
  publicationStatus: 'unpublished'
})

const conflictsWith = (existingFrom, existingTo, newFrom, newTo) => (
  getScheduleRangeConflicts({
    schedules: [schedule(existingFrom, existingTo)],
    dateFrom: newFrom,
    dateTo: newTo
  }).length > 0
)

test('zakresy dat są domknięte', () => {
  assert.equal(dateRangesOverlap(
    '2026-09-01',
    '2026-09-30',
    '2026-09-30',
    '2026-10-10'
  ), true)
})

test('identyczny zakres grafiku jest blokowany', () => {
  assert.equal(conflictsWith(
    '2026-09-01', '2026-09-30',
    '2026-09-01', '2026-09-30'
  ), true)
})

test('częściowe nakładanie z lewej strony jest blokowane', () => {
  assert.equal(conflictsWith(
    '2026-09-10', '2026-09-30',
    '2026-09-01', '2026-09-15'
  ), true)
})

test('częściowe nakładanie z prawej strony jest blokowane', () => {
  assert.equal(conflictsWith(
    '2026-09-01', '2026-09-20',
    '2026-09-15', '2026-09-30'
  ), true)
})

test('nowy zakres obejmujący istniejący grafik jest blokowany', () => {
  assert.equal(conflictsWith(
    '2026-09-10', '2026-09-20',
    '2026-09-01', '2026-09-30'
  ), true)
})

test('istniejący grafik obejmujący nowy zakres jest blokowany', () => {
  assert.equal(conflictsWith(
    '2026-09-01', '2026-09-30',
    '2026-09-10', '2026-09-20'
  ), true)
})

test('wspólny jeden dzień grafiku jest blokowany', () => {
  assert.equal(conflictsWith(
    '2026-09-01', '2026-09-15',
    '2026-09-15', '2026-09-30'
  ), true)
})

test('zakres zaczynający się następnego dnia jest dozwolony', () => {
  assert.equal(conflictsWith(
    '2026-09-01', '2026-09-14',
    '2026-09-15', '2026-09-30'
  ), false)
})

test('luka pomiędzy grafikami jest dozwolona', () => {
  assert.equal(conflictsWith(
    '2026-09-01', '2026-09-10',
    '2026-09-15', '2026-09-30'
  ), false)
})

const continuity = ({ schedules = [], scheduleDays = [] } = {}) => (
  getScheduleContinuity({
    dateFrom: '2026-09-15',
    schedules,
    scheduleDays
  })
)

test('aktywny opublikowany dzień bezpośrednio wcześniej zachowuje ciągłość', () => {
  const result = continuity({
    schedules: [schedule('2026-09-01', '2026-09-14')],
    scheduleDays: [{
      scheduleId: 'schedule-1',
      date: '2026-09-14',
      publishedRevision: 1,
      publishedShifts: []
    }]
  })

  assert.equal(result.previousDate, '2026-09-14')
  assert.equal(result.previousDayWasPublished, true)
  assert.equal(result.requiresWarning, false)
})

test('brak dokumentu poprzedniego dnia wywołuje ostrzeżenie', () => {
  assert.equal(continuity({
    schedules: [schedule('2026-09-01', '2026-09-14')]
  }).requiresWarning, true)
})

test('poprzedni dzień bez aktywnej publikacji wywołuje ostrzeżenie', () => {
  assert.equal(continuity({
    schedules: [schedule('2026-09-01', '2026-09-14')],
    scheduleDays: [{
      scheduleId: 'schedule-1',
      date: '2026-09-14',
      publishedRevision: 0,
      publishedShifts: []
    }]
  }).requiresWarning, true)
})

test('luka jednego dnia wywołuje ostrzeżenie', () => {
  assert.equal(continuity({
    schedules: [schedule('2026-09-01', '2026-09-13')],
    scheduleDays: [{
      scheduleId: 'schedule-1',
      date: '2026-09-13',
      publishedRevision: 1
    }]
  }).requiresWarning, true)
})

test('wcześniejszy grafik kończący się wcześniej wywołuje ostrzeżenie', () => {
  assert.equal(continuity({
    schedules: [schedule('2026-08-01', '2026-08-31')]
  }).requiresWarning, true)
})

test('pierwszy grafik w systemie wywołuje nieblokujące ostrzeżenie', () => {
  const result = continuity()
  assert.equal(result.requiresWarning, true)
  assert.equal(result.previousDayWasPublished, false)
})

test('wycofana publikacja i usunięty grafik nie zachowują ciągłości', () => {
  const withdrawn = continuity({
    schedules: [schedule('2026-09-01', '2026-09-14')],
    scheduleDays: [{
      scheduleId: 'schedule-1',
      date: '2026-09-14',
      publishedRevision: 2,
      publicationStatus: 'withdrawn'
    }]
  })
  const deleted = continuity({
    schedules: [{
      ...schedule('2026-09-01', '2026-09-14'),
      isDeleted: true
    }],
    scheduleDays: [{
      scheduleId: 'schedule-1',
      date: '2026-09-14',
      publishedRevision: 2
    }]
  })

  assert.equal(withdrawn.requiresWarning, true)
  assert.equal(deleted.requiresWarning, true)
})

const getRangeProblems = ({
  openAvailabilityConflicts = [],
  scheduleConflicts = [],
  missingDates = []
} = {}) => buildScheduleRangeProblems({
  openAvailabilityConflicts,
  scheduleConflicts,
  missingDates
})

test('tylko otwarty okres tworzy jedną sekcję o dyspozycjach', () => {
  const result = getRangeProblems({
    openAvailabilityConflicts: [period()]
  })

  assert.equal(result.hasProblems, true)
  assert.deepEqual(result.sections.map(section => section.key), [
    'open-availability'
  ])
  assert.deepEqual(result.sections[0].items, [
    'Dyspozycje wrzesień — 01.09.2026–30.09.2026'
  ])
})

test('tylko wspólne daty tworzą jedną sekcję o grafiku', () => {
  const result = getRangeProblems({
    scheduleConflicts: [schedule('2026-09-01', '2026-09-30')]
  })

  assert.deepEqual(result.sections.map(section => section.key), [
    'schedule-conflicts'
  ])
  assert.deepEqual(result.sections[0].items, [
    'Grafik testowy — 01.09.2026–30.09.2026'
  ])
})

test('tylko brak modelu tworzy jedną sekcję z uporządkowaną listą dat', () => {
  const result = getRangeProblems({
    missingDates: ['2026-09-13', '2026-09-12', '2026-09-12']
  })

  assert.deepEqual(result.sections.map(section => section.key), [
    'missing-models'
  ])
  assert.deepEqual(result.sections[0].items, [
    '12.09.2026',
    '13.09.2026'
  ])
})

test('otwarty okres i wspólne daty są łączone w jednym wyniku', () => {
  const result = getRangeProblems({
    openAvailabilityConflicts: [period()],
    scheduleConflicts: [schedule('2026-09-01', '2026-09-30')]
  })

  assert.deepEqual(result.sections.map(section => section.key), [
    'open-availability',
    'schedule-conflicts'
  ])
})

test('wszystkie trzy problemy są łączone w trzech sekcjach', () => {
  const result = getRangeProblems({
    openAvailabilityConflicts: [period()],
    scheduleConflicts: [schedule('2026-09-01', '2026-09-30')],
    missingDates: ['2026-09-12']
  })

  assert.deepEqual(result.sections.map(section => section.key), [
    'open-availability',
    'schedule-conflicts',
    'missing-models'
  ])
})

test('brak problemów pozwala przejść do następnego kroku', () => {
  const result = getRangeProblems()

  assert.equal(result.hasProblems, false)
  assert.deepEqual(result.sections, [])
})

test('ponowna kontrola wymaganych danych wykrywa model usunięty po analizie', () => {
  const input = {
    dateFrom: '2026-09-12',
    dateTo: '2026-09-12',
    availabilityDays: [{
      id: '2026-09-12',
      date: '2026-09-12',
      demandModelId: 'model-1'
    }]
  }

  assert.deepEqual(getMissingDemandModelDates({
    ...input,
    demandModels: [{ id: 'model-1' }]
  }), [])
  assert.deepEqual(getMissingDemandModelDates({
    ...input,
    demandModels: []
  }), ['2026-09-12'])
})
