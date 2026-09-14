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

    if (!subscription || subscription.active !== true) {
      return false
    }

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
    stop
  }
}

export const createSchedulePermissionConfirmationCoordinator = () => {
  let contextKey = ''
  let granted = false
  let revision = 0
  const confirmedRevocations = new Set()
  const pendingConfirmations = new Map()

  const update = ({
    nextContextKey = '',
    hasManagerAccess = false
  } = {}) => {
    const normalizedContextKey = String(nextContextKey || '')
    const normalizedGranted = hasManagerAccess === true

    if (
      normalizedContextKey === contextKey &&
      normalizedGranted === granted
    ) {
      return revision
    }

    contextKey = normalizedContextKey
    granted = normalizedGranted
    revision += 1
    confirmedRevocations.clear()
    return revision
  }

  const reset = () => {
    contextKey = ''
    granted = false
    revision += 1
    confirmedRevocations.clear()
  }

  const capture = () => ({
    contextKey,
    granted,
    revision
  })

  const isCurrent = token => (
    Boolean(token) &&
    token.contextKey === contextKey &&
    token.revision === revision
  )

  const confirm = async (token, confirmManagerAccess) => {
    if (!token?.granted) {
      return null
    }

    if (!isCurrent(token) || granted !== true) {
      return false
    }

    const confirmationKey = `${token.contextKey}:${token.revision}`

    if (confirmedRevocations.has(confirmationKey)) {
      return false
    }

    if (pendingConfirmations.has(confirmationKey)) {
      return pendingConfirmations.get(confirmationKey)
    }

    const confirmationPromise = Promise.resolve()
      .then(() => confirmManagerAccess())
      .then(result => {
        if (result === false) {
          confirmedRevocations.add(confirmationKey)
        }
        return result
      })
      .finally(() => {
        if (
          pendingConfirmations.get(confirmationKey) ===
            confirmationPromise
        ) {
          pendingConfirmations.delete(confirmationKey)
        }
      })

    pendingConfirmations.set(
      confirmationKey,
      confirmationPromise
    )

    return confirmationPromise
  }

  return {
    capture,
    confirm,
    getRevision: () => revision,
    isCurrent,
    reset,
    update
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
  } catch (confirmationError) {
    return isSchedulePermissionDeniedError(confirmationError)
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
