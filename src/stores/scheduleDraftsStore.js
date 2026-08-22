import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
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

    return {
      schedules,
      currentSchedule,
      currentDays,
      isLoading,
      isCreating,
      createDraft,
      fetchSchedules,
      fetchSchedule,
      fetchScheduleDays
    }
  }
)
