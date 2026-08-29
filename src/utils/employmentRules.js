export const roundHours = value => (
  Math.round(Number(value || 0) * 100) / 100
)

export const getRequiredWeeklyMaximumHours = profile => {
  if (
    !profile?.targetHours?.applies ||
    profile.targetHours.unit !== 'week'
  ) {
    return null
  }

  const targetHours = roundHours(profile.targetHours.amount)
  const plusHours = profile.targetTolerance?.applies
    ? roundHours(profile.targetTolerance.plusHours)
    : 0

  return roundHours(targetHours + plusHours)
}

export const getWeeklyMaximumValidationMessage = profile => {
  if (!profile?.maximumWeeklyHours?.applies) return ''

  const requiredMaximum = getRequiredWeeklyMaximumHours(profile)
  if (requiredMaximum === null) return ''

  const maximumWeeklyHours = Number(
    profile.maximumWeeklyHours.hours
  )
  if (
    Number.isFinite(maximumWeeklyHours) &&
    maximumWeeklyHours + 0.001 >= requiredMaximum
  ) {
    return ''
  }

  const targetHours = roundHours(profile.targetHours.amount)
  const plusHours = profile.targetTolerance?.applies
    ? roundHours(profile.targetTolerance.plusHours)
    : 0

  return `Maksymalna liczba godzin tygodniowo nie może być mniejsza niż górna granica celu: ${requiredMaximum} h (cel ${targetHours} h + odchylenie ${plusHours} h).`
}

export const getScaledEmploymentProfile = (employee, profile) => {
  if (!employee?.employmentProfileId || !profile) return null
  const factor = Math.min(200, Math.max(5, Number(employee.employmentPercentage) || 100)) / 100
  return {
    ...profile,
    employmentPercentage: factor * 100,
    targetHours: { ...profile.targetHours, amount: roundHours(Number(profile.targetHours?.amount || 0) * factor) },
    targetTolerance: {
      ...profile.targetTolerance,
      minusHours: roundHours(Number(profile.targetTolerance?.minusHours || 0) * factor),
      plusHours: roundHours(Number(profile.targetTolerance?.plusHours || 0) * factor)
    },
    maximumWeeklyHours: {
      ...profile.maximumWeeklyHours,
      hours: roundHours(
        Number(profile.maximumWeeklyHours?.hours || 0) * factor
      )
    }
  }
}

const getTimeMinutes = value => {
  if (!value) return null
  const [hours, minutes] = String(value).split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
}

export const getShiftHours = shift => {
  const start = getTimeMinutes(shift?.from)
  let end = getTimeMinutes(shift?.to)
  if (start === null || end === null || start === end) return 0
  if (end < start) end += 1440
  return (end - start) / 60
}

const getWeekKey = dateKey => {
  const date = new Date(`${dateKey}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

export const getEmploymentRuleWarnings = ({ employee, profile, days, day, shift }) => {
  const scaledProfile = employee?.effectiveEmploymentRules
    ? employee.effectiveEmploymentRules
    : getScaledEmploymentProfile(employee, profile)
  if (!scaledProfile || !day || !shift) return []
  const warnings = []
  const employeeShifts = (days || []).flatMap(scheduleDay => (
    (scheduleDay.workingShifts || [])
      .filter(item => {
        const isEvaluatedShift =
          item.id === shift.id &&
          (
            scheduleDay.id === day.id ||
            scheduleDay.date === day.date
          )

        return (
          item.employeeId === employee.id &&
          !isEvaluatedShift
        )
      })
      .map(item => ({ ...item, date: scheduleDay.date }))
  ))
  const candidateHours = getShiftHours(shift)
  const sameDayHours = employeeShifts.filter(item => item.date === day.date).reduce((sum, item) => sum + getShiftHours(item), candidateHours)

  if (scaledProfile.maximumDailyHours?.applies && sameDayHours > Number(scaledProfile.maximumDailyHours.hours)) {
    warnings.push(`Przekroczony limit dzienny profilu: ${roundHours(sameDayHours)} h zamiast maksymalnie ${scaledProfile.maximumDailyHours.hours} h.`)
  }

  const weekKey = getWeekKey(day.date)
  const weekHours = employeeShifts.filter(item => getWeekKey(item.date) === weekKey).reduce((sum, item) => sum + getShiftHours(item), candidateHours)
  if (scaledProfile.maximumWeeklyHours?.applies && weekHours > Number(scaledProfile.maximumWeeklyHours.hours)) {
    warnings.push(`Przekroczony limit tygodniowy profilu: ${roundHours(weekHours)} h zamiast maksymalnie ${scaledProfile.maximumWeeklyHours.hours} h.`)
  }

  if (
    scaledProfile.targetHours?.applies &&
    scaledProfile.targetHours.unit === 'week'
  ) {
    const plusHours = scaledProfile.targetTolerance?.applies
      ? Number(scaledProfile.targetTolerance.plusHours) || 0
      : 0
    const upperTarget = Number(
      scaledProfile.targetHours.amount
    ) + plusHours
    if (weekHours > upperTarget) warnings.push(`Przekroczony cel tygodniowy z tolerancją: ${roundHours(weekHours)} h przy limicie ${roundHours(upperTarget)} h.`)
  }

  if (scaledProfile.maximumConsecutiveDays?.applies) {
    const workedDates = new Set(employeeShifts.map(item => item.date))
    workedDates.add(day.date)
    const sortedDates = [...workedDates].sort()
    let longestRun = 0
    let currentRun = 0
    let previousDate = null
    sortedDates.forEach(dateKey => {
      const currentDate = new Date(`${dateKey}T12:00:00`)
      const difference = previousDate ? Math.round((currentDate - previousDate) / 86400000) : null
      currentRun = difference === 1 ? currentRun + 1 : 1
      longestRun = Math.max(longestRun, currentRun)
      previousDate = currentDate
    })
    if (longestRun > Number(scaledProfile.maximumConsecutiveDays.days)) {
      warnings.push(`Przekroczony limit kolejnych dni pracy: ${longestRun} dni zamiast maksymalnie ${scaledProfile.maximumConsecutiveDays.days}.`)
    }
  }
  return warnings
}
