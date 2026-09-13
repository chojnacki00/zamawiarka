export const SCHEDULE_AVAILABILITY_ACCESS_MODE = Object.freeze({
  OWN: 'own',
  MANAGER: 'manager'
})

export const getScheduleAvailabilityAccessPlan = ({
  canManageSchedule = false
} = {}) => {
  const managerAccess = canManageSchedule === true

  return {
    mode: managerAccess
      ? SCHEDULE_AVAILABILITY_ACCESS_MODE.MANAGER
      : SCHEDULE_AVAILABILITY_ACCESS_MODE.OWN,
    loadEmployees: managerAccess,
    loadPositions: managerAccess,
    loadDemandModels: managerAccess,
    loadTeamAvailability: managerAccess
  }
}

export const normalizeAvailabilitySelectionForAccess = ({
  canManageSchedule = false,
  selectedViewMode = 'mine',
  loggedEmployeeId = null
} = {}) => {
  if (canManageSchedule === true) {
    return {
      selectedViewMode,
      selectedEmployeeId: null
    }
  }

  return {
    selectedViewMode: 'mine',
    selectedEmployeeId: loggedEmployeeId || null
  }
}

export const isSchedulePermissionDeniedError = error => (
  ['permission-denied', 'firestore/permission-denied']
    .includes(String(error?.code || ''))
)

export const shouldIgnoreScheduleListenerCallback = ({
  listenerRevision,
  currentRevision,
  managerAccessRequired = false,
  managerAccessAtStart = false,
  hasManagerAccess = false,
  error = null
} = {}) => {
  if (listenerRevision !== currentRevision) {
    return true
  }

  return managerAccessRequired === true &&
    managerAccessAtStart === true &&
    hasManagerAccess !== true &&
    (
      error === null ||
      isSchedulePermissionDeniedError(error)
    )
}

export const shouldIgnoreScheduleListenerError = async ({
  listenerRevision,
  getCurrentRevision,
  managerAccessRequired = false,
  managerAccessAtStart = false,
  getHasManagerAccess,
  confirmManagerAccess,
  error = null
} = {}) => {
  const readCurrentRevision = () => (
    typeof getCurrentRevision === 'function'
      ? getCurrentRevision()
      : listenerRevision
  )
  const readManagerAccess = () => (
    typeof getHasManagerAccess === 'function' &&
    getHasManagerAccess() === true
  )

  if (shouldIgnoreScheduleListenerCallback({
    listenerRevision,
    currentRevision: readCurrentRevision(),
    managerAccessRequired,
    managerAccessAtStart,
    hasManagerAccess: readManagerAccess(),
    error
  })) {
    return true
  }

  if (
    !isSchedulePermissionDeniedError(error) ||
    managerAccessRequired !== true ||
    managerAccessAtStart !== true ||
    typeof confirmManagerAccess !== 'function'
  ) {
    return false
  }

  let confirmedManagerAccess = null

  try {
    confirmedManagerAccess = await confirmManagerAccess()
  } catch {
    return false
  }

  if (shouldIgnoreScheduleListenerCallback({
    listenerRevision,
    currentRevision: readCurrentRevision(),
    managerAccessRequired,
    managerAccessAtStart,
    hasManagerAccess: readManagerAccess(),
    error
  })) {
    return true
  }

  return confirmedManagerAccess === false
}
