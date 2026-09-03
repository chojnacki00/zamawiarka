import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  deleteField,
  increment,
  writeBatch,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useEmployeeAuthStore } from './employeeAuthStore.js'
import { useAuthorizationStore } from './authorizationStore.js'
import {
  getScheduleRangeConflicts,
  isPeriodEffectivelyOpen
} from '../utils/scheduleCreationValidation.js'
import {
  applyAvailabilityPeriodDeletion,
  buildAvailabilityPeriodDeletePlan
} from '../utils/scheduleAvailability.js'

export const AVAILABILITY_PERIOD_ERROR_CODES = Object.freeze({
  SCHEDULE_CONFLICT: 'availability-period/schedule-conflict'
})

export const useScheduleAvailabilityPeriodsStore = defineStore(
  'scheduleAvailabilityPeriods',
  () => {
    const periods = ref([])
    const isLoading = ref(false)
    const isSaving = ref(false)

    let unsubscribePeriods = null

    const getRestaurantId = async () => (
      useEmployeeAuthStore().requireRestaurantId()
    )

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

    const assertPeriodDoesNotOverlapSchedule = async (
      restaurantId,
      period
    ) => {
      const schedulesSnapshot = await getDocs(
        collection(
          db,
          'users',
          restaurantId,
          'grafiki'
        )
      )

      const conflicts = getScheduleRangeConflicts({
        schedules: schedulesSnapshot.docs.map(
          documentSnapshot => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
          })
        ),
        dateFrom: period.dateFrom,
        dateTo: period.dateTo
      })

      if (!conflicts.length) {
        return
      }

      const error = new Error(
        'Nie można otworzyć dyspozycji dla dni objętych utworzonym grafikiem.'
      )

      error.code =
        AVAILABILITY_PERIOD_ERROR_CODES.SCHEDULE_CONFLICT
      error.conflicts = conflicts.map(schedule => ({
        id: schedule.id,
        name: schedule.name || 'Grafik bez nazwy',
        dateFrom: schedule.dateFrom || '',
        dateTo: schedule.dateTo || ''
      }))

      throw error
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

    // Dokument dnia jest trwałym źródłem informacji dla przyszłego grafiku.
    // Okres dyspozycji tylko zbiorczo aktualizuje dokumenty z wybranego zakresu.
    const getDateKeysInRange = (dateFrom, dateTo) => {
      if (!dateFrom || !dateTo || dateFrom > dateTo) {
        return []
      }

      const [fromYear, fromMonth, fromDay] =
        dateFrom.split('-').map(Number)
      const [toYear, toMonth, toDay] =
        dateTo.split('-').map(Number)

      const cursor = new Date(Date.UTC(
        fromYear,
        fromMonth - 1,
        fromDay
      ))
      const rangeEnd = new Date(Date.UTC(
        toYear,
        toMonth - 1,
        toDay
      ))

      const dateKeys = []

      while (cursor <= rangeEnd) {
        dateKeys.push(cursor.toISOString().slice(0, 10))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }

      // Jeden batch Firestore może zawierać najwyżej 500 operacji.
      // Jedną operację rezerwujemy dla dokumentu okresu.
      if (dateKeys.length > 499) {
        throw new Error(
          'Okres może obejmować maksymalnie 499 dni.'
        )
      }

      return dateKeys
    }

    const addAvailabilityDaysToBatch = ({
      batch,
      restaurantId,
      period,
      availabilityStatus,
      closesAt,
      blockedDates,
      editorData
    }) => {
      const dateKeys = getDateKeysInRange(
        period.dateFrom,
        period.dateTo
      )
      const blockedDateSet = new Set(
        Array.isArray(blockedDates)
          ? blockedDates
          : period.blockedDates || []
      )

      dateKeys.forEach((dateKey) => {
        batch.set(
          doc(
            db,
            'users',
            restaurantId,
            'dyspozycje_dni',
            dateKey
          ),
          {
            date: dateKey,
            demandModelId: period.demandModelId,
            availabilityStatus,
            availabilityClosesAt: closesAt,
            availabilityDisabled:
              blockedDateSet.has(dateKey),
            sourcePeriodId: period.id,
            updatedById: editorData?.id || null,
            updatedByName: editorData?.name || '',
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
      })
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
        const batch = writeBatch(db)

        batch.update(
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

        if (isPeriodEffectivelyOpen(period)) {
          addAvailabilityDaysToBatch({
            batch,
            restaurantId,
            period,
            availabilityStatus: 'open',
            closesAt: period.closesAt,
            blockedDates: normalizedBlockedDates,
            editorData
          })
        }

        await batch.commit()

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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
        const [deleteTarget] =
          buildAvailabilityPeriodDeletePlan(periodId)

        await deleteDoc(
          doc(
            db,
            'users',
            restaurantId,
            deleteTarget.collectionName,
            deleteTarget.documentId
          )
        )

        periods.value = applyAvailabilityPeriodDeletion(
          { periods: periods.value },
          periodId
        ).periods
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

    const commitCleanupOperations = async (
      operations,
      chunkSize = 400
    ) => {
      for (
        let startIndex = 0;
        startIndex < operations.length;
        startIndex += chunkSize
      ) {
        const batch = writeBatch(db)

        operations
          .slice(startIndex, startIndex + chunkSize)
          .forEach(operation => {
            if (operation.type === 'delete') {
              batch.delete(operation.ref)
              return
            }

            if (operation.type === 'set') {
              batch.set(
                operation.ref,
                operation.data,
                operation.options || {}
              )
              return
            }

            batch.update(
              operation.ref,
              operation.data
            )
          })

        await batch.commit()
      }
    }

    const clearAvailabilityDataRange = async ({
      dateFrom,
      dateTo,
      clearEmployeeEntries = false,
      clearManagerEntries = false,
      clearDemandModels = false
    }) => {
      useAuthorizationStore().requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error(
          'Nie udało się rozpoznać restauracji.'
        )
      }

      if (!dateFrom || !dateTo || dateFrom > dateTo) {
        throw new Error(
          'Wybierz prawidłowy zakres dat do wyczyszczenia.'
        )
      }

      if (
        !clearEmployeeEntries &&
        !clearManagerEntries &&
        !clearDemandModels
      ) {
        throw new Error(
          'Zaznacz przynajmniej jeden rodzaj danych do usunięcia.'
        )
      }

      isSaving.value = true

      try {
        const periodsRef = collection(
          db,
          'users',
          restaurantId,
          'grafik_okresy_dyspozycji'
        )

        const periodsSnapshot = await getDocs(periodsRef)

        const overlappingPeriods = periodsSnapshot.docs
          .map(documentSnapshot => ({
            id: documentSnapshot.id,
            ref: documentSnapshot.ref,
            ...documentSnapshot.data()
          }))
          .filter(period => {
            return rangesOverlap(
              dateFrom,
              dateTo,
              period.dateFrom,
              period.dateTo
            )
          })

        const openPeriod = overlappingPeriods.find(
          period => isPeriodEffectivelyOpen(period)
        )

        if (openPeriod) {
          throw new Error(
            `Najpierw wstrzymaj otwarty okres „${openPeriod.name}”.`
          )
        }

        const getRangeSnapshot = collectionName => {
          return getDocs(
            query(
              collection(
                db,
                'users',
                restaurantId,
                collectionName
              ),
              where('date', '>=', dateFrom),
              where('date', '<=', dateTo)
            )
          )
        }

        const [
          availabilityEntriesSnapshot,
          availabilityDaysSnapshot
        ] = await Promise.all([
          clearEmployeeEntries || clearManagerEntries
            ? getRangeSnapshot('grafik_dyspozycyjnosc')
            : Promise.resolve(null),
          clearDemandModels
            ? getRangeSnapshot('dyspozycje_dni')
            : Promise.resolve(null)
        ])

        const operations = []
        const changedAvailabilityDates = new Set()
        let changedEntriesCount = 0

        if (availabilityEntriesSnapshot) {
          availabilityEntriesSnapshot.docs.forEach(
            documentSnapshot => {
              const data = documentSnapshot.data()
              const employeeEntry = data.employeeEntry || null
              const managerEntry = data.managerEntry || null

              if (
                clearEmployeeEntries &&
                clearManagerEntries
              ) {
                operations.push({
                  type: 'delete',
                  ref: documentSnapshot.ref
                })
              } else if (clearEmployeeEntries) {
                if (!employeeEntry) {
                  return
                }

                if (!managerEntry) {
                  operations.push({
                    type: 'delete',
                    ref: documentSnapshot.ref
                  })
                } else {
                  operations.push({
                    type: 'update',
                    ref: documentSnapshot.ref,
                    data: {
                      periodId: managerEntry.periodId || null,
                      type: managerEntry.type,
                      timeFrom: managerEntry.timeFrom ?? null,
                      timeTo: managerEntry.timeTo ?? null,
                      note: managerEntry.note || '',
                      effectiveSource: 'manager',
                      employeeEntry: deleteField(),
                      updatedAt: serverTimestamp()
                    }
                  })
                }
              } else if (clearManagerEntries) {
                if (!managerEntry) {
                  return
                }

                if (!employeeEntry) {
                  operations.push({
                    type: 'delete',
                    ref: documentSnapshot.ref
                  })
                } else {
                  operations.push({
                    type: 'update',
                    ref: documentSnapshot.ref,
                    data: {
                      periodId: employeeEntry.periodId || null,
                      type: employeeEntry.type,
                      timeFrom: employeeEntry.timeFrom ?? null,
                      timeTo: employeeEntry.timeTo ?? null,
                      note: employeeEntry.note || '',
                      effectiveSource: 'employee',
                      managerEntry: deleteField(),
                      updatedAt: serverTimestamp()
                    }
                  })
                }
              }

              changedEntriesCount += 1

              if (data.date) {
                changedAvailabilityDates.add(data.date)
              }
            }
          )
        }

        changedAvailabilityDates.forEach(dateKey => {
          operations.push({
            type: 'set',
            ref: doc(
              db,
              'users',
              restaurantId,
              'grafik_dyspozycyjnosc_wersje',
              dateKey
            ),
            data: {
              date: dateKey,
              version: increment(1),
              updatedAt: serverTimestamp()
            },
            options: { merge: true }
          })
        })

        let clearedModelsCount = 0

        if (availabilityDaysSnapshot) {
          availabilityDaysSnapshot.docs.forEach(
            documentSnapshot => {
              const data = documentSnapshot.data()

              if (!data.demandModelId) {
                return
              }

              operations.push({
                type: 'update',
                ref: documentSnapshot.ref,
                data: {
                  demandModelId: null,
                  sourcePeriodId: null,
                  updatedAt: serverTimestamp()
                }
              })

              clearedModelsCount += 1
            }
          )
        }

        await commitCleanupOperations(operations)

        return {
          entriesCount: changedEntriesCount,
          modelsCount: clearedModelsCount
        }
      } catch (error) {
        console.error(
          'Błąd czyszczenia danych dyspozycji:',
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
        await assertPeriodDoesNotOverlapSchedule(
          restaurantId,
          period
        )

        const periodRef = doc(
          db,
          'users',
          restaurantId,
          'grafik_okresy_dyspozycji',
          periodId
        )

        const batch = writeBatch(db)

        batch.update(periodRef, {
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

        addAvailabilityDaysToBatch({
          batch,
          restaurantId,
          period,
          availabilityStatus: 'open',
          closesAt: period.closesAt,
          blockedDates: period.blockedDates,
          editorData
        })

        await batch.commit()
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
        const batch = writeBatch(db)

        batch.update(
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

        addAvailabilityDaysToBatch({
          batch,
          restaurantId,
          period,
          availabilityStatus: 'closed',
          closesAt: period.closesAt,
          blockedDates: period.blockedDates,
          editorData
        })

        await batch.commit()
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
        const batch = writeBatch(db)

        batch.update(
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

        addAvailabilityDaysToBatch({
          batch,
          restaurantId,
          period,
          availabilityStatus: 'open',
          closesAt: newClosesAt,
          blockedDates: period.blockedDates,
          editorData
        })

        await batch.commit()
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
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
        await assertPeriodDoesNotOverlapSchedule(
          restaurantId,
          period
        )

        const newClosesAt = getEndOfDayTimestamp(closesOn)
        const batch = writeBatch(db)

        batch.update(
          doc(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji',
            periodId
          ),
          {
            status: 'open',
            closesAt: newClosesAt,
            reopenedById: editorData?.id || null,
            reopenedByName: editorData?.name || '',
            reopenedAt: serverTimestamp(),
            updatedById: editorData?.id || null,
            updatedByName: editorData?.name || '',
            updatedAt: serverTimestamp()
          }
        )

        addAvailabilityDaysToBatch({
          batch,
          restaurantId,
          period,
          availabilityStatus: 'open',
          closesAt: newClosesAt,
          blockedDates: period.blockedDates,
          editorData
        })

        await batch.commit()
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
      clearAvailabilityDataRange,
      openPeriod,
      closePeriod,
      extendPeriodDeadline,
      reopenPeriod
    }


  }
)
