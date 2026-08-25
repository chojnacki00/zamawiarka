import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged
} from 'firebase/auth'
import { db } from '../firebase.js'
import { useAuthStore } from './authStore.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'

const DAY_BATCH_SIZE = 400

export const useScheduleDraftsStore = defineStore(
  'scheduleDrafts',
  () => {
    const schedules = ref([])
    const currentSchedule = ref(null)
    const currentDays = ref([])
    const availabilityEntries = ref([])
    const isLoading = ref(false)
    const isCreating = ref(false)

    const getRestaurantId = () => {
      return new Promise(resolve => {
        const authStore = useAuthStore()
        const employeeAuthStore = useEmployeeAuthStore()

        if (employeeAuthStore.restaurantId) {
          resolve(employeeAuthStore.restaurantId)
          return
        }

        if (authStore.currentCompany?.uid) {
          resolve(authStore.currentCompany.uid)
          return
        }

        const auth = getAuth()

        if (auth.currentUser) {
          resolve(auth.currentUser.uid)
          return
        }

        let unsubscribe = () => {}

        unsubscribe = onAuthStateChanged(auth, user => {
          unsubscribe()
          resolve(user ? user.uid : null)
        })
      })
    }

    const buildWorkingShifts = day => {
      const groups = Array.isArray(day?.shiftGroups)
        ? day.shiftGroups
        : []

      return groups.flatMap(group => {
        const slotsCount = Math.max(
          0,
          Math.trunc(Number(group?.slotsCount) || 0)
        )

        return Array.from(
          { length: slotsCount },
          (_, slotIndex) => ({
            id: `${group.id}-slot-${slotIndex + 1}`,
            shiftGroupId: group.id,
            positionId: group.positionId,
            positionNameSnapshot:
              group.positionName || 'Nieznane stanowisko',
            from: group.from,
            to: group.to,
            employeeId: null,
            employeeNameSnapshot: null,
            assignmentSource: null,
            decision: null,
            warnings: []
          })
        )
      })
    }

    const createDraft = async ({
      name,
      dateFrom,
      dateTo,
      daySummaries
    }) => {
      if (isCreating.value) {
        return null
      }

      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!dateFrom || !dateTo || dateFrom > dateTo) {
        throw new Error('Zakres grafiku jest nieprawidłowy.')
      }

      const days = Array.isArray(daySummaries)
        ? daySummaries
        : []

      if (days.length === 0) {
        throw new Error('Brak przygotowanych dni grafiku.')
      }

      isCreating.value = true

      const employeeAuthStore = useEmployeeAuthStore()
      const auth = getAuth()
      const scheduleRef = doc(
        collection(db, 'users', restaurantId, 'grafiki')
      )
      const scheduleId = scheduleRef.id
      const vacanciesCount = days.reduce(
        (sum, day) => sum + (Number(day?.slotsCount) || 0),
        0
      )

      try {
        await setDoc(scheduleRef, {
          id: scheduleId,
          name: String(name || '').trim() || 'Grafik roboczy',
          dateFrom,
          dateTo,
          status: 'creating',
          current: false,
          daysCount: days.length,
          vacanciesCount,
          assignedCount: 0,
          unfilledCount: vacanciesCount,
          extraShiftsCount: 0,
          workingRevision: 1,
          publishedRevision: 0,
          hasUnpublishedChanges: false,
          publishedAt: null,
          createdByEmployeeId:
            employeeAuthStore.currentEmployee?.id || null,
          createdByAuthUid: auth.currentUser?.uid || null,
          planningContextVersion: 1,
          schemaVersion: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })

        for (
          let startIndex = 0;
          startIndex < days.length;
          startIndex += DAY_BATCH_SIZE
        ) {
          const batch = writeBatch(db)
          const chunk = days.slice(
            startIndex,
            startIndex + DAY_BATCH_SIZE
          )

          chunk.forEach(day => {
            const workingShifts = buildWorkingShifts(day)
            const dayId = `${scheduleId}_${day.date}`
            const positionIds = [
              ...new Set(
                workingShifts
                  .map(shift => shift.positionId)
                  .filter(Boolean)
              )
            ]

            batch.set(
              doc(
                db,
                'users',
                restaurantId,
                'grafik_dni',
                dayId
              ),
              {
                id: dayId,
                scheduleId,
                date: day.date,
                status: 'draft',
                current: false,
                demandModelId: day.modelId,
                demandModelNameSnapshot:
                  day.modelName || 'Model bez nazwy',
                employeeIds: [],
                positionIds,
                workingShifts,
                publishedShifts: [],
                workingRevision: 1,
                publishedRevision: 0,
                hasUnpublishedChanges: false,
                schemaVersion: 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              }
            )
          })

          await batch.commit()
        }

        await updateDoc(scheduleRef, {
          status: 'draft',
          updatedAt: serverTimestamp()
        })

        return scheduleId
      } catch (error) {
        try {
          await updateDoc(scheduleRef, {
            status: 'creation_error',
            creationError:
              error?.message || 'Nie udało się zapisać wszystkich dni.',
            updatedAt: serverTimestamp()
          })
        } catch (statusError) {
          console.error(
            'Nie udało się oznaczyć błędu tworzenia grafiku:',
            statusError
          )
        }

        throw error
      } finally {
        isCreating.value = false
      }
    }

    const fetchSchedules = async () => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        schedules.value = []
        return
      }

      isLoading.value = true

      try {
        const snapshot = await getDocs(
          collection(db, 'users', restaurantId, 'grafiki')
        )

        schedules.value = snapshot.docs
          .map(documentSnapshot => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
          }))
          .sort((first, second) => {
            const firstTime =
              first.updatedAt?.toMillis?.() || 0
            const secondTime =
              second.updatedAt?.toMillis?.() || 0

            return secondTime - firstTime
          })
      } finally {
        isLoading.value = false
      }
    }

    const deleteSchedule = async scheduleId => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        throw new Error('Brak danych grafiku do usunięcia.')
      }

      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      const scheduleSnapshot = await getDoc(scheduleRef)

      if (!scheduleSnapshot.exists()) {
        schedules.value = schedules.value.filter(
          schedule => schedule.id !== scheduleId
        )
        return true
      }

      if (
        !['draft', 'creation_error'].includes(
          scheduleSnapshot.data()?.status
        )
      ) {
        throw new Error(
          'Można usunąć tylko zapisany grafik roboczy.'
        )
      }

      const daysQuery = query(
        collection(db, 'users', restaurantId, 'grafik_dni'),
        where('scheduleId', '==', scheduleId)
      )
      const daysSnapshot = await getDocs(daysQuery)

      for (
        let startIndex = 0;
        startIndex < daysSnapshot.docs.length;
        startIndex += DAY_BATCH_SIZE
      ) {
        const batch = writeBatch(db)
        const chunk = daysSnapshot.docs.slice(
          startIndex,
          startIndex + DAY_BATCH_SIZE
        )

        chunk.forEach(daySnapshot => {
          batch.delete(daySnapshot.ref)
        })

        await batch.commit()
      }

      const scheduleBatch = writeBatch(db)
      scheduleBatch.delete(scheduleRef)
      await scheduleBatch.commit()

      schedules.value = schedules.value.filter(
        schedule => schedule.id !== scheduleId
      )

      if (currentSchedule.value?.id === scheduleId) {
        currentSchedule.value = null
        currentDays.value = []
      }

      return true
    }

    const fetchSchedule = async scheduleId => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        currentSchedule.value = null
        return null
      }

      const snapshot = await getDoc(
        doc(db, 'users', restaurantId, 'grafiki', scheduleId)
      )

      currentSchedule.value = snapshot.exists()
        ? { id: snapshot.id, ...snapshot.data() }
        : null

      return currentSchedule.value
    }

    const fetchScheduleDays = async scheduleId => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        currentDays.value = []
        return []
      }

      const daysQuery = query(
        collection(db, 'users', restaurantId, 'grafik_dni'),
        where('scheduleId', '==', scheduleId)
      )
      const snapshot = await getDocs(daysQuery)

      currentDays.value = snapshot.docs
        .map(documentSnapshot => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        }))
        .sort((first, second) => first.date.localeCompare(second.date))

      return currentDays.value
    }

    const fetchAvailability = async (dateFrom, dateTo) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !dateFrom || !dateTo) {
        availabilityEntries.value = []
        return []
      }

      const availabilityQuery = query(
        collection(
          db,
          'users',
          restaurantId,
          'grafik_dyspozycyjnosc'
        ),
        where('date', '>=', dateFrom),
        where('date', '<=', dateTo)
      )
      const snapshot = await getDocs(availabilityQuery)

      availabilityEntries.value = snapshot.docs.map(
        documentSnapshot => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        })
      )

      return availabilityEntries.value
    }

    const updateWorkingShift = async ({
      scheduleId,
      dayId,
      shiftId,
      employeeId,
      employeeNameSnapshot = null,
      decision = null,
      warnings = []
    }) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!scheduleId || !dayId || !shiftId) {
        throw new Error('Brak danych zmiany do zapisania.')
      }

      const normalizedWarnings = Array.isArray(warnings)
        ? warnings.filter(Boolean).map(String)
        : []
      const normalizedEmployeeName = String(
        employeeNameSnapshot || ''
      ).trim()

      if (employeeId && !normalizedEmployeeName) {
        throw new Error(
          'Nie udało się zapisać nazwy pracownika w historii grafiku.'
        )
      }
      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      const dayRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        dayId
      )

      const result = await runTransaction(db, async transaction => {
        const daySnapshot = await transaction.get(dayRef)
        const scheduleSnapshot = await transaction.get(scheduleRef)

        if (!daySnapshot.exists()) {
          throw new Error('Nie znaleziono dnia grafiku.')
        }

        if (!scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono nagłówka grafiku.')
        }

        const dayData = daySnapshot.data()
        const scheduleData = scheduleSnapshot.data()
        const workingShifts = Array.isArray(dayData.workingShifts)
          ? dayData.workingShifts
          : []
        const shiftIndex = workingShifts.findIndex(
          shift => shift.id === shiftId
        )

        if (shiftIndex === -1) {
          throw new Error('Nie znaleziono wybranego wakatu.')
        }

        const previousShift = workingShifts[shiftIndex]
        const previousEmployeeId = previousShift.employeeId || null
        const nextEmployeeId = employeeId || null
        const nextShifts = workingShifts.map((shift, index) => {
          if (index !== shiftIndex) {
            return shift
          }

          return {
            ...shift,
            employeeId: nextEmployeeId,
            employeeNameSnapshot: nextEmployeeId
              ? normalizedEmployeeName
              : null,
            assignmentSource: nextEmployeeId
              ? normalizedWarnings.length > 0
                ? 'OVERRIDE'
                : 'MANUAL'
              : null,
            decision: nextEmployeeId ? decision : null,
            warnings: nextEmployeeId ? normalizedWarnings : []
          }
        })
        const employeeIds = [
          ...new Set(
            nextShifts
              .map(shift => shift.employeeId)
              .filter(Boolean)
          )
        ]
        const assignedDelta =
          (nextEmployeeId ? 1 : 0) -
          (previousEmployeeId ? 1 : 0)
        const nextAssignedCount = Math.max(
          0,
          (Number(scheduleData.assignedCount) || 0) + assignedDelta
        )
        const vacanciesCount =
          Number(scheduleData.vacanciesCount) || 0
        const hasPublishedVersion =
          (Number(scheduleData.publishedRevision) || 0) > 0
        const nextDay = {
          ...dayData,
          id: daySnapshot.id,
          workingShifts: nextShifts,
          employeeIds,
          workingRevision:
            (Number(dayData.workingRevision) || 0) + 1,
          hasUnpublishedChanges: hasPublishedVersion
        }
        const nextSchedule = {
          ...scheduleData,
          id: scheduleSnapshot.id,
          assignedCount: nextAssignedCount,
          unfilledCount: Math.max(
            0,
            vacanciesCount - nextAssignedCount
          ),
          workingRevision:
            (Number(scheduleData.workingRevision) || 0) + 1,
          hasUnpublishedChanges: hasPublishedVersion
        }

        transaction.update(dayRef, {
          workingShifts: nextShifts,
          employeeIds,
          workingRevision: nextDay.workingRevision,
          hasUnpublishedChanges: hasPublishedVersion,
          updatedAt: serverTimestamp()
        })

        transaction.update(scheduleRef, {
          assignedCount: nextAssignedCount,
          unfilledCount: nextSchedule.unfilledCount,
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges: hasPublishedVersion,
          updatedAt: serverTimestamp()
        })

        return {
          day: nextDay,
          schedule: nextSchedule
        }
      })

      const dayIndex = currentDays.value.findIndex(
        day => day.id === result.day.id
      )

      if (dayIndex !== -1) {
        currentDays.value[dayIndex] = result.day
      }

      if (currentSchedule.value?.id === result.schedule.id) {
        currentSchedule.value = result.schedule
      }

      return result
    }

    const createFragmentId = () => {
      if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
      }

      return (
        `${Date.now()}_` +
        `${Math.random().toString(36).slice(2, 11)}`
      )
    }

    const addExtraShift = async ({
      scheduleId,
      dayId,
      employeeId,
      employeeNameSnapshot,
      positionId = null,
      positionNameSnapshot = 'Bez stanowiska',
      from,
      to,
      decision = null,
      warnings = []
    }) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!scheduleId || !dayId || !employeeId || !from || !to) {
        throw new Error('Brak danych zmiany dodatkowej.')
      }

      if (from === to) {
        throw new Error('Godzina rozpoczęcia i zakończenia muszą być różne.')
      }

      const normalizedWarnings = Array.isArray(warnings)
        ? warnings.filter(Boolean).map(String)
        : []
      const normalizedEmployeeName = String(
        employeeNameSnapshot || ''
      ).trim()

      if (!normalizedEmployeeName) {
        throw new Error(
          'Nie udało się zapisać nazwy pracownika w historii grafiku.'
        )
      }
      const extraShiftId = `extra_${createFragmentId()}`
      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      const dayRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        dayId
      )

      const result = await runTransaction(db, async transaction => {
        const daySnapshot = await transaction.get(dayRef)
        const scheduleSnapshot = await transaction.get(scheduleRef)

        if (!daySnapshot.exists() || !scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono grafiku lub wybranego dnia.')
        }

        const dayData = daySnapshot.data()
        const scheduleData = scheduleSnapshot.data()
        const workingShifts = Array.isArray(dayData.workingShifts)
          ? dayData.workingShifts
          : []
        const extraShift = {
          id: extraShiftId,
          shiftGroupId: null,
          positionId: positionId || null,
          positionNameSnapshot:
            positionNameSnapshot || 'Bez stanowiska',
          from,
          to,
          employeeId,
          employeeNameSnapshot: normalizedEmployeeName,
          assignmentSource: normalizedWarnings.length > 0
            ? 'OVERRIDE'
            : 'MANUAL',
          origin: 'MANUAL_EXTRA',
          decision,
          warnings: normalizedWarnings
        }
        const nextShifts = [...workingShifts, extraShift]
        const employeeIds = [
          ...new Set(
            nextShifts
              .map(shift => shift.employeeId)
              .filter(Boolean)
          )
        ]
        const positionIds = [
          ...new Set(
            nextShifts
              .map(shift => shift.positionId)
              .filter(Boolean)
          )
        ]
        const hasPublishedVersion =
          (Number(scheduleData.publishedRevision) || 0) > 0
        const nextDay = {
          ...dayData,
          id: daySnapshot.id,
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision:
            (Number(dayData.workingRevision) || 0) + 1,
          hasUnpublishedChanges: hasPublishedVersion
        }
        const nextSchedule = {
          ...scheduleData,
          id: scheduleSnapshot.id,
          assignedCount:
            Number(scheduleData.assignedCount) || 0,
          extraShiftsCount:
            (Number(scheduleData.extraShiftsCount) || 0) + 1,
          workingRevision:
            (Number(scheduleData.workingRevision) || 0) + 1,
          hasUnpublishedChanges: hasPublishedVersion
        }

        transaction.update(dayRef, {
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision: nextDay.workingRevision,
          hasUnpublishedChanges: hasPublishedVersion,
          updatedAt: serverTimestamp()
        })

        transaction.update(scheduleRef, {
          extraShiftsCount: nextSchedule.extraShiftsCount,
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges: hasPublishedVersion,
          updatedAt: serverTimestamp()
        })

        return {
          day: nextDay,
          schedule: nextSchedule,
          shift: extraShift
        }
      })

      const dayIndex = currentDays.value.findIndex(
        day => day.id === result.day.id
      )

      if (dayIndex !== -1) {
        currentDays.value[dayIndex] = result.day
      }

      if (currentSchedule.value?.id === result.schedule.id) {
        currentSchedule.value = result.schedule
      }

      return result
    }

    const removeExtraShift = async ({
      scheduleId,
      dayId,
      shiftId
    }) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      const dayRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        dayId
      )

      const result = await runTransaction(db, async transaction => {
        const daySnapshot = await transaction.get(dayRef)
        const scheduleSnapshot = await transaction.get(scheduleRef)

        if (!daySnapshot.exists() || !scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono grafiku lub wybranego dnia.')
        }

        const dayData = daySnapshot.data()
        const scheduleData = scheduleSnapshot.data()
        const workingShifts = Array.isArray(dayData.workingShifts)
          ? dayData.workingShifts
          : []
        const removedShift = workingShifts.find(
          shift => shift.id === shiftId
        )

        if (!removedShift || removedShift.origin !== 'MANUAL_EXTRA') {
          throw new Error('Nie znaleziono zmiany dodatkowej.')
        }

        const nextShifts = workingShifts.filter(
          shift => shift.id !== shiftId
        )
        const employeeIds = [
          ...new Set(
            nextShifts
              .map(shift => shift.employeeId)
              .filter(Boolean)
          )
        ]
        const positionIds = [
          ...new Set(
            nextShifts
              .map(shift => shift.positionId)
              .filter(Boolean)
          )
        ]
        const hasPublishedVersion =
          (Number(scheduleData.publishedRevision) || 0) > 0
        const nextDay = {
          ...dayData,
          id: daySnapshot.id,
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision:
            (Number(dayData.workingRevision) || 0) + 1,
          hasUnpublishedChanges: hasPublishedVersion
        }
        const nextSchedule = {
          ...scheduleData,
          id: scheduleSnapshot.id,
          assignedCount:
            Number(scheduleData.assignedCount) || 0,
          extraShiftsCount: Math.max(
            0,
            (Number(scheduleData.extraShiftsCount) || 0) - 1
          ),
          workingRevision:
            (Number(scheduleData.workingRevision) || 0) + 1,
          hasUnpublishedChanges: hasPublishedVersion
        }

        transaction.update(dayRef, {
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision: nextDay.workingRevision,
          hasUnpublishedChanges: hasPublishedVersion,
          updatedAt: serverTimestamp()
        })

        transaction.update(scheduleRef, {
          extraShiftsCount: nextSchedule.extraShiftsCount,
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges: hasPublishedVersion,
          updatedAt: serverTimestamp()
        })

        return {
          day: nextDay,
          schedule: nextSchedule
        }
      })

      const dayIndex = currentDays.value.findIndex(
        day => day.id === result.day.id
      )

      if (dayIndex !== -1) {
        currentDays.value[dayIndex] = result.day
      }

      if (currentSchedule.value?.id === result.schedule.id) {
        currentSchedule.value = result.schedule
      }

      return result
    }

    return {
      schedules,
      currentSchedule,
      currentDays,
      availabilityEntries,
      isLoading,
      isCreating,
      createDraft,
      fetchSchedules,
      deleteSchedule,
      fetchSchedule,
      fetchScheduleDays,
      fetchAvailability,
      updateWorkingShift,
      addExtraShift,
      removeExtraShift
    }
  }
)
