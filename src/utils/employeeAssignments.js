export const getEmployeeFullName = employee => {
  if (!employee) return ''

  return (
    `${employee.imie || ''} ${employee.nazwisko || ''}`.trim() ||
    String(employee.name || '').trim()
  )
}

export const COMPENSATION_TYPES = {
  HOURLY: 'hourly',
  FIXED_MONTHLY: 'fixed_monthly'
}

export const normalizeMoneyValue = value => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null
  }

  const parsedValue = Number(
    typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value
  )
  return Number.isFinite(parsedValue)
    ? Math.round(parsedValue * 100) / 100
    : null
}

export const getCompensationType = employee => (
  employee?.compensation?.type ===
    COMPENSATION_TYPES.FIXED_MONTHLY
    ? COMPENSATION_TYPES.FIXED_MONTHLY
    : COMPENSATION_TYPES.HOURLY
)

export const getGeneralHourlyRate = employee => {
  const compensationRate = normalizeMoneyValue(
    employee?.compensation?.generalHourlyRate
  )

  if (compensationRate !== null) return compensationRate

  const legacyRates = [
    employee?.generalHourlyRate,
    employee?.stawka,
    employee?.hourlyRate,
    employee?.stawkaGodzinowa
  ]

  for (const legacyRate of legacyRates) {
    const normalizedRate = normalizeMoneyValue(legacyRate)
    if (normalizedRate !== null) return normalizedRate
  }

  return null
}

export const getMonthlySalary = employee => normalizeMoneyValue(
  employee?.compensation?.monthlySalary ??
  employee?.monthlySalary
)

export const normalizeCompensation = employee => ({
  type: getCompensationType(employee),
  generalHourlyRate: getGeneralHourlyRate(employee),
  monthlySalary: getMonthlySalary(employee)
})

export const resolveShiftEmployeeName = (shift, employee = null) => {
  const snapshotName = String(
    shift?.employeeNameSnapshot || ''
  ).trim()

  if (snapshotName) return snapshotName

  const currentEmployeeName = getEmployeeFullName(employee)
  return currentEmployeeName || 'Usunięty pracownik'
}

export const getPositionAssignment = (employee, positionId) => {
  if (!employee || !positionId || !Array.isArray(employee.positionAssignments)) return null

  return employee.positionAssignments.find(
    assignment => assignment?.positionId === positionId
  ) || null
}

export const getCompetencyStars = (employee, positionId) => {
  const stars = Number(getPositionAssignment(employee, positionId)?.competencyStars)
  return Number.isFinite(stars) ? Math.min(5, Math.max(0, stars)) : 0
}

export const getEffectiveHourlyRate = (employee, position) => {
  if (
    getCompensationType(employee) !==
    COMPENSATION_TYPES.HOURLY
  ) {
    return null
  }

  const assignment = getPositionAssignment(employee, position?.id)
  if (!assignment) return null

  const override = assignment.hourlyRateOverride
  if (override !== null && override !== undefined && override !== '') {
    const normalizedOverride = Number(override)
    if (Number.isFinite(normalizedOverride)) return normalizedOverride
  }

  const defaultRate = Number(position?.defaultHourlyRate)
  return Number.isFinite(defaultRate) ? defaultRate : null
}

export const normalizePositionAssignments = assignments => {
  if (!Array.isArray(assignments)) return []

  const uniqueAssignments = new Map()

  assignments.forEach(assignment => {
    const positionId = String(assignment?.positionId || '').trim()
    if (!positionId) return

    const stars = Number(assignment?.competencyStars)
    const rawOverride = assignment?.hourlyRateOverride
    const parsedOverride = rawOverride === null || rawOverride === undefined || rawOverride === ''
      ? null
      : Number(rawOverride)

    uniqueAssignments.set(positionId, {
      positionId,
      competencyStars: Number.isFinite(stars)
        ? Math.min(5, Math.max(1, Math.round(stars)))
        : 1,
      hourlyRateOverride: Number.isFinite(parsedOverride)
        ? Math.max(0, Math.round(parsedOverride * 100) / 100)
        : null
    })
  })

  return [...uniqueAssignments.values()]
}
