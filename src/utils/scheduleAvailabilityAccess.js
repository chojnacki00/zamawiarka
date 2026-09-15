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

export const createScheduleListenerSlot = (kind = 'schedule-listener') => {
  let revision = 0
  let currentSubscription = null
  let startCount = 0
  let unsubscribeCount = 0

  const isCurrent = subscription => (
    Boolean(subscription) &&
    subscription === currentSubscription &&
    subscription.active === true
  )

  const stop = () => {
    revision += 1

    const subscription = currentSubscription
    currentSubscription = null

    if (!subscription || subscription.active !== true) return false

    subscription.active = false

    if (typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe()
      unsubscribeCount += 1
      subscription.unsubscribe = null
    }

    return true
  }

  const begin = () => {
    stop()
    startCount += 1

    currentSubscription = {
      active: true,
      hasDeliveredSnapshot: false,
      kind,
      revision,
      unsubscribe: null
    }

    return currentSubscription
  }

  const attach = (subscription, unsubscribe) => {
    if (typeof unsubscribe !== 'function') return

    if (!isCurrent(subscription)) {
      unsubscribe()
      unsubscribeCount += 1
      return
    }

    subscription.unsubscribe = unsubscribe
  }

  const markSnapshotDelivered = subscription => {
    if (!isCurrent(subscription)) return false
    subscription.hasDeliveredSnapshot = true
    return true
  }

  const finish = subscription => {
    if (!isCurrent(subscription)) return false
    return stop()
  }

  const getStats = () => ({
    activeCount: currentSubscription?.active === true ? 1 : 0,
    currentRevision: revision,
    startCount,
    unsubscribeCount
  })

  return {
    attach,
    begin,
    finish,
    getRevision: () => revision,
    getStats,
    hasActive: () => currentSubscription?.active === true,
    isCurrent,
    markSnapshotDelivered,
    stop
  }
}

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

export const shouldIgnoreScheduleListenerError = ({
  listener,
  isCurrentListener,
  managerAccessRequired = false,
  managerAccessAtStart = false,
  error = null
} = {}) => {
  if (
    typeof isCurrentListener === 'function' &&
    !isCurrentListener(listener)
  ) return true

  return managerAccessRequired === true &&
    managerAccessAtStart === true &&
    listener?.hasDeliveredSnapshot === true &&
    isSchedulePermissionDeniedError(error)
}
