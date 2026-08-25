const roundHours = value => Math.round(Number(value || 0) * 100) / 100

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
  const scaledProfile = getScaledEmploymentProfile(employee, profile)
  if (!scaledProfile || !day || !shift) return []
  const warnings = []
  const employeeShifts = (days || []).flatMap(scheduleDay => (
    (scheduleDay.workingShifts || [])
      .filter(item => item.employeeId === employee.id && item.id !== shift.id)
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

  if (scaledProfile.targetHours?.applies && scaledProfile.targetHours.unit === 'week' && scaledProfile.targetTolerance?.applies) {
    const upperTarget = Number(scaledProfile.targetHours.amount) + Number(scaledProfile.targetTolerance.plusHours)
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
