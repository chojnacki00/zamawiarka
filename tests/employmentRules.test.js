import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import {
  createDefaultEmploymentProfile,
  useScheduleEmploymentProfilesStore
} from '../src/stores/scheduleEmploymentProfilesStore.js'
import {
  getEmploymentRuleWarnings,
  getRequiredWeeklyMaximumHours,
  getScaledEmploymentProfile,
  getWeeklyMaximumValidationMessage
} from '../src/utils/employmentRules.js'

const createProfile = overrides => ({
  targetHours: { applies: true, amount: 40, unit: 'week' },
  targetTolerance: {
    applies: true,
    minusHours: 10,
    plusHours: 10
  },
  maximumDailyHours: { applies: false, hours: 14 },
  maximumWeeklyHours: { applies: true, hours: 50 },
  minimumRest: { applies: true, hours: 11 },
  minimumWeeklyRest: { applies: true, hours: 35 },
  maximumConsecutiveDays: { applies: false, days: 6 },
  weekendRotation: {
    applies: true,
    maxConsecutiveSaturdays: 1,
    maxConsecutiveSundays: 1
  },
  breaks: [{
    id: 'break-1',
    applies: true,
    afterHours: 6,
    minutes: 15,
    includedInWorkTime: true
  }],
  ...overrides
})

const createEmployee = percentage => ({
  id: 'employee-1',
  employmentProfileId: 'profile-1',
  employmentPercentage: percentage
})

const createDay = (date, shift = null) => ({
  id: date,
  date,
  workingShifts: shift ? [shift] : []
})

const createShift = (id, from, to) => ({
  id,
  employeeId: 'employee-1',
  from,
  to
})

const getWeekWarnings = ({
  employee = createEmployee(130),
  profile = createProfile(),
  candidateFrom = '09:00',
  candidateTo = '22:00'
} = {}) => {
  const days = [
    createDay('2026-09-07', createShift('shift-1', '09:00', '22:00')),
    createDay('2026-09-08', createShift('shift-2', '09:00', '22:00')),
    createDay('2026-09-09', createShift('shift-3', '09:00', '22:00')),
    createDay('2026-09-10', createShift('shift-4', '09:00', '22:00')),
    createDay('2026-09-11')
  ]
  const shift = createShift(
    'candidate',
    candidateFrom,
    candidateTo
  )

  return getEmploymentRuleWarnings({
    employee,
    profile,
    days,
    day: days[4],
    shift
  })
}

test('blokuje tygodniowe maksimum poniżej celu z górnym odchyleniem', () => {
  const profile = createProfile({
    maximumWeeklyHours: { applies: true, hours: 49 }
  })

  assert.equal(getRequiredWeeklyMaximumHours(profile), 50)
  assert.equal(
    getWeeklyMaximumValidationMessage(profile),
    'Maksymalna liczba godzin tygodniowo nie może być mniejsza niż górna granica celu: 50 h (cel 40 h + odchylenie 10 h).'
  )
})

test('store odrzuca niespójny profil przed zapisem do Firebase', async () => {
  setActivePinia(createPinia())
  const store = useScheduleEmploymentProfilesStore()
  const profile = createDefaultEmploymentProfile()
  profile.name = 'Test walidacji store'
  profile.targetHours = {
    applies: true,
    amount: 40,
    unit: 'week'
  }
  profile.targetTolerance = {
    applies: true,
    minusHours: 10,
    plusHours: 10
  }
  profile.maximumWeeklyHours = {
    applies: true,
    hours: 49
  }

  await assert.rejects(
    store.saveProfile(profile),
    error => error.message ===
      'Maksymalna liczba godzin tygodniowo nie może być mniejsza niż górna granica celu: 50 h (cel 40 h + odchylenie 10 h).'
  )
})

test('pozwala na maksimum równe lub większe od górnej granicy celu', () => {
  assert.equal(
    getWeeklyMaximumValidationMessage(createProfile()),
    ''
  )
  assert.equal(
    getWeeklyMaximumValidationMessage(createProfile({
      maximumWeeklyHours: { applies: true, hours: 55 }
    })),
    ''
  )
})

test('nieaktywne górne odchylenie jest traktowane jako zero', () => {
  const profile = createProfile({
    targetTolerance: {
      applies: false,
      minusHours: 10,
      plusHours: 10
    },
    maximumWeeklyHours: { applies: true, hours: 40 }
  })

  assert.equal(getRequiredWeeklyMaximumHours(profile), 40)
  assert.equal(getWeeklyMaximumValidationMessage(profile), '')
})

test('nieaktywna tolerancja nie wyłącza kontroli tygodniowego celu', () => {
  const profile = createProfile({
    targetHours: { applies: true, amount: 40, unit: 'week' },
    targetTolerance: {
      applies: false,
      minusHours: 10,
      plusHours: 10
    },
    maximumWeeklyHours: { applies: true, hours: 72 }
  })
  const employee = createEmployee(100)
  const days = [
    createDay('2026-09-07', createShift('shift-1', '08:00', '22:00')),
    createDay('2026-09-08', createShift('shift-2', '08:00', '22:00')),
    createDay('2026-09-09', createShift('shift-3', '08:00', '20:00')),
    createDay('2026-09-10')
  ]
  const warnings = getEmploymentRuleWarnings({
    employee,
    profile,
    days,
    day: days[3],
    shift: createShift('candidate', '08:00', '09:00')
  })

  assert.equal(warnings.length, 1)
  assert.ok(warnings[0].includes(
    'Przekroczony cel tygodniowy z tolerancją: 41 h przy limicie 40 h.'
  ))
})

