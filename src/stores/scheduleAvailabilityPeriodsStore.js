import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import { useAuthStore } from './authStore.js'

export const useScheduleAvailabilityPeriodsStore = defineStore(
  'scheduleAvailabilityPeriods',
  () => {
    const periods = ref([])
    const isLoading = ref(false)
    const isSaving = ref(false)

    const getRestaurantId = () => {
      return new Promise((resolve) => {
        const employeeAuthStore = useEmployeeAuthStore()
        const authStore = useAuthStore()

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

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          resolve(user ? user.uid : null)
        })
      })
    }

    const getPeriodsCollectionRef = async () => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        return null
      }

      return collection(
        db,
        'users',
        restaurantId,
        'grafik_okresy_dyspozycji'
      )
    }


        const getEndOfDayTimestamp = (dateKey) => {
      const [year, month, day] =
        dateKey.split('-').map(Number)

      const endOfDay = new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999
      )

      return Timestamp.fromDate(endOfDay)
    }

    const getExpirationTimestamp = (dateKey) => {
      const [year, month, day] =
        dateKey.split('-').map(Number)

      const expirationDate = new Date(
        year,
        month - 1,
        day + 1,
        0,
        0,
        0,
        0
      )

      return Timestamp.fromDate(expirationDate)
    }




    const fetchPeriods = async () => {
      const periodsRef = await getPeriodsCollectionRef()

      if (!periodsRef) {
        periods.value = []
        return
      }

      isLoading.value = true

      try {
        const snapshot = await getDocs(periodsRef)

        periods.value = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data()
          }))
          .sort((periodA, periodB) => {
            return (periodA.dateFrom || '').localeCompare(
              periodB.dateFrom || ''
            )
          })
      } catch (error) {
        console.error(
          'Błąd pobierania okresów dyspozycji:',
          error
        )

        throw error
      } finally {
        isLoading.value = false
      }
    }

    const addPeriod = async (periodData) => {
      const periodsRef = await getPeriodsCollectionRef()

      if (!periodsRef) {
        throw new Error(
          'Nie udało się rozpoznać restauracji.'
        )
      }

      isSaving.value = true

      try {
        const dataToSave = {
          name: periodData.name,
          dateFrom: periodData.dateFrom,
          dateTo: periodData.dateTo,

          closesAt:
            getEndOfDayTimestamp(
              periodData.closesOn
            ),

          expiresAt:
            getExpirationTimestamp(
              periodData.dateTo
            ),

          status: 'draft',

          demandModelId: null,
          blockedDates: [],

          createdById: periodData.createdById || null,
          createdByName: periodData.createdByName || '',
          createdAt: serverTimestamp(),

          updatedById: periodData.createdById || null,
          updatedByName: periodData.createdByName || '',
          updatedAt: serverTimestamp()
        }

        const documentRef = await addDoc(
          periodsRef,
          dataToSave
        )

        const newPeriod = {
          id: documentRef.id,
          name: dataToSave.name,
          dateFrom: dataToSave.dateFrom,
          dateTo: dataToSave.dateTo,
          closesAt: dataToSave.closesAt,
          expiresAt: dataToSave.expiresAt,
          status: dataToSave.status,
          demandModelId: null,
          blockedDates: [],
          createdById: dataToSave.createdById,
          createdByName: dataToSave.createdByName,
          updatedById: dataToSave.updatedById,
          updatedByName: dataToSave.updatedByName
        }

        periods.value.push(newPeriod)

        periods.value.sort((periodA, periodB) => {
          return (periodA.dateFrom || '').localeCompare(
            periodB.dateFrom || ''
          )
        })

        return newPeriod
      } catch (error) {
        console.error(
          'Błąd zapisu okresu dyspozycji:',
          error
        )

        throw error
      } finally {
        isSaving.value = false
      }
    }

    

        const updatePeriod = async (
      periodId,
      periodData
    ) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId) {
        throw new Error(
          'Brakuje danych potrzebnych do edycji okresu.'
        )
      }

      const existingPeriod = periods.value.find(
        period => period.id === periodId
      )

      if (
        !existingPeriod ||
        existingPeriod.status !== 'draft'
      ) {
        throw new Error(
          'Można edytować wyłącznie okres zapisany jako szkic.'
        )
      }

      isSaving.value = true

      try {
        const periodRef = doc(
          db,
          'users',
          restaurantId,
          'grafik_okresy_dyspozycji',
          periodId
        )

        const dataToSave = {
          name: periodData.name,
          dateFrom: periodData.dateFrom,
          dateTo: periodData.dateTo,

          closesAt:
            getEndOfDayTimestamp(
              periodData.closesOn
            ),

          expiresAt:
            getExpirationTimestamp(
              periodData.dateTo
            ),

          updatedById:
            periodData.updatedById || null,

          updatedByName:
            periodData.updatedByName || '',

          updatedAt: serverTimestamp()
        }

        await updateDoc(
          periodRef,
          dataToSave
        )

        const periodIndex = periods.value.findIndex(
          period => period.id === periodId
        )

        if (periodIndex !== -1) {
          periods.value[periodIndex] = {
            ...periods.value[periodIndex],
            ...dataToSave,
            id: periodId
          }
        }

        periods.value.sort((periodA, periodB) => {
          return (periodA.dateFrom || '').localeCompare(
            periodB.dateFrom || ''
          )
        })
      } catch (error) {
        console.error(
          'Błąd aktualizacji okresu dyspozycji:',
          error
        )

        throw error
      } finally {
        isSaving.value = false
      }
    }

    const deletePeriod = async (periodId) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId) {
        throw new Error(
          'Brakuje danych potrzebnych do usunięcia okresu.'
        )
      }

      const existingPeriod = periods.value.find(
        period => period.id === periodId
      )

      if (
        !existingPeriod ||
        existingPeriod.status !== 'draft'
      ) {
        throw new Error(
          'Na tym etapie można usunąć wyłącznie szkic okresu.'
        )
      }

      isSaving.value = true

      try {
        await deleteDoc(
          doc(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji',
            periodId
          )
        )

        periods.value = periods.value.filter(
          period => period.id !== periodId
        )
      } catch (error) {
        console.error(
          'Błąd usuwania okresu dyspozycji:',
          error
        )

        throw error
      } finally {
        isSaving.value = false
      }
    }


      

    return {
      periods,
      isLoading,
      isSaving,
      fetchPeriods,
      addPeriod,
      updatePeriod,
      deletePeriod
    }


  }
)