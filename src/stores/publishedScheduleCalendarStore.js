import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import { useAuthorizationStore } from './authorizationStore.js'
import {
  buildPublishedCalendarIndex,
  getEmployeePublishedShifts,
  getPublishedCalendarAccess,
  getPublishedMonthBounds,
  mergePublishedCalendarMonth,
  resolvePublishedCalendarEmployeeId
} from '../utils/publishedScheduleCalendar.js'

export const PUBLISHED_CALENDAR_ERROR_CODES = Object.freeze({
  ACCESS_DENIED: 'published-calendar/access-denied',
  INCONSISTENT_DATA: 'published-calendar/inconsistent-data'
})

const createCalendarError = (code, message, cause = null) => {
  const error = new Error(message)
  error.code = code
  error.cause = cause
  return error
}

const emptyCalendarIndex = () => ({
  headersById: {},
  scheduleIdByDate: {},
  publishedDateKeys: [],
  publishedMonthKeys: []
})

export const usePublishedScheduleCalendarStore = defineStore(
  'publishedScheduleCalendar',
  () => {
    const headers = ref([])
    const calendarIndex = ref(emptyCalendarIndex())
    const daysByMonth = ref({})
    const loadedMonthKeys = ref([])
    const isLoadingHeaders = ref(false)
    const loadingMonthKeys = ref([])
    const error = ref(null)
    let activeRestaurantId = null

    const getReadContext = async () => {
      const employeeAuthStore = useEmployeeAuthStore()
      const authorizationStore = useAuthorizationStore()
      const access = getPublishedCalendarAccess({
        hasEmployeeSession: authorizationStore.isEmployee,
        employeeId: authorizationStore.employeeId,
        employeePermissions: {
          can_view_schedule:
            authorizationStore.hasPermission('can_view_schedule'),
          can_manage_schedule:
            authorizationStore.hasPermission('can_manage_schedule')
        },
        hasOwnerAccess: authorizationStore.isOwner
      })

      if (!access.canAccess) {
        throw createCalendarError(
          PUBLISHED_CALENDAR_ERROR_CODES.ACCESS_DENIED,
          'Nie masz uprawnienia do podglądu grafiku.'
        )
      }

      const restaurantId = employeeAuthStore.requireRestaurantId()

      if (!restaurantId) {
        throw createCalendarError(
          PUBLISHED_CALENDAR_ERROR_CODES.ACCESS_DENIED,
          'Nie udało się rozpoznać restauracji.'
        )
      }

      if (activeRestaurantId && activeRestaurantId !== restaurantId) {
        reset()
      }

      activeRestaurantId = restaurantId
      return { restaurantId, access }
    }

    const fetchHeaders = async ({ force = false } = {}) => {
      const { restaurantId } = await getReadContext()

      if (!force && headers.value.length > 0) {
        return calendarIndex.value
      }

      isLoadingHeaders.value = true
      error.value = null

      try {
        const snapshot = await getDocs(collection(
          db,
          'users',
          restaurantId,
          'grafiki_opublikowane'
        ))
        const nextHeaders = snapshot.docs.map(documentSnapshot => ({
          ...documentSnapshot.data(),
          documentId: documentSnapshot.id
        }))
        let nextIndex

        try {
          nextIndex = buildPublishedCalendarIndex(nextHeaders)
        } catch (validationError) {
          throw createCalendarError(
            PUBLISHED_CALENDAR_ERROR_CODES.INCONSISTENT_DATA,
            'Publiczne nagłówki grafików są niespójne.',
            validationError
          )
        }

        headers.value = nextHeaders
        calendarIndex.value = nextIndex
        daysByMonth.value = {}
        loadedMonthKeys.value = []
        return nextIndex
      } catch (readError) {
        error.value = readError
        throw readError
      } finally {
        isLoadingHeaders.value = false
      }
    }

    const fetchMonth = async (monthKey, { force = false } = {}) => {
      const { restaurantId } = await getReadContext()

      if (
        !force &&
        loadedMonthKeys.value.includes(monthKey)
      ) {
        return daysByMonth.value[monthKey] || {}
      }

      const { dateFrom, dateTo } = getPublishedMonthBounds(monthKey)
      const expectedDateKeys = calendarIndex.value.publishedDateKeys
        .filter(dateKey => dateKey >= dateFrom && dateKey <= dateTo)

      if (expectedDateKeys.length === 0) {
        daysByMonth.value = {
          ...daysByMonth.value,
          [monthKey]: {}
        }
        loadedMonthKeys.value = [
          ...new Set([...loadedMonthKeys.value, monthKey])
        ]
        return {}
      }

      loadingMonthKeys.value = [
        ...new Set([...loadingMonthKeys.value, monthKey])
      ]
      error.value = null

      try {
        const monthQuery = query(
          collection(
            db,
            'users',
            restaurantId,
            'grafik_opublikowane_dni'
          ),
          where('date', '>=', dateFrom),
          where('date', '<=', dateTo)
        )
        const snapshot = await getDocs(monthQuery)
        let mergedMonth

        try {
          mergedMonth = mergePublishedCalendarMonth({
            monthKey,
            calendarIndex: calendarIndex.value,
            publicDays: snapshot.docs.map(documentSnapshot => ({
              ...documentSnapshot.data(),
              documentId: documentSnapshot.id
            }))
          })
        } catch (validationError) {
          throw createCalendarError(
            PUBLISHED_CALENDAR_ERROR_CODES.INCONSISTENT_DATA,
            'Publiczne dni grafiku są niekompletne lub niespójne.',
            validationError
          )
        }

        daysByMonth.value = {
          ...daysByMonth.value,
          [monthKey]: mergedMonth.daysByDate
        }
        loadedMonthKeys.value = [
          ...new Set([...loadedMonthKeys.value, monthKey])
        ]
        return mergedMonth.daysByDate
      } catch (readError) {
        error.value = readError
        throw readError
      } finally {
        loadingMonthKeys.value = loadingMonthKeys.value.filter(
          key => key !== monthKey
        )
      }
    }

    const getMonthDays = monthKey => (
      daysByMonth.value[monthKey] || {}
    )

    const getAuthorizedEmployeeShifts = ({
      dateKey,
      requestedEmployeeId
    } = {}) => {
      const authorizationStore = useAuthorizationStore()
      const access = getPublishedCalendarAccess({
        hasEmployeeSession: authorizationStore.isEmployee,
        employeeId: authorizationStore.employeeId,
        employeePermissions: {
          can_view_schedule:
            authorizationStore.hasPermission('can_view_schedule'),
          can_manage_schedule:
            authorizationStore.hasPermission('can_manage_schedule')
        },
        hasOwnerAccess: authorizationStore.isOwner
      })
      const employeeId = resolvePublishedCalendarEmployeeId({
        access,
        requestedEmployeeId
      })

      if (!employeeId) return []

      const monthKey = String(dateKey || '').slice(0, 7)
      return getEmployeePublishedShifts({
        day: getMonthDays(monthKey)[dateKey],
        employeeId
      })
    }

    const reset = () => {
      headers.value = []
      calendarIndex.value = emptyCalendarIndex()
      daysByMonth.value = {}
      loadedMonthKeys.value = []
      loadingMonthKeys.value = []
      error.value = null
      activeRestaurantId = null
    }

    return {
      headers,
      calendarIndex,
      daysByMonth,
      loadedMonthKeys,
      isLoadingHeaders,
      loadingMonthKeys,
      error,
      fetchHeaders,
      fetchMonth,
      getMonthDays,
      getAuthorizedEmployeeShifts,
      reset
    }
  }
)
