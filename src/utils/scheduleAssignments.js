export const ASSIGNMENT_SOURCES = Object.freeze({
  MANUAL: 'MANUAL',
  AUTO: 'AUTO'
})

export const SHIFT_ORIGINS = Object.freeze({
  MANUAL_EXTRA: 'MANUAL_EXTRA'
})

const normalizeWarnings = warnings => [...new Set(
  (Array.isArray(warnings) ? warnings : [])
    .filter(Boolean)
    .map(String)
)]

const buildDecision = (decision, warnings) => {
  const normalizedDecision = decision && typeof decision === 'object'
    ? { ...decision }
    : {}

  if (warnings.length > 0) {
    normalizedDecision.godModeAccepted = true
  }

  return Object.keys(normalizedDecision).length
    ? normalizedDecision
    : null
}

export const isExtraShift = shift => (
  shift?.origin === SHIFT_ORIGINS.MANUAL_EXTRA
)

export const isManualAssignment = shift => (
  Boolean(shift?.employeeId) &&
  shift?.assignmentSource === ASSIGNMENT_SOURCES.MANUAL
)

export const isAutomaticAssignment = shift => (
  Boolean(shift?.employeeId) &&
  shift?.assignmentSource === ASSIGNMENT_SOURCES.AUTO
)

export const isEmptyRegularVacancy = shift => (
  Boolean(shift) &&
  !isExtraShift(shift) &&
  !shift.employeeId &&
  shift.assignmentSource === null
)

export const canGeneratorModifyShift = shift => (
  isEmptyRegularVacancy(shift)
)

export const createEmptyRegularVacancy = shift => ({
  ...(shift || {}),
  employeeId: null,
  employeeNameSnapshot: null,
  assignmentSource: null,
  decision: null,
  warnings: []
})

export const assignShiftManually = (
  shift,
  {
    employeeId,
    employeeNameSnapshot,
    decision = null,
    warnings = []
  } = {}
) => {
  const normalizedEmployeeId = String(employeeId || '').trim()
  const normalizedEmployeeName = String(
    employeeNameSnapshot || ''
  ).trim()

  if (!normalizedEmployeeId || !normalizedEmployeeName) {
    throw new Error('Brak danych pracownika do ręcznego przypisania.')
  }

  const normalizedWarnings = normalizeWarnings(warnings)

  return {
    ...(shift || {}),
    employeeId: normalizedEmployeeId,
    employeeNameSnapshot: normalizedEmployeeName,
    assignmentSource: ASSIGNMENT_SOURCES.MANUAL,
    decision: buildDecision(decision, normalizedWarnings),
    warnings: normalizedWarnings
  }
}

export const clearRegularVacancyAssignment = shift => {
  if (isExtraShift(shift)) {
    throw new Error(
      'Zmiana dodatkowa musi zostać usunięta jako cały wpis.'
    )
  }

  return createEmptyRegularVacancy(shift)
}

export const createManualExtraShift = shift => assignShiftManually(
  {
    ...(shift || {}),
    origin: SHIFT_ORIGINS.MANUAL_EXTRA
  },
  shift
)

export const replaceShiftWarnings = (shift, warnings = []) => ({
  ...(shift || {}),
  warnings: normalizeWarnings(warnings)
})

export const getWorkingShiftCounters = shifts => {
  const normalizedShifts = Array.isArray(shifts) ? shifts : []
  const regularShifts = normalizedShifts.filter(
    shift => !isExtraShift(shift)
  )

  return {
    assignedCount: regularShifts.filter(
      shift => Boolean(shift?.employeeId)
    ).length,
    unfilledCount: regularShifts.filter(
      shift => !shift?.employeeId
    ).length,
    extraShiftsCount: normalizedShifts.filter(isExtraShift).length
  }
}
