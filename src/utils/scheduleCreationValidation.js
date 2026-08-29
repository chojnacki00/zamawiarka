const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const isValidDateKey = dateKey => {
  const normalizedDateKey = String(dateKey || '')
  if (!DATE_KEY_PATTERN.test(normalizedDateKey)) return false

  const date = new Date(`${normalizedDateKey}T00:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === normalizedDateKey
  )
}

export const getTimestampMilliseconds = value => {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()

  const milliseconds = new Date(value).getTime()
  return Number.isNaN(milliseconds) ? 0 : milliseconds
}

export const formatLocalDateKey = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isValidDateRange = (dateFrom, dateTo) => (
  isValidDateKey(dateFrom) &&
  isValidDateKey(dateTo) &&
  dateFrom <= dateTo
)

export const getDateKeysInRange = (dateFrom, dateTo) => {
  if (!isValidDateRange(dateFrom, dateTo)) return []

  const [fromYear, fromMonth, fromDay] = dateFrom.split('-').map(Number)
  const [toYear, toMonth, toDay] = dateTo.split('-').map(Number)
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay))
  const rangeEnd = new Date(Date.UTC(toYear, toMonth - 1, toDay))
  const dateKeys = []

  while (cursor <= rangeEnd) {
    dateKeys.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dateKeys
}

export const getPreviousDateKey = dateKey => {
  if (!isValidDateKey(dateKey)) return null

  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export const formatPolishDateKey = dateKey => {
  if (!isValidDateKey(dateKey)) return 'brak daty'
  const [year, month, day] = dateKey.split('-')
  return `${day}.${month}.${year}`
}

export const dateRangesOverlap = (
  firstDateFrom,
  firstDateTo,
  secondDateFrom,
  secondDateTo
) => (
  isValidDateRange(firstDateFrom, firstDateTo) &&
  isValidDateRange(secondDateFrom, secondDateTo) &&
  firstDateFrom <= secondDateTo &&
  secondDateFrom <= firstDateTo
)

export const isPeriodEffectivelyOpen = (
  period,
  {
    nowMs = Date.now(),
    todayDateKey = formatLocalDateKey(new Date(nowMs))
  } = {}
) => (
  period?.status === 'open' &&
  getTimestampMilliseconds(period.closesAt) >= nowMs &&
  Boolean(period.dateTo && period.dateTo >= todayDateKey)
)

export const getOpenAvailabilityPeriodConflicts = ({
  periods,
  dateFrom,
  dateTo,
  nowMs = Date.now(),
  todayDateKey = formatLocalDateKey(new Date(nowMs))
}) => (
  (Array.isArray(periods) ? periods : [])
    .filter(period => (
      isPeriodEffectivelyOpen(period, { nowMs, todayDateKey }) &&
      dateRangesOverlap(
        dateFrom,
        dateTo,
        period.dateFrom,
        period.dateTo
      )
    ))
    .sort((first, second) => (
      String(first.dateFrom || '').localeCompare(second.dateFrom || '')
    ))
)

export const isScheduleDeleted = schedule => (
  schedule?.isDeleted === true ||
  Boolean(schedule?.deletedAt)
)

export const getScheduleRangeConflicts = ({
  schedules,
  dateFrom,
  dateTo,
  excludedScheduleId = null
}) => (
  (Array.isArray(schedules) ? schedules : [])
    .filter(schedule => (
      schedule?.id !== excludedScheduleId &&
      !isScheduleDeleted(schedule) &&
      dateRangesOverlap(
        dateFrom,
        dateTo,
        schedule?.dateFrom,
        schedule?.dateTo
      )
    ))
    .sort((first, second) => (
      String(first.dateFrom || '').localeCompare(second.dateFrom || '')
    ))
)

export const getMissingDemandModelDates = ({
  dateFrom,
  dateTo,
  availabilityDays = [],
  demandModels = []
}) => {
  const availabilityDaysByDate = new Map(
    (Array.isArray(availabilityDays) ? availabilityDays : [])
      .map(day => [day?.date || day?.id, day])
      .filter(([dateKey]) => isValidDateKey(dateKey))
  )
  const demandModelIds = new Set(
    (Array.isArray(demandModels) ? demandModels : [])
      .map(model => model?.id)
      .filter(Boolean)
  )

  return getDateKeysInRange(dateFrom, dateTo).filter(dateKey => {
    const modelId = availabilityDaysByDate.get(dateKey)?.demandModelId
    return !modelId || !demandModelIds.has(modelId)
  })
}

export const getOpenAvailabilityBlockDetails = conflicts => {
  const firstConflict = Array.isArray(conflicts) ? conflicts[0] : null
  if (!firstConflict) return ''

  const range = (
    `${formatPolishDateKey(firstConflict.dateFrom)}–` +
    `${formatPolishDateKey(firstConflict.dateTo)}`
  )
  const remainingCount = conflicts.length - 1
  const remainingText = remainingCount > 0
    ? ` Pozostałe otwarte okresy: ${remainingCount}.`
    : ''

  return (
    `Okres „${firstConflict.name || 'Bez nazwy'}” (${range}).` +
    remainingText
  )
}

export const getScheduleConflictMessage = conflicts => {
  const firstConflict = Array.isArray(conflicts) ? conflicts[0] : null
  if (!firstConflict) return ''

  const range = (
    `${formatPolishDateKey(firstConflict.dateFrom)}–` +
    `${formatPolishDateKey(firstConflict.dateTo)}`
  )
  const remainingCount = conflicts.length - 1
  const remainingText = remainingCount > 0
    ? ` Pozostałe konflikty: ${remainingCount}.`
    : ''

  return (
    'Nie można utworzyć grafiku. Wybrany zakres zawiera dni należące już ' +
    `do grafiku „${firstConflict.name || 'Grafik bez nazwy'}” (${range}).` +
    remainingText
  )
}

export const buildScheduleRangeProblems = ({
  dateRangeError = '',
  missingDates = [],
  openAvailabilityConflicts = [],
  scheduleConflicts = []
} = {}) => {
  const sections = []

  if (dateRangeError) {
    sections.push({
      key: 'date-range',
      title: 'Nieprawidłowy zakres dat:',
      items: [String(dateRangeError)]
    })
  }

  if (openAvailabilityConflicts.length > 0) {
    sections.push({
      key: 'open-availability',
      title: 'Wprowadzanie dyspozycji jest nadal otwarte:',
      items: openAvailabilityConflicts.map(period => (
        `${period.name || 'Okres bez nazwy'} — ` +
        `${formatPolishDateKey(period.dateFrom)}–` +
        `${formatPolishDateKey(period.dateTo)}`
      ))
    })
  }

  if (scheduleConflicts.length > 0) {
    sections.push({
      key: 'schedule-conflicts',
      title: 'Część dat należy już do istniejącego grafiku:',
      items: scheduleConflicts.map(schedule => (
        `${schedule.name || 'Grafik bez nazwy'} — ` +
        `${formatPolishDateKey(schedule.dateFrom)}–` +
        `${formatPolishDateKey(schedule.dateTo)}`
      ))
    })
  }

  const normalizedMissingDates = [...new Set(
    (Array.isArray(missingDates) ? missingDates : [])
      .filter(isValidDateKey)
  )].sort()

  if (normalizedMissingDates.length > 0) {
    sections.push({
      key: 'missing-models',
      title: 'Brak modelu zapotrzebowania dla dni:',
      items: normalizedMissingDates.map(formatPolishDateKey)
    })
  }

  return {
    hasProblems: sections.length > 0,
    sections
  }
}

export const isScheduleDayActivelyPublished = day => (
  Boolean(day) &&
  day.isDeleted !== true &&
  !day.deletedAt &&
  day.publicationStatus !== 'withdrawn' &&
  (Number(day.publishedRevision) || 0) > 0
)

export const getScheduleContinuity = ({
  dateFrom,
  schedules,
  scheduleDays
}) => {
  const previousDate = getPreviousDateKey(dateFrom)
  const previousScheduleIds = new Set(
    (Array.isArray(schedules) ? schedules : [])
      .filter(schedule => (
        !isScheduleDeleted(schedule) &&
        schedule?.dateFrom <= previousDate &&
        schedule?.dateTo >= previousDate
      ))
      .map(schedule => schedule.id)
      .filter(Boolean)
  )
  const previousDayWasPublished = (
    previousScheduleIds.size > 0 &&
    (Array.isArray(scheduleDays) ? scheduleDays : []).some(day => (
      day?.date === previousDate &&
      previousScheduleIds.has(day?.scheduleId) &&
      isScheduleDayActivelyPublished(day)
    ))
  )

  return {
    previousDate,
    previousDayWasPublished,
    requiresWarning: !previousDayWasPublished
  }
}