test('cel miesięczny i cel okresu nie wyznaczają minimum tygodniowego', () => {
  const monthlyProfile = createProfile({
    targetHours: { applies: true, amount: 160, unit: 'month' },
    maximumWeeklyHours: { applies: true, hours: 50 }
  })
  const settlementProfile = createProfile({
    targetHours: {
      applies: true,
      amount: 320,
      unit: 'settlementPeriod'
    },
    settlementPeriod: { applies: true, amount: 2, unit: 'month' },
    maximumWeeklyHours: { applies: true, hours: 50 }
  })

  assert.equal(getRequiredWeeklyMaximumHours(monthlyProfile), null)
  assert.equal(getWeeklyMaximumValidationMessage(monthlyProfile), '')
  assert.equal(getRequiredWeeklyMaximumHours(settlementProfile), null)
  assert.equal(getWeeklyMaximumValidationMessage(settlementProfile), '')
})

test('cel miesięczny zachowuje jednostkę i skaluje wartości planistyczne', () => {
  const scaled = getScaledEmploymentProfile(
    createEmployee(130),
    createProfile({
      targetHours: { applies: true, amount: 160, unit: 'month' },
      maximumWeeklyHours: { applies: true, hours: 50 }
    })
  )

  assert.equal(scaled.targetHours.unit, 'month')
  assert.equal(scaled.targetHours.amount, 208)
  assert.equal(scaled.targetTolerance.minusHours, 13)
  assert.equal(scaled.targetTolerance.plusHours, 13)
  assert.equal(scaled.maximumWeeklyHours.hours, 65)
})

test('wymiar 130% skaluje tylko cel, tolerancję i maksimum tygodniowe', () => {
  const profile = createProfile()
  const scaled = getScaledEmploymentProfile(
    createEmployee(130),
    profile
  )

  assert.equal(scaled.targetHours.amount, 52)
  assert.equal(scaled.targetTolerance.minusHours, 13)
  assert.equal(scaled.targetTolerance.plusHours, 13)
  assert.equal(scaled.maximumWeeklyHours.hours, 65)
  assert.deepEqual(
    scaled.maximumDailyHours,
    profile.maximumDailyHours
  )
  assert.deepEqual(scaled.minimumRest, profile.minimumRest)
  assert.deepEqual(scaled.minimumWeeklyRest, profile.minimumWeeklyRest)
  assert.deepEqual(
    scaled.maximumConsecutiveDays,
    profile.maximumConsecutiveDays
  )
  assert.deepEqual(scaled.weekendRotation, profile.weekendRotation)
  assert.deepEqual(scaled.breaks, profile.breaks)
})

test('65 h jest granicą, a 66 h przekracza cel i maksimum 65 h', () => {
  assert.deepEqual(getWeekWarnings(), [])

  const warnings = getWeekWarnings({
    candidateFrom: '08:00',
    candidateTo: '22:00'
  })

  assert.equal(warnings.length, 2)
  assert.ok(warnings.some(warning => warning.includes(
    'Przekroczony cel tygodniowy z tolerancją: 66 h przy limicie 65 h.'
  )))
  assert.ok(warnings.some(warning => warning.includes(
    'Przekroczony limit tygodniowy profilu: 66 h zamiast maksymalnie 65 h.'
  )))
})

test('wyższe maksimum pozostaje niezależne od zakresu celu', () => {
  const profile = createProfile({
    targetHours: { applies: true, amount: 52, unit: 'week' },
    targetTolerance: {
      applies: true,
      minusHours: 13,
      plusHours: 13
    },
    maximumWeeklyHours: { applies: true, hours: 72 }
  })
  const employee = createEmployee(100)
  const warningsAt66 = getWeekWarnings({
    employee,
    profile,
    candidateFrom: '08:00',
    candidateTo: '22:00'
  })
  const warningsAt73 = getWeekWarnings({
    employee,
    profile,
    candidateFrom: '08:00',
    candidateTo: '05:00'
  })

  assert.equal(warningsAt66.length, 1)
  assert.ok(warningsAt66[0].includes(
    'Przekroczony cel tygodniowy z tolerancją'
  ))
  assert.equal(warningsAt73.length, 2)
  assert.ok(warningsAt73.some(warning => warning.includes(
    'zamiast maksymalnie 72 h'
  )))
})

test('cel miesięczny nie jest oceniany na podstawie jednego tygodnia', () => {
  const warnings = getWeekWarnings({
    employee: createEmployee(100),
    profile: createProfile({
      targetHours: { applies: true, amount: 160, unit: 'month' },
      maximumWeeklyHours: { applies: true, hours: 50 }
    })
  })

  assert.equal(warnings.length, 1)
  assert.ok(warnings[0].includes(
    'Przekroczony limit tygodniowy profilu'
  ))
  assert.ok(!warnings.some(warning => warning.includes(
    'Przekroczony cel tygodniowy'
  )))
})

test('pracownik bez profilu nie otrzymuje reguł profilowych', () => {
  const warnings = getEmploymentRuleWarnings({
    employee: {
      id: 'employee-1',
      employmentProfileId: null,
      employmentPercentage: 130
    },
    profile: null,
    days: [],
    day: createDay('2026-09-07'),
    shift: createShift('candidate', '09:00', '22:00')
  })

  assert.deepEqual(warnings, [])
})
