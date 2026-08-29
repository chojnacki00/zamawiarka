import { isValidDateKey } from './scheduleCreationValidation.js'

export const FIRESTORE_ATOMIC_WRITE_LIMIT = 500
export const MAX_ATOMIC_SCHEDULE_DAYS = FIRESTORE_ATOMIC_WRITE_LIMIT - 1

export const getMaximumAtomicSnapshotScheduleDays = ({
  employeesCount = 0,
  positionsCount = 0,
  employmentProfilesCount = 0
} = {}) => Math.max(0, Math.floor((
  FIRESTORE_ATOMIC_WRITE_LIMIT -
  2 -
  Math.max(0, Number(employeesCount) || 0) -
  Math.max(0, Number(positionsCount) || 0) -
  Math.max(0, Number(employmentProfilesCount) || 0)
) / 2))

export const getScheduleDayDocumentId = dateKey => {
  const normalizedDateKey = String(dateKey || '').trim()

  if (!isValidDateKey(normalizedDateKey)) {
    throw new Error('Nieprawidłowy identyfikator dnia grafiku.')
  }

  return normalizedDateKey
}

export const getInitialScheduleStatus = () => ({
  lifecycleStatus: 'ready',
  publicationStatus: 'unpublished',
  publishedUntil: null,
  publishedDaysCount: 0
})

export const canDeleteUnpublishedSchedule = schedule => (
  schedule?.lifecycleStatus === 'ready' &&
  schedule?.publicationStatus === 'unpublished'
)

export const shouldShowEmployeeDayQuickAdd = ({
  employeeShifts = [],
  hasAssignableVacancy = false
} = {}) => {
  const shifts = Array.isArray(employeeShifts) ? employeeShifts : []

  return hasAssignableVacancy || shifts.length === 0
}

export const getOccupiedScheduleDates = ({
  dateKeys = [],
  occupiedDateKeys = []
} = {}) => {
  const occupiedDates = new Set(
    (Array.isArray(occupiedDateKeys) ? occupiedDateKeys : [])
      .map(dateKey => getScheduleDayDocumentId(dateKey))
  )

  return (Array.isArray(dateKeys) ? dateKeys : [])
    .map(dateKey => getScheduleDayDocumentId(dateKey))
    .filter(dateKey => occupiedDates.has(dateKey))
}

export const assertScheduleDayBelongsToSchedule = (
  scheduleDay,
  scheduleId
) => {
  const normalizedScheduleId = String(scheduleId || '').trim()

  if (
    !normalizedScheduleId ||
    scheduleDay?.scheduleId !== normalizedScheduleId
  ) {
    throw new Error('Wybrany dzień nie należy do tego grafiku.')
  }

  return true
}

export const assertAtomicScheduleSize = daysCount => {
  const normalizedDaysCount = Number(daysCount)

  if (
    !Number.isInteger(normalizedDaysCount) ||
    normalizedDaysCount < 1
  ) {
    throw new Error('Grafik musi zawierać co najmniej jeden dzień.')
  }

  if (normalizedDaysCount > MAX_ATOMIC_SCHEDULE_DAYS) {
    throw new Error(
      'Wybrany zakres jest zbyt długi, aby utworzyć grafik atomowo. ' +
      `Maksymalny bezpieczny zakres to ${MAX_ATOMIC_SCHEDULE_DAYS} dni.`
    )
  }

  return normalizedDaysCount + 1
}

export const getAtomicScheduleCreationPlan = ({
  dateKeys = [],
  occupiedDateKeys = []
} = {}) => {
  const normalizedDateKeys = (
    Array.isArray(dateKeys) ? dateKeys : []
  ).map(dateKey => getScheduleDayDocumentId(dateKey))
  const conflictingDateKeys = getOccupiedScheduleDates({
    dateKeys: normalizedDateKeys,
    occupiedDateKeys
  })

  if (conflictingDateKeys.length > 0) {
    return {
      canCreate: false,
      conflictingDateKeys,
      createsHeader: false,
      dayDocumentIds: [],
      writesCount: 0
    }
  }

  return {
    canCreate: true,
    conflictingDateKeys: [],
    createsHeader: true,
    dayDocumentIds: normalizedDateKeys,
    writesCount: assertAtomicScheduleSize(normalizedDateKeys.length)
  }
}

export const getAtomicScheduleSnapshotCreationPlan = ({
  dateKeys = [],
  occupiedDateKeys = [],
  planningContextDocumentsCount = 0
} = {}) => {
  const basePlan = getAtomicScheduleCreationPlan({
    dateKeys,
    occupiedDateKeys
  })

  if (!basePlan.canCreate) return basePlan

  const contextDocumentsCount = Math.max(
    0,
    Math.trunc(Number(planningContextDocumentsCount) || 0)
  )
  const writesCount = basePlan.writesCount + contextDocumentsCount

  if (writesCount > FIRESTORE_ATOMIC_WRITE_LIMIT) {
    const fixedContextDocumentsCount = Math.max(
      0,
      contextDocumentsCount - basePlan.dayDocumentIds.length
    )
    const maximumDays = Math.max(0, Math.floor((
      FIRESTORE_ATOMIC_WRITE_LIMIT -
      1 -
      fixedContextDocumentsCount
    ) / 2))

    throw new Error(
      'Wybrany zakres i snapshot danych są zbyt duże, aby utworzyć ' +
      'grafik atomowo. ' +
      `Maksymalny zakres dla obecnego zespołu to ${maximumDays} dni.`
    )
  }

  return {
    ...basePlan,
    planningContextDocumentsCount: contextDocumentsCount,
    writesCount
  }
}
