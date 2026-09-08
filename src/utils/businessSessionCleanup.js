import { useEmployeeGroupsStore } from '../stores/employeeGroupsStore.js'
import { useEmployeesStore } from '../stores/employeesStore.js'
import { usePermissionProfilesStore } from '../stores/permissionProfilesStore.js'
import { usePublishedScheduleCalendarStore } from '../stores/publishedScheduleCalendarStore.js'
import { useScheduleAvailabilityPeriodsStore } from '../stores/scheduleAvailabilityPeriodsStore.js'
import { useScheduleDemandModelsStore } from '../stores/scheduleDemandModelsStore.js'
import { useScheduleDraftsStore } from '../stores/scheduleDraftsStore.js'
import { useScheduleEmploymentProfilesStore } from '../stores/scheduleEmploymentProfilesStore.js'
import { useScheduleGeneratorSettingsStore } from '../stores/scheduleGeneratorSettingsStore.js'
import { useSchedulePositionsStore } from '../stores/schedulePositionsStore.js'

export const clearPiniaBusinessSessionData = () => {
  useEmployeesStore().clearSensitiveData()
  useSchedulePositionsStore().clearSensitiveData()
  useEmployeeGroupsStore().clearSensitiveData()
  usePermissionProfilesStore().clearSensitiveData()
  useScheduleDemandModelsStore().clearSensitiveData()
  useScheduleEmploymentProfilesStore().clearSensitiveData()
  useScheduleGeneratorSettingsStore().clearSensitiveData()
  useScheduleDraftsStore().clearSensitiveData()
  useScheduleAvailabilityPeriodsStore().clearSensitiveData()
  usePublishedScheduleCalendarStore().reset()
}
