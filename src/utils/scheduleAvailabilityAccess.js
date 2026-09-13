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
