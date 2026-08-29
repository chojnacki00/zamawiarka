export const AVAILABILITY_COLLECTION =
  'grafik_dyspozycyjnosc'

export const AVAILABILITY_PERIOD_COLLECTION =
  'grafik_okresy_dyspozycji'

export const AVAILABILITY_VERSION_COLLECTION =
  'grafik_dyspozycyjnosc_wersje'

const hasValue = value => (
  typeof value === 'string' && value.trim().length > 0
)

export const getAvailabilityDocumentId = (
  employeeId,
  dateKey
) => {
  if (!hasValue(employeeId) || !hasValue(dateKey)) {
    return ''
  }

  return `${employeeId}_${dateKey}`
}

export const buildManagerAvailabilityWrite = ({
  employeeId,
  dateKey,
  periodId = null,
  type,
  timeFrom = null,
  timeTo = null,
  note = '',
  editorId = null,
  editorName = '',
  enteredAt,
  employeeEntry = null
}) => {
  const documentId = getAvailabilityDocumentId(
    employeeId,
    dateKey
  )

  if (!documentId || !hasValue(type)) {
    return null
  }

  const managerEntry = {
    periodId: periodId || null,
    type,
    timeFrom: type === 'partial' ? timeFrom : null,
    timeTo: type === 'partial' ? timeTo : null,
    note: String(note || '').trim(),
    enteredById: editorId || null,
    enteredByName: editorName || '',
    enteredAt
  }

  const data = {
    employeeId,
    date: dateKey,
    periodId: periodId || null,
    type: managerEntry.type,
    timeFrom: managerEntry.timeFrom,
    timeTo: managerEntry.timeTo,
    note: managerEntry.note,
    effectiveSource: 'manager',
    managerEntry,
    updatedAt: enteredAt
  }

  if (employeeEntry) {
    data.employeeEntry = employeeEntry
  }

  return { documentId, data }
}

export const isDateInAvailabilityPeriod = (
  period,
  dateKey
) => Boolean(
  period &&
  hasValue(dateKey) &&
  period.dateFrom <= dateKey &&
  period.dateTo >= dateKey
)

export const findAvailabilityPeriodForDate = ({
  periods,
  dateKey,
  isPeriodAllowed = () => true
}) => (
  (Array.isArray(periods) ? periods : []).find(period => (
    isDateInAvailabilityPeriod(period, dateKey) &&
    isPeriodAllowed(period)
  )) || null
)

export const canEditAvailabilityDate = ({
  periods,
  dateKey,
  isManager = false,
  isEffectivelyOpen = () => false
}) => {
  if (isManager) {
    return true
  }

  return Boolean(findAvailabilityPeriodForDate({
    periods,
    dateKey,
    isPeriodAllowed: period => (
      isEffectivelyOpen(period) &&
      !period?.blockedDates?.includes(dateKey)
    )
  }))
}

export const getAvailabilityEntry = ({
  entries,
  employeeId,
  dateKey
}) => (
  (Array.isArray(entries) ? entries : []).find(entry => (
    entry?.employeeId === employeeId &&
    entry?.date === dateKey
  )) || null
)

export const getAvailabilityEntriesForDate = (
  entries,
  dateKey
) => (
  (Array.isArray(entries) ? entries : []).filter(
    entry => entry?.date === dateKey
  )
)

export const removeAvailabilityEntry = ({
  entries,
  employeeId,
  dateKey
}) => (
  (Array.isArray(entries) ? entries : []).filter(entry => (
    entry?.employeeId !== employeeId ||
    entry?.date !== dateKey
  ))
)

export const applyAvailabilityPeriodDeletion = (
  state,
  periodId
) => ({
  ...state,
  periods: (Array.isArray(state?.periods) ? state.periods : [])
    .filter(period => period?.id !== periodId)
})

export const buildAvailabilityPeriodDeletePlan = periodId => (
  hasValue(periodId)
    ? [{
        collectionName: AVAILABILITY_PERIOD_COLLECTION,
        documentId: periodId
      }]
    : []
)
