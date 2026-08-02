import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
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

    let unsubscribePeriods = null

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


        const formatLocalDateKey = (date) => {
      const year = date.getFullYear()

      const month = String(
        date.getMonth() + 1
      ).padStart(2, '0')

      const day = String(
        date.getDate()
      ).padStart(2, '0')

      return `${year}-${month}-${day}`
    }

    const getTimestampMilliseconds = (timestamp) => {
      if (!timestamp) {
        return 0
      }

      if (typeof timestamp.toMillis === 'function') {
        return timestamp.toMillis()
      }

      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().getTime()
      }

      return new Date(timestamp).getTime()
    }

    const rangesOverlap = (
      firstDateFrom,
      firstDateTo,
      secondDateFrom,
      secondDateTo
    ) => {
      return (
        firstDateFrom <= secondDateTo &&
        secondDateFrom <= firstDateTo
      )
    }

    const normalizeBlockedDates = (
      blockedDates,
      dateFrom,
      dateTo
    ) => {
      if (!Array.isArray(blockedDates)) {
        return []
      }

      return [...new Set(blockedDates)]
        .filter(dateKey => {
          return (
            typeof dateKey === 'string' &&
            dateKey >= dateFrom &&
            dateKey <= dateTo
          )
        })
        .sort()
    }

    const isPeriodEffectivelyOpen = (period) => {
      if (period?.status !== 'open') {
        return false
      }

      if (
        getTimestampMilliseconds(period.closesAt) <
        Date.now()
      ) {
        return false
      }

      const todayDateKey =
        formatLocalDateKey(new Date())

      return (
        period.dateTo &&
        period.dateTo >= todayDateKey
      )
    }




        const fetchPeriods = async () => {
      const periodsRef = await getPeriodsCollectionRef()

      if (!periodsRef) {
        periods.value = []
        return
      }

      if (unsubscribePeriods) {
        unsubscribePeriods()
        unsubscribePeriods = null
      }

      isLoading.value = true

      return new Promise((resolve, reject) => {
        let isFirstSnapshot = true

        unsubscribePeriods = onSnapshot(
          periodsRef,
          (snapshot) => {
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

            isLoading.value = false

            if (isFirstSnapshot) {
              isFirstSnapshot = false
              resolve()
            }
          },
          (error) => {
            console.error(
              'Błąd nasłuchu okresów dyspozycji:',
              error
            )

            isLoading.value = false

            if (isFirstSnapshot) {
              isFirstSnapshot = false
              reject(error)
            }
          }
        )
      })
    }

    const stopPeriodsListener = () => {
      if (!unsubscribePeriods) {
        return
      }

      unsubscribePeriods()
      unsubscribePeriods = null
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

          demandModelId:
            periodData.demandModelId || null,

          blockedDates:
            normalizeBlockedDates(
              periodData.blockedDates,
              periodData.dateFrom,
              periodData.dateTo
            ),

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
          demandModelId: dataToSave.demandModelId,
          blockedDates: dataToSave.blockedDates,
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
          'Można edytować wyłącznie szkic okresu.'
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

          demandModelId:
            periodData.demandModelId || null,

          blockedDates:
            normalizeBlockedDates(
              periodData.blockedDates,
              periodData.dateFrom,
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

    const updateBlockedDates = async (
      periodId,
      blockedDates,
      editorData
    ) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId) {
        throw new Error(
          'Brakuje danych potrzebnych do zapisu wyłączonych dni.'
        )
      }

      const period = periods.value.find(
        item => item.id === periodId
      )

      if (!period) {
        throw new Error(
          'Nie znaleziono wybranego okresu.'
        )
      }

      const canEditBlockedDates =
        period.status === 'draft' ||
        isPeriodEffectivelyOpen(period)

      if (!canEditBlockedDates) {
        throw new Error(
          'Wyłączone dni można zmieniać tylko w szkicu lub otwartym okresie.'
        )
      }

      const normalizedBlockedDates =
        normalizeBlockedDates(
          blockedDates,
          period.dateFrom,
          period.dateTo
        )

      isSaving.value = true

      try {
        await updateDoc(
          doc(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji',
            periodId
          ),
          {
            blockedDates: normalizedBlockedDates,
            blockedDatesUpdatedById:
              editorData?.id || null,
            blockedDatesUpdatedByName:
              editorData?.name || '',
            blockedDatesUpdatedAt:
              serverTimestamp(),
            updatedById: editorData?.id || null,
            updatedByName: editorData?.name || '',
            updatedAt: serverTimestamp()
          }
        )

        return normalizedBlockedDates
      } catch (error) {
        console.error(
          'Błąd zapisu wyłączonych dni:',
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

      if (!existingPeriod) {
        throw new Error(
          'Nie znaleziono wybranego okresu.'
        )
      }

      if (isPeriodEffectivelyOpen(existingPeriod)) {
        throw new Error(
          'Najpierw zamknij otwarty okres dyspozycji.'
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




    const openPeriod = async (
      periodId,
      editorData
    ) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId) {
        throw new Error(
          'Brakuje danych potrzebnych do otwarcia okresu.'
        )
      }

      const period = periods.value.find(
        item => item.id === periodId
      )

      if (!period) {
        throw new Error(
          'Nie znaleziono wybranego okresu.'
        )
      }

      if (period.status !== 'draft') {
        throw new Error(
          'Można otworzyć wyłącznie okres zapisany jako szkic.'
        )
      }

      if (!period.demandModelId) {
        throw new Error(
          'Wybierz model zapotrzebowania przed otwarciem dyspozycji.'
        )
      }

      if (
        getTimestampMilliseconds(period.closesAt) <
        Date.now()
      ) {
        throw new Error(
          'Termin wprowadzania zmian już minął. Ustaw nowy termin.'
        )
      }

      const todayDateKey =
        formatLocalDateKey(new Date())

      if (
        !period.dateTo ||
        period.dateTo < todayDateKey
      ) {
        throw new Error(
          'Nie można otworzyć okresu, którego zakres już się zakończył.'
        )
      }

      const conflictingPeriod = periods.value.find(
        otherPeriod => {
          return (
            otherPeriod.id !== period.id &&
            isPeriodEffectivelyOpen(otherPeriod) &&
            rangesOverlap(
              period.dateFrom,
              period.dateTo,
              otherPeriod.dateFrom,
              otherPeriod.dateTo
            )
          )
        }
      )

      if (conflictingPeriod) {
        throw new Error(
          `Ten zakres pokrywa się z otwartym okresem „${conflictingPeriod.name}”.`
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

        await updateDoc(periodRef, {
          status: 'open',

          openedById:
            editorData?.id || null,

          openedByName:
            editorData?.name || '',

          openedAt: serverTimestamp(),

          updatedById:
            editorData?.id || null,

          updatedByName:
            editorData?.name || '',

          updatedAt: serverTimestamp()
        })
      } catch (error) {
        console.error(
          'Błąd otwierania okresu dyspozycji:',
          error
        )

        throw error
      } finally {
        isSaving.value = false
      }
    }

    const closePeriod = async (
      periodId,
      editorData
    ) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId) {
        throw new Error(
          'Brakuje danych potrzebnych do zamknięcia okresu.'
        )
      }

      const period = periods.value.find(
        item => item.id === periodId
      )

      if (!period || !isPeriodEffectivelyOpen(period)) {
        throw new Error(
          'Ten okres nie jest obecnie otwarty.'
        )
      }

      isSaving.value = true

      try {
        await updateDoc(
          doc(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji',
            periodId
          ),
          {
            status: 'closed',
            closedById: editorData?.id || null,
            closedByName: editorData?.name || '',
            closedAt: serverTimestamp(),
            updatedById: editorData?.id || null,
            updatedByName: editorData?.name || '',
            updatedAt: serverTimestamp()
          }
        )
      } catch (error) {
        console.error(
          'Błąd zamykania okresu dyspozycji:',
          error
        )

        throw error
      } finally {
        isSaving.value = false
      }
    }

    const extendPeriodDeadline = async (
      periodId,
      closesOn,
      editorData
    ) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId || !closesOn) {
        throw new Error(
          'Brakuje danych potrzebnych do przedłużenia terminu.'
        )
      }

      const period = periods.value.find(
        item => item.id === periodId
      )

      if (!period || !isPeriodEffectivelyOpen(period)) {
        throw new Error(
          'Można przedłużyć wyłącznie aktualnie otwarty okres.'
        )
      }

      const todayDateKey = formatLocalDateKey(new Date())
      const newClosesAt = getEndOfDayTimestamp(closesOn)

      if (
        closesOn < todayDateKey ||
        closesOn > period.dateTo
      ) {
        throw new Error(
          'Nowy termin musi przypadać od dzisiaj do końca okresu.'
        )
      }

      

      isSaving.value = true

      try {
        await updateDoc(
          doc(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji',
            periodId
          ),
          {
            closesAt: newClosesAt,
            deadlineExtendedById: editorData?.id || null,
            deadlineExtendedByName: editorData?.name || '',
            deadlineExtendedAt: serverTimestamp(),
            updatedById: editorData?.id || null,
            updatedByName: editorData?.name || '',
            updatedAt: serverTimestamp()
          }
        )
      } catch (error) {
        console.error(
          'Błąd przedłużania terminu okresu dyspozycji:',
          error
        )

        throw error
      } finally {
        isSaving.value = false
      }
    }

    const reopenPeriod = async (
      periodId,
      closesOn,
      editorData
    ) => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !periodId || !closesOn) {
        throw new Error(
          'Brakuje danych potrzebnych do ponownego otwarcia okresu.'
        )
      }

      const period = periods.value.find(
        item => item.id === periodId
      )

      if (!period) {
        throw new Error(
          'Nie znaleziono wybranego okresu.'
        )
      }

      if (isPeriodEffectivelyOpen(period)) {
        throw new Error(
          'Ten okres jest już otwarty.'
        )
      }

      if (period.status === 'draft') {
        throw new Error(
          'Szkic otwórz przyciskiem „Otwórz dyspozycje”.'
        )
      }

      if (!period.demandModelId) {
        throw new Error(
          'Ten okres nie ma wybranego modelu zapotrzebowania.'
        )
      }

      const todayDateKey = formatLocalDateKey(new Date())

      if (!period.dateTo || period.dateTo < todayDateKey) {
        throw new Error(
          'Nie można ponownie otworzyć okresu, którego zakres już minął.'
        )
      }

      if (
        closesOn < todayDateKey ||
        closesOn > period.dateTo
      ) {
        throw new Error(
          'Nowy termin musi przypadać od dzisiaj do końca okresu.'
        )
      }

      const conflictingPeriod = periods.value.find(
        otherPeriod => {
          return (
            otherPeriod.id !== period.id &&
            isPeriodEffectivelyOpen(otherPeriod) &&
            rangesOverlap(
              period.dateFrom,
              period.dateTo,
              otherPeriod.dateFrom,
              otherPeriod.dateTo
            )
          )
        }
      )

      if (conflictingPeriod) {
        throw new Error(
          `Ten zakres pokrywa się z otwartym okresem „${conflictingPeriod.name}”.`
        )
      }

      isSaving.value = true

      try {
        await updateDoc(
          doc(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji',
            periodId
          ),
          {
            status: 'open',
            closesAt: getEndOfDayTimestamp(closesOn),
            reopenedById: editorData?.id || null,
            reopenedByName: editorData?.name || '',
            reopenedAt: serverTimestamp(),
            updatedById: editorData?.id || null,
            updatedByName: editorData?.name || '',
            updatedAt: serverTimestamp()
          }
        )
      } catch (error) {
        console.error(
          'Błąd ponownego otwierania okresu dyspozycji:',
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
      stopPeriodsListener,
      addPeriod,
      updatePeriod,
      updateBlockedDates,
      deletePeriod,
      openPeriod,
      closePeriod,
      extendPeriodDeadline,
      reopenPeriod
    }


  }
)