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
  where
} from 'firebase/firestore'
import {
  getAuth
} from 'firebase/auth'
import { db } from '../firebase.js'
import { useAuthorizationStore } from './authorizationStore.js'
import {
  DEFAULT_GENERATOR_SETTINGS,
  normalizeGeneratorSettings
} from './scheduleGeneratorSettingsStore.js'
import {
  buildScheduleRangeProblems,
  getDateKeysInRange,
  getMissingDemandModelDates,
  getOpenAvailabilityPeriodConflicts,
  getPreviousDateKey,
  getScheduleContinuity,
  getScheduleRangeConflicts,
  isValidDateRange
} from '../utils/scheduleCreationValidation.js'
import {
  FIRESTORE_ATOMIC_WRITE_LIMIT,
  assertAtomicScheduleSize,
  assertScheduleDayBelongsToSchedule,
  canDeleteUnpublishedSchedule,
  getAtomicScheduleSnapshotCreationPlan,
  getInitialScheduleStatus,
  getScheduleDayDocumentId
} from '../utils/scheduleStructure.js'
import {
  PLANNING_CONTEXT_COLLECTION,
  PLANNING_CONTEXT_VERSION,
  buildDemandDaySnapshot,
  buildPlanningContextSnapshot,
  buildWorkingShiftsFromDemandDay,
  hydratePlanningContext
} from '../utils/schedulePlanningContext.js'
import {
  assignShiftManually,
  clearRegularVacancyAssignment,
  createManualExtraShift,
  isExtraShift,
  replaceShiftWarnings
} from '../utils/scheduleAssignments.js'
import {
  normalizeSchedulePositionColor
} from '../utils/schedulePositionColors.js'
import {
  assertAtomicPublicationSize,
  canPublishSchedule,
  getPublicationDateKeys,
  getWorkingEditPublicationState,
  prepareSchedulePublication
} from '../utils/schedulePublication.js'
import {
  preparePublicScheduleProjection
} from '../utils/schedulePublicProjection.js'
import {
  assertAtomicUnpublicationSize,
  assertPublicProjectionOwnership,
  canUnpublishSchedule,
  getUnpublicationDateKeys,
  prepareScheduleDeletion,
  prepareScheduleUnpublication
} from '../utils/schedulePublicationWithdrawal.js'

export const SCHEDULE_CREATION_ERROR_CODES = {
  RANGE_PROBLEMS: 'schedule/range-problems',
  ATOMIC_DATE_CONFLICT: 'schedule/atomic-date-conflict',
  CONTINUITY_WARNING: 'schedule/continuity-warning-required'
}

const createScheduleCreationError = (code, message, details = null) => {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

export const useScheduleDraftsStore = defineStore(
  'scheduleDrafts',
  () => {
    const schedules = ref([])
    const currentSchedule = ref(null)
    const currentDays = ref([])
    const currentPlanningContext = ref(null)
    const planningEmployees = ref([])
    const planningPositions = ref([])
    const planningEmploymentProfiles = ref([])
    const planningGeneratorSettings = ref({})
    const availabilityEntries = ref([])
    const isLoading = ref(false)
    const isCreating = ref(false)

    const getRestaurantId = async () => (
      useAuthorizationStore().requireRestaurantId()
    )

    const getCreationSafety = async ({ dateFrom, dateTo }) => {
      if (!isValidDateRange(dateFrom, dateTo)) {
        throw new Error('Zakres grafiku jest nieprawidłowy.')
      }

      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      const previousDate = getPreviousDateKey(dateFrom)
      const previousDayRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        getScheduleDayDocumentId(previousDate)
      )
      const availabilityDaysQuery = query(
        collection(db, 'users', restaurantId, 'dyspozycje_dni'),
        where('date', '>=', dateFrom),
        where('date', '<=', dateTo)
      )
      const [
        schedulesSnapshot,
        periodsSnapshot,
        previousDaySnapshot,
        availabilityDaysSnapshot,
        demandModelsSnapshot
      ] =
        await Promise.all([
          getDocs(collection(db, 'users', restaurantId, 'grafiki')),
          getDocs(collection(
            db,
            'users',
            restaurantId,
            'grafik_okresy_dyspozycji'
          )),
          getDoc(previousDayRef),
          getDocs(availabilityDaysQuery),
          getDocs(collection(
            db,
            'users',
            restaurantId,
            'scheduleDemandModels'
          ))
        ])
      const existingSchedules = schedulesSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const availabilityPeriods = periodsSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const previousScheduleDays = previousDaySnapshot.exists()
        ? [{
            id: previousDaySnapshot.id,
            ...previousDaySnapshot.data()
          }]
        : []
      const availabilityDays = availabilityDaysSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const demandModels = demandModelsSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const missingRequiredDataDates = getMissingDemandModelDates({
        dateFrom,
        dateTo,
        availabilityDays,
        demandModels
      })
      const openAvailabilityConflicts =
        getOpenAvailabilityPeriodConflicts({
          periods: availabilityPeriods,
          dateFrom,
          dateTo
        })
      const scheduleConflicts = getScheduleRangeConflicts({
        schedules: existingSchedules,
        dateFrom,
        dateTo
      })
      const rangeProblems = buildScheduleRangeProblems({
        missingDates: missingRequiredDataDates,
        openAvailabilityConflicts,
        scheduleConflicts
      })

      return {
        missingRequiredDataDates,
        openAvailabilityConflicts,
        scheduleConflicts,
        rangeProblems,
        continuity: getScheduleContinuity({
          dateFrom,
          schedules: existingSchedules,
          scheduleDays: previousScheduleDays
        })
      }
    }

    const preparePlanningContext = async ({
      restaurantId,
      scheduleId,
      dateKeys
    }) => {
      const dateFrom = dateKeys[0]
      const dateTo = dateKeys[dateKeys.length - 1]
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
      const availabilityDaysQuery = query(
        collection(db, 'users', restaurantId, 'dyspozycje_dni'),
        where('date', '>=', dateFrom),
        where('date', '<=', dateTo)
      )
      const [
        employeesSnapshot,
        positionsSnapshot,
        profilesSnapshot,
        generatorSettingsSnapshot,
        availabilitySnapshot,
        availabilityDaysSnapshot,
        demandModelsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users', restaurantId, 'employees')),
        getDocs(collection(db, 'users', restaurantId, 'positions')),
        getDocs(collection(
          db,
          'users',
          restaurantId,
          'grafik_profile_zatrudnienia'
        )),
        getDoc(doc(
          db,
          'users',
          restaurantId,
          'grafik_ustawienia',
          'generator'
        )),
        getDocs(availabilityQuery),
        getDocs(availabilityDaysQuery),
        getDocs(collection(
          db,
          'users',
          restaurantId,
          'scheduleDemandModels'
        ))
      ])
      const employees = employeesSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const positions = positionsSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const employmentProfiles = profilesSnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const availability = availabilitySnapshot.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }))
      const demandModelsById = new Map(
        demandModelsSnapshot.docs.map(snapshot => [
          snapshot.id,
          { id: snapshot.id, ...snapshot.data() }
        ])
      )
      const modelIdByDate = new Map(
        availabilityDaysSnapshot.docs.map(snapshot => {
          const data = snapshot.data()
          return [data.date || snapshot.id, data.demandModelId || null]
        })
      )
      const missingDates = dateKeys.filter(dateKey => {
        const modelId = modelIdByDate.get(dateKey)
        return !modelId || !demandModelsById.has(modelId)
      })

      if (missingDates.length) {
        throw createScheduleCreationError(
          SCHEDULE_CREATION_ERROR_CODES.RANGE_PROBLEMS,
          'Dane zakresu zmieniły się przed utworzeniem grafiku.',
          buildScheduleRangeProblems({ missingDates })
        )
      }

      const preparedDays = dateKeys.map(dateKey => buildDemandDaySnapshot({
        dateKey,
        demandModel: demandModelsById.get(modelIdByDate.get(dateKey)),
        positions
      }))
      const generatorSettings = generatorSettingsSnapshot.exists()
        ? normalizeGeneratorSettings(generatorSettingsSnapshot.data())
        : normalizeGeneratorSettings(DEFAULT_GENERATOR_SETTINGS)
      const planningContext = buildPlanningContextSnapshot({
        scheduleId,
        dateKeys,
        employees,
        positions,
        employmentProfiles,
        generatorSettings,
        availabilityEntries: availability
      })

      return { preparedDays, planningContext }
    }

    const createSchedule = async ({
      name,
      dateFrom,
      dateTo,
      daySummaries,
      continuityWarningAcknowledged = false
    }) => {
      useAuthorizationStore().requirePermission('can_manage_schedule')
      if (isCreating.value) {
        return null
      }

      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!isValidDateRange(dateFrom, dateTo)) {
        throw new Error('Zakres grafiku jest nieprawidłowy.')
      }

      const days = Array.isArray(daySummaries)
        ? daySummaries
        : []
      const expectedDates = getDateKeysInRange(dateFrom, dateTo)
      assertAtomicScheduleSize(expectedDates.length)
      const preparedDates = new Set(
        days.map(day => day?.date).filter(Boolean)
      )

      if (
        days.length !== expectedDates.length ||
        expectedDates.some(dateKey => !preparedDates.has(dateKey))
      ) {
        throw new Error('Brak przygotowanych dni grafiku.')
      }

      isCreating.value = true

      try {
        const creationSafety = await getCreationSafety({ dateFrom, dateTo })

        if (creationSafety.rangeProblems.hasProblems) {
          throw createScheduleCreationError(
            SCHEDULE_CREATION_ERROR_CODES.RANGE_PROBLEMS,
            'Nie można użyć wybranego zakresu.',
            creationSafety.rangeProblems
          )
        }

        if (
          creationSafety.continuity.requiresWarning &&
          !continuityWarningAcknowledged
        ) {
          throw createScheduleCreationError(
            SCHEDULE_CREATION_ERROR_CODES.CONTINUITY_WARNING,
            'Brak ciągłości danych',
            creationSafety.continuity
          )
        }

        const authorizationStore = useAuthorizationStore()
        const auth = getAuth()
        const scheduleRef = doc(
          collection(db, 'users', restaurantId, 'grafiki')
        )
        const scheduleId = scheduleRef.id
        const { preparedDays, planningContext } =
          await preparePlanningContext({
            restaurantId,
            scheduleId,
            dateKeys: expectedDates
          })
        const vacanciesCount = preparedDays.reduce(
          (sum, day) => sum + (Number(day?.slotsCount) || 0),
          0
        )
        getAtomicScheduleSnapshotCreationPlan({
          dateKeys: expectedDates,
          planningContextDocumentsCount:
            planningContext.documents.length
        })
        const createdAt = serverTimestamp()
        const scheduleData = {
          id: scheduleId,
          name: String(name || '').trim() || 'Grafik',
          dateFrom,
          dateTo,
          ...getInitialScheduleStatus(),
          current: false,
          daysCount: preparedDays.length,
          vacanciesCount,
          assignedCount: 0,
          unfilledCount: vacanciesCount,
          extraShiftsCount: 0,
          workingRevision: 1,
          publishedRevision: 0,
          hasUnpublishedChanges: false,
          publishedAt: null,
          lastPublishedAt: null,
          publishedByEmployeeId: null,
          publishedByAuthUid: null,
          lastPublishedByEmployeeId: null,
          lastPublishedByAuthUid: null,
          createdByEmployeeId:
            authorizationStore.employeeId || null,
          createdByAuthUid: auth.currentUser?.uid || null,
          continuity: {
            previousDate: creationSafety.continuity.previousDate,
            previousDayWasPublished:
              creationSafety.continuity.previousDayWasPublished,
            warningAcknowledgedAt:
              creationSafety.continuity.requiresWarning
                ? serverTimestamp()
                : null,
            warningAcknowledgedBy:
              creationSafety.continuity.requiresWarning
                ? authorizationStore.employeeId ||
                  auth.currentUser?.uid ||
                  null
                : null
          },
          planningContextVersion: PLANNING_CONTEXT_VERSION,
          planningContextDocumentsCount:
            planningContext.documents.length,
          planningContextCollection: PLANNING_CONTEXT_COLLECTION,
          schemaVersion: 1,
          createdAt,
          updatedAt: createdAt
        }
        const dayDocuments = preparedDays.map(day => {
          const dayId = getScheduleDayDocumentId(day.date)
          const workingShifts = buildWorkingShiftsFromDemandDay(day)
          const positionIds = [
            ...new Set(
              workingShifts
                .map(shift => shift.positionId)
                .filter(Boolean)
            )
          ]

          return {
            dateKey: dayId,
            ref: doc(
              db,
              'users',
              restaurantId,
              'grafik_dni',
              dayId
            ),
            data: {
              id: dayId,
              scheduleId,
              date: dayId,
              current: false,
              demandModelId: day.modelId,
              demandModelNameSnapshot:
                day.modelName || 'Model bez nazwy',
              demandModelVersionSnapshot:
                day.modelVersionSnapshot || null,
              employeeIds: [],
              positionIds,
              workingShifts,
              publishedShifts: [],
              workingRevision: 1,
              publishedRevision: 0,
              hasUnpublishedChanges: false,
              schemaVersion: 1,
              createdAt,
              updatedAt: createdAt
            }
          }
        })
        const planningContextDocuments =
          planningContext.documents.map(contextDocument => ({
            ...contextDocument,
            ref: doc(
              db,
              'users',
              restaurantId,
              PLANNING_CONTEXT_COLLECTION,
              contextDocument.id
            ),
            data: {
              ...contextDocument.data,
              capturedAt: createdAt
            }
          }))

        await runTransaction(db, async transaction => {
          const daySnapshots = await Promise.all(
            dayDocuments.map(day => transaction.get(day.ref))
          )
          const occupiedDateKeys = daySnapshots
            .map((snapshot, index) => (
              snapshot.exists()
                ? dayDocuments[index].dateKey
                : null
            ))
            .filter(Boolean)
          const creationPlan = getAtomicScheduleSnapshotCreationPlan({
            dateKeys: expectedDates,
            occupiedDateKeys,
            planningContextDocumentsCount:
              planningContextDocuments.length
          })

          if (!creationPlan.canCreate) {
            throw createScheduleCreationError(
              SCHEDULE_CREATION_ERROR_CODES.ATOMIC_DATE_CONFLICT,
              'W czasie tworzenia wybrany zakres został zajęty przez inny grafik. Sprawdź zakres ponownie.',
              { dateKeys: creationPlan.conflictingDateKeys }
            )
          }

          transaction.set(scheduleRef, scheduleData)
          dayDocuments.forEach(day => {
            transaction.set(day.ref, day.data)
          })
          planningContextDocuments.forEach(contextDocument => {
            transaction.set(
              contextDocument.ref,
              contextDocument.data
            )
          })
        })

        return scheduleId
      } catch (error) {
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
      const authorizationStore = useAuthorizationStore()
      authorizationStore.requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        throw new Error('Brak danych grafiku do usunięcia.')
      }

      if (!canPublishSchedule({
        employeePermissions: authorizationStore.permissions,
        isOwner: authorizationStore.isOwner,
        isFirebaseEmployee: authorizationStore.isFirebaseEmployee
      })) {
        throw new Error('Nie masz uprawnienia do usuwania grafiku.')
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

      if (!canDeleteUnpublishedSchedule(scheduleSnapshot.data())) {
        throw new Error(
          'Można usunąć tylko gotowy, nieopublikowany grafik.'
        )
      }

      const scheduleData = scheduleSnapshot.data()
      const scheduleDateKeys = getDateKeysInRange(
        scheduleData.dateFrom,
        scheduleData.dateTo
      )

      const daysQuery = query(
        collection(db, 'users', restaurantId, 'grafik_dni'),
        where('scheduleId', '==', scheduleId)
      )
      const updatesQuery = query(
        collection(db, 'users', restaurantId, 'grafik_aktualizacje'),
        where('scheduleId', '==', scheduleId)
      )
      const publicDaysQuery = query(
        collection(
          db,
          'users',
          restaurantId,
          'grafik_opublikowane_dni'
        ),
        where('scheduleId', '==', scheduleId)
      )
      const [
        daysSnapshot,
        updatesSnapshot,
        publicDaysSnapshot
      ] = await Promise.all([
        getDocs(daysQuery),
        getDocs(updatesQuery),
        getDocs(publicDaysQuery)
      ])
      const ownedDocuments = [
        ...daysSnapshot.docs.map(snapshot => ({
          ref: snapshot.ref,
          type: 'day'
        })),
        ...updatesSnapshot.docs.map(snapshot => ({
          ref: snapshot.ref,
          type: 'update'
        }))
      ]
      const publicScheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki_opublikowane',
        scheduleId
      )
      const publicDayRefsById = new Map(
        scheduleDateKeys.map(dateKey => [
          dateKey,
          doc(
            db,
            'users',
            restaurantId,
            'grafik_opublikowane_dni',
            getScheduleDayDocumentId(dateKey)
          )
        ])
      )

      publicDaysSnapshot.docs.forEach(publicDaySnapshot => {
        publicDayRefsById.set(
          publicDaySnapshot.id,
          publicDaySnapshot.ref
        )
      })

      const publicDayRefs = [...publicDayRefsById.values()]
      const knownDeleteWritesCount =
        ownedDocuments.length + publicDaysSnapshot.docs.length + 2

      if (knownDeleteWritesCount > FIRESTORE_ATOMIC_WRITE_LIMIT) {
        throw new Error(
          'Grafik zawiera zbyt wiele dokumentów, aby usunąć go atomowo.'
        )
      }

      await runTransaction(db, async transaction => {
        const deletionSnapshots = await Promise.all([
          transaction.get(scheduleRef),
          ...ownedDocuments.map(document => (
            transaction.get(document.ref)
          )),
          transaction.get(publicScheduleRef),
          ...publicDayRefs.map(publicDayRef => (
            transaction.get(publicDayRef)
          ))
        ])
        const currentScheduleSnapshot = deletionSnapshots[0]
        const ownedSnapshots = deletionSnapshots.slice(
          1,
          1 + ownedDocuments.length
        )
        const publicScheduleSnapshot = deletionSnapshots[
          1 + ownedDocuments.length
        ]
        const publicDaySnapshots = deletionSnapshots.slice(
          2 + ownedDocuments.length
        )

        if (!currentScheduleSnapshot.exists()) return

        if (!canDeleteUnpublishedSchedule(currentScheduleSnapshot.data())) {
          throw new Error(
            'Można usunąć tylko gotowy, nieopublikowany grafik.'
          )
        }

        const existingPublicHeader = publicScheduleSnapshot.exists()
          ? publicScheduleSnapshot.data()
          : null
        const existingPublicDays = publicDaySnapshots
          .filter(snapshot => snapshot.exists())
          .map(snapshot => ({
            id: snapshot.id,
            ...snapshot.data()
          }))

        assertPublicProjectionOwnership({
          scheduleId,
          publicHeader: existingPublicHeader,
          publicDays: existingPublicDays
        })

        prepareScheduleDeletion({
          schedule: {
            id: currentScheduleSnapshot.id,
            ...currentScheduleSnapshot.data()
          },
          days: ownedSnapshots
            .map((snapshot, index) => ({ snapshot, index }))
            .filter(({ snapshot, index }) => (
              snapshot.exists() &&
              ownedDocuments[index].type === 'day'
            ))
            .map(({ snapshot }) => ({
              id: snapshot.id,
              ...snapshot.data()
            })),
          updates: ownedSnapshots
            .map((snapshot, index) => ({ snapshot, index }))
            .filter(({ snapshot, index }) => (
              snapshot.exists() &&
              ownedDocuments[index].type === 'update'
            ))
            .map(({ snapshot }) => ({
              id: snapshot.id,
              ...snapshot.data()
            })),
          publicHeader: existingPublicHeader,
          publicDays: existingPublicDays
        })

        ownedSnapshots.forEach((ownedSnapshot, index) => {
          if (!ownedSnapshot.exists()) return

          const ownedDocument = ownedDocuments[index]
          const ownedData = ownedSnapshot.data()

          if (ownedDocument.type === 'day') {
            assertScheduleDayBelongsToSchedule(ownedData, scheduleId)
          } else if (ownedData.scheduleId !== scheduleId) {
            throw new Error(
              'Dane aktualizacji nie należą do tego grafiku.'
            )
          }

          transaction.delete(ownedSnapshot.ref)
        })
        publicDaySnapshots.forEach(publicDaySnapshot => {
          if (publicDaySnapshot.exists()) {
            transaction.delete(publicDaySnapshot.ref)
          }
        })

        if (publicScheduleSnapshot.exists()) {
          transaction.delete(publicScheduleRef)
        }

        transaction.delete(scheduleRef)
      })

      schedules.value = schedules.value.filter(
        schedule => schedule.id !== scheduleId
      )

      if (currentSchedule.value?.id === scheduleId) {
        currentSchedule.value = null
        currentDays.value = []
        currentPlanningContext.value = null
        planningEmployees.value = []
        planningPositions.value = []
        planningEmploymentProfiles.value = []
        planningGeneratorSettings.value = {}
        availabilityEntries.value = []
      }

      return true
    }

    const fetchSchedule = async scheduleId => {
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        currentSchedule.value = null
        currentPlanningContext.value = null
        return null
      }

      if (currentSchedule.value?.id !== scheduleId) {
        currentPlanningContext.value = null
        planningEmployees.value = []
        planningPositions.value = []
        planningEmploymentProfiles.value = []
        planningGeneratorSettings.value = {}
        availabilityEntries.value = []
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

    const publishSchedule = async ({
      scheduleId,
      publishUntil,
      expectedSchedule,
      expectedDayRevisions
    }) => {
      const authorizationStore = useAuthorizationStore()
      authorizationStore.requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        throw new Error('Brak danych grafiku do publikacji.')
      }

      const auth = getAuth()
      const hasEmployeeSession = authorizationStore.isEmployee

      if (!canPublishSchedule({
        employeePermissions: authorizationStore.permissions,
        isOwner: authorizationStore.isOwner,
        isFirebaseEmployee: authorizationStore.isFirebaseEmployee
      })) {
        throw new Error(
          'Nie masz uprawnienia do publikowania grafiku.'
        )
      }

      const expectedHeader = {
        ...(expectedSchedule || {}),
        id: scheduleId,
        publishedUntil:
          expectedSchedule?.publishedUntil ?? null,
        publishedRevision:
          Number(expectedSchedule?.publishedRevision) || 0
      }
      const dateKeys = getPublicationDateKeys({
        schedule: expectedHeader,
        publishUntil
      })
      assertAtomicPublicationSize(dateKeys.length)
      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      const dayRefs = dateKeys.map(dateKey => doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        getScheduleDayDocumentId(dateKey)
      ))
      const publicScheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki_opublikowane',
        scheduleId
      )
      const publicDayRefs = dateKeys.map(dateKey => doc(
        db,
        'users',
        restaurantId,
        'grafik_opublikowane_dni',
        getScheduleDayDocumentId(dateKey)
      ))
      const performer = {
        employeeId:
          authorizationStore.employeeId || null,
        authUid: hasEmployeeSession
          ? null
          : auth.currentUser?.uid || null
      }

      const result = await runTransaction(
        db,
        async transaction => {
          const publicationSnapshots = await Promise.all([
            transaction.get(scheduleRef),
            transaction.get(publicScheduleRef),
            ...dayRefs.map(dayRef => transaction.get(dayRef)),
            ...publicDayRefs.map(dayRef => transaction.get(dayRef))
          ])
          const scheduleSnapshot = publicationSnapshots[0]
          const publicScheduleSnapshot = publicationSnapshots[1]
          const daySnapshots = publicationSnapshots.slice(
            2,
            2 + dayRefs.length
          )
          const publicDaySnapshots = publicationSnapshots.slice(
            2 + dayRefs.length
          )

          if (!scheduleSnapshot.exists()) {
            throw new Error('Nie znaleziono nagłówka grafiku.')
          }

          const scheduleData = scheduleSnapshot.data()

          if (
            scheduleData.dateFrom !== expectedHeader.dateFrom ||
            scheduleData.dateTo !== expectedHeader.dateTo
          ) {
            throw new Error(
              'Zakres grafiku zmienił się. Odśwież widok.'
            )
          }

          const existingDays = daySnapshots
            .filter(daySnapshot => daySnapshot.exists())
            .map(daySnapshot => ({
              id: daySnapshot.id,
              ...daySnapshot.data()
            }))
          const prepared = prepareSchedulePublication({
            schedule: {
              id: scheduleSnapshot.id,
              ...scheduleData
            },
            publishUntil,
            days: existingDays,
            expectedPublicationStatus:
              expectedHeader.publicationStatus,
            expectedPublishedUntil:
              expectedHeader.publishedUntil || null,
            expectedPublishedRevision:
              Number(expectedHeader.publishedRevision) || 0,
            expectedDayRevisions
          })
          const preparedDaysByDate = new Map(
            prepared.days.map(day => [day.date, day])
          )
          const publishedAt = serverTimestamp()
          const isFirstPublication =
            scheduleData.publicationStatus === 'unpublished'
          const headerUpdate = {
            ...prepared.header,
            lastPublishedAt: publishedAt,
            lastPublishedByEmployeeId: performer.employeeId,
            lastPublishedByAuthUid: performer.authUid,
            updatedAt: publishedAt
          }

          if (isFirstPublication) {
            headerUpdate.publishedAt = publishedAt
            headerUpdate.publishedByEmployeeId = performer.employeeId
            headerUpdate.publishedByAuthUid = performer.authUid
          }

          const publicProjection = preparePublicScheduleProjection({
            previousSchedule: {
              id: scheduleSnapshot.id,
              ...scheduleData
            },
            publishedSchedule: {
              id: scheduleSnapshot.id,
              ...scheduleData,
              ...headerUpdate
            },
            publishedDays: prepared.days,
            existingHeader: publicScheduleSnapshot.exists()
              ? {
                  id: publicScheduleSnapshot.id,
                  ...publicScheduleSnapshot.data()
                }
              : null,
            existingDays: publicDaySnapshots
              .filter(snapshot => snapshot.exists())
              .map(snapshot => ({
                id: snapshot.id,
                ...snapshot.data()
              })),
            publishedAt,
            updatedAt: publishedAt
          })
          const publicDayRefsByDate = new Map(
            publicDayRefs.map((publicDayRef, index) => [
              dateKeys[index],
              publicDayRef
            ])
          )

          daySnapshots.forEach(daySnapshot => {
            if (!daySnapshot.exists()) return

            const publishedDay = preparedDaysByDate.get(
              daySnapshot.id
            )

            transaction.update(daySnapshot.ref, {
              publishedShifts: publishedDay.publishedShifts,
              publishedRevision: publishedDay.publishedRevision,
              hasUnpublishedChanges: false,
              updatedAt: publishedAt
            })
          })
          publicProjection.daysToCreate.forEach(publicDay => {
            transaction.set(
              publicDayRefsByDate.get(publicDay.date),
              publicDay
            )
          })
          transaction.update(scheduleRef, headerUpdate)
          transaction.set(publicScheduleRef, publicProjection.header)

          return {
            schedule: {
              ...scheduleData,
              id: scheduleSnapshot.id,
              ...headerUpdate
            },
            days: prepared.days,
            publicProjection,
            publishedUntil: publishUntil
          }
        }
      )

      result.days.forEach(publishedDay => {
        const dayIndex = currentDays.value.findIndex(
          day => day.id === publishedDay.id
        )

        if (dayIndex !== -1) {
          currentDays.value[dayIndex] = publishedDay
        }
      })

      if (currentSchedule.value?.id === result.schedule.id) {
        currentSchedule.value = result.schedule
      }

      const scheduleIndex = schedules.value.findIndex(
        schedule => schedule.id === result.schedule.id
      )

      if (scheduleIndex !== -1) {
        schedules.value[scheduleIndex] = result.schedule
      }

      return result
    }

    const unpublishSchedule = async ({
      scheduleId,
      expectedSchedule = null
    } = {}) => {
      const authorizationStore = useAuthorizationStore()
      authorizationStore.requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId || !scheduleId) {
        throw new Error('Brak danych grafiku do wycofania publikacji.')
      }

      const auth = getAuth()
      const hasEmployeeSession = authorizationStore.isEmployee

      if (!canUnpublishSchedule({
        employeePermissions: authorizationStore.permissions,
        isOwner: authorizationStore.isOwner,
        isFirebaseEmployee: authorizationStore.isFirebaseEmployee
      })) {
        throw new Error(
          'Nie masz uprawnienia do wycofania publikacji grafiku.'
        )
      }

      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      let expectedHeader = expectedSchedule

      if (
        !expectedHeader?.dateFrom ||
        !expectedHeader?.dateTo ||
        !expectedHeader?.publicationStatus
      ) {
        const scheduleSnapshot = await getDoc(scheduleRef)

        if (!scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono nagłówka grafiku.')
        }

        expectedHeader = {
          id: scheduleSnapshot.id,
          ...scheduleSnapshot.data()
        }
      }

      expectedHeader = {
        ...expectedHeader,
        id: scheduleId,
        publishedUntil: expectedHeader.publishedUntil ?? null,
        publishedRevision:
          Number(expectedHeader.publishedRevision) || 0
      }

      const dateKeys = getUnpublicationDateKeys(expectedHeader)
      assertAtomicUnpublicationSize(dateKeys.length)
      const dayRefs = dateKeys.map(dateKey => doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        getScheduleDayDocumentId(dateKey)
      ))
      const publicScheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki_opublikowane',
        scheduleId
      )
      const publicDayRefs = dateKeys.map(dateKey => doc(
        db,
        'users',
        restaurantId,
        'grafik_opublikowane_dni',
        getScheduleDayDocumentId(dateKey)
      ))

      const result = await runTransaction(db, async transaction => {
        const withdrawalSnapshots = await Promise.all([
          transaction.get(scheduleRef),
          ...dayRefs.map(dayRef => transaction.get(dayRef)),
          transaction.get(publicScheduleRef),
          ...publicDayRefs.map(publicDayRef => (
            transaction.get(publicDayRef)
          ))
        ])
        const scheduleSnapshot = withdrawalSnapshots[0]
        const daySnapshots = withdrawalSnapshots.slice(
          1,
          1 + dayRefs.length
        )
        const publicScheduleSnapshot = withdrawalSnapshots[
          1 + dayRefs.length
        ]
        const publicDaySnapshots = withdrawalSnapshots.slice(
          2 + dayRefs.length
        )

        if (!scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono nagłówka grafiku.')
        }

        const scheduleData = scheduleSnapshot.data()

        if (
          scheduleData.dateFrom !== expectedHeader.dateFrom ||
          scheduleData.dateTo !== expectedHeader.dateTo
        ) {
          throw new Error(
            'Zakres grafiku zmienił się. Odśwież widok.'
          )
        }

        const existingDays = daySnapshots
          .filter(daySnapshot => daySnapshot.exists())
          .map(daySnapshot => ({
            id: daySnapshot.id,
            ...daySnapshot.data()
          }))
        const existingPublicHeader = publicScheduleSnapshot.exists()
          ? {
              id: publicScheduleSnapshot.id,
              ...publicScheduleSnapshot.data()
            }
          : null
        const existingPublicDays = publicDaySnapshots
          .filter(snapshot => snapshot.exists())
          .map(snapshot => ({
            id: snapshot.id,
            ...snapshot.data()
          }))
        const prepared = prepareScheduleUnpublication({
          schedule: {
            id: scheduleSnapshot.id,
            ...scheduleData
          },
          days: existingDays,
          publicHeader: existingPublicHeader,
          publicDays: existingPublicDays,
          expectedPublicationStatus:
            expectedHeader.publicationStatus,
          expectedPublishedUntil:
            expectedHeader.publishedUntil,
          expectedPublishedRevision:
            expectedHeader.publishedRevision
        })
        const resetDaysByDate = new Map(
          prepared.days.map(day => [day.date, day])
        )
        const publicDaySnapshotsByDate = new Map(
          publicDaySnapshots.map(snapshot => [
            snapshot.id,
            snapshot
          ])
        )
        const updatedAt = serverTimestamp()
        const headerUpdate = {
          ...prepared.header,
          updatedAt
        }

        daySnapshots.forEach(daySnapshot => {
          const resetDay = resetDaysByDate.get(daySnapshot.id)

          transaction.update(daySnapshot.ref, {
            publishedShifts: resetDay.publishedShifts,
            publishedRevision: resetDay.publishedRevision,
            hasUnpublishedChanges: false,
            updatedAt
          })
        })
        prepared.publicDayDateKeysToDelete.forEach(dateKey => {
          transaction.delete(
            publicDaySnapshotsByDate.get(dateKey).ref
          )
        })

        if (prepared.publicHeaderShouldDelete) {
          transaction.delete(publicScheduleRef)
        }

        transaction.update(scheduleRef, headerUpdate)

        return {
          schedule: {
            ...scheduleData,
            id: scheduleSnapshot.id,
            ...headerUpdate
          },
          days: prepared.days
        }
      })

      result.days.forEach(resetDay => {
        const dayIndex = currentDays.value.findIndex(
          day => day.id === resetDay.id
        )

        if (dayIndex !== -1) {
          currentDays.value[dayIndex] = resetDay
        }
      })

      if (currentSchedule.value?.id === result.schedule.id) {
        currentSchedule.value = result.schedule
      }

      const scheduleIndex = schedules.value.findIndex(
        schedule => schedule.id === result.schedule.id
      )

      if (scheduleIndex !== -1) {
        schedules.value[scheduleIndex] = result.schedule
      }

      return result
    }

    const fetchPlanningContext = async scheduleId => {
      const restaurantId = await getRestaurantId()

      currentPlanningContext.value = null
      planningEmployees.value = []
      planningPositions.value = []
      planningEmploymentProfiles.value = []
      planningGeneratorSettings.value = {}
      availabilityEntries.value = []

      if (!restaurantId || !scheduleId) {
        return null
      }

      const planningContextQuery = query(
        collection(
          db,
          'users',
          restaurantId,
          PLANNING_CONTEXT_COLLECTION
        ),
        where('scheduleId', '==', scheduleId)
      )
      const snapshot = await getDocs(planningContextQuery)
      const planningContext = hydratePlanningContext(
        snapshot.docs.map(documentSnapshot => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        }))
      )

      currentPlanningContext.value = planningContext
      planningEmployees.value = planningContext.employees
      planningPositions.value = planningContext.positions
      planningEmploymentProfiles.value =
        planningContext.employmentProfiles
      planningGeneratorSettings.value =
        planningContext.generatorSettings
      availabilityEntries.value = planningContext.availabilityEntries

      return planningContext
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!scheduleId || !dayId || !shiftId) {
        throw new Error('Brak danych zmiany do zapisania.')
      }

      const scheduleDayId = getScheduleDayDocumentId(dayId)

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
        scheduleDayId
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

        assertScheduleDayBelongsToSchedule(dayData, scheduleId)

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

          return nextEmployeeId
            ? assignShiftManually(shift, {
                employeeId: nextEmployeeId,
                employeeNameSnapshot: normalizedEmployeeName,
                decision,
                warnings: normalizedWarnings
              })
            : clearRegularVacancyAssignment(shift)
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
        const publicationState = getWorkingEditPublicationState({
          day: dayData,
          schedule: scheduleData
        })
        const nextDay = {
          ...dayData,
          id: daySnapshot.id,
          workingShifts: nextShifts,
          employeeIds,
          workingRevision:
            (Number(dayData.workingRevision) || 0) + 1,
          hasUnpublishedChanges:
            publicationState.dayHasUnpublishedChanges
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
          hasUnpublishedChanges:
            publicationState.scheduleHasUnpublishedChanges
        }

        transaction.update(dayRef, {
          workingShifts: nextShifts,
          employeeIds,
          workingRevision: nextDay.workingRevision,
          hasUnpublishedChanges:
            publicationState.dayHasUnpublishedChanges,
          updatedAt: serverTimestamp()
        })

        transaction.update(scheduleRef, {
          assignedCount: nextAssignedCount,
          unfilledCount: nextSchedule.unfilledCount,
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges:
            publicationState.scheduleHasUnpublishedChanges,
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
      positionColorSnapshot,
      from,
      to,
      decision = null,
      warnings = []
    }) => {
      useAuthorizationStore().requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!scheduleId || !dayId || !employeeId || !from || !to) {
        throw new Error('Brak danych zmiany dodatkowej.')
      }

      const scheduleDayId = getScheduleDayDocumentId(dayId)

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
        scheduleDayId
      )

      const result = await runTransaction(db, async transaction => {
        const daySnapshot = await transaction.get(dayRef)
        const scheduleSnapshot = await transaction.get(scheduleRef)

        if (!daySnapshot.exists() || !scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono grafiku lub wybranego dnia.')
        }

        const dayData = daySnapshot.data()
        const scheduleData = scheduleSnapshot.data()

        assertScheduleDayBelongsToSchedule(dayData, scheduleId)

        const workingShifts = Array.isArray(dayData.workingShifts)
          ? dayData.workingShifts
          : []
        const normalizedPositionId = positionId || null
        const extraShiftData = {
          id: extraShiftId,
          shiftGroupId: null,
          positionId: normalizedPositionId,
          positionNameSnapshot:
            positionNameSnapshot || 'Bez stanowiska',
          from,
          to,
          employeeId,
          employeeNameSnapshot: normalizedEmployeeName,
          decision,
          warnings: normalizedWarnings
        }

        if (normalizedPositionId) {
          extraShiftData.positionColorSnapshot =
            normalizeSchedulePositionColor(positionColorSnapshot)
        }

        const extraShift = createManualExtraShift(extraShiftData)
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
        const publicationState = getWorkingEditPublicationState({
          day: dayData,
          schedule: scheduleData
        })
        const nextDay = {
          ...dayData,
          id: daySnapshot.id,
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision:
            (Number(dayData.workingRevision) || 0) + 1,
          hasUnpublishedChanges:
            publicationState.dayHasUnpublishedChanges
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
          hasUnpublishedChanges:
            publicationState.scheduleHasUnpublishedChanges
        }

        transaction.update(dayRef, {
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision: nextDay.workingRevision,
          hasUnpublishedChanges:
            publicationState.dayHasUnpublishedChanges,
          updatedAt: serverTimestamp()
        })

        transaction.update(scheduleRef, {
          extraShiftsCount: nextSchedule.extraShiftsCount,
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges:
            publicationState.scheduleHasUnpublishedChanges,
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
      useAuthorizationStore().requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!scheduleId || !dayId || !shiftId) {
        throw new Error('Brak danych zmiany dodatkowej do usunięcia.')
      }

      const scheduleDayId = getScheduleDayDocumentId(dayId)

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
        scheduleDayId
      )

      const result = await runTransaction(db, async transaction => {
        const daySnapshot = await transaction.get(dayRef)
        const scheduleSnapshot = await transaction.get(scheduleRef)

        if (!daySnapshot.exists() || !scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono grafiku lub wybranego dnia.')
        }

        const dayData = daySnapshot.data()
        const scheduleData = scheduleSnapshot.data()

        assertScheduleDayBelongsToSchedule(dayData, scheduleId)

        const workingShifts = Array.isArray(dayData.workingShifts)
          ? dayData.workingShifts
          : []
        const removedShift = workingShifts.find(
          shift => shift.id === shiftId
        )

        if (!removedShift || !isExtraShift(removedShift)) {
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
        const publicationState = getWorkingEditPublicationState({
          day: dayData,
          schedule: scheduleData
        })
        const nextDay = {
          ...dayData,
          id: daySnapshot.id,
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision:
            (Number(dayData.workingRevision) || 0) + 1,
          hasUnpublishedChanges:
            publicationState.dayHasUnpublishedChanges
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
          hasUnpublishedChanges:
            publicationState.scheduleHasUnpublishedChanges
        }

        transaction.update(dayRef, {
          workingShifts: nextShifts,
          employeeIds,
          positionIds,
          workingRevision: nextDay.workingRevision,
          hasUnpublishedChanges:
            publicationState.dayHasUnpublishedChanges,
          updatedAt: serverTimestamp()
        })

        transaction.update(scheduleRef, {
          extraShiftsCount: nextSchedule.extraShiftsCount,
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges:
            publicationState.scheduleHasUnpublishedChanges,
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

    const updateWorkingShiftAssessments = async ({
      scheduleId,
      assessments
    }) => {
      useAuthorizationStore().requirePermission('can_manage_schedule')
      const restaurantId = await getRestaurantId()

      if (!restaurantId) {
        throw new Error('Nie udało się rozpoznać restauracji.')
      }

      if (!scheduleId) {
        throw new Error('Brak grafiku do aktualizacji ostrzeżeń.')
      }

      const assessmentsByDay = new Map()
      const normalizedAssessments = Array.isArray(assessments)
        ? assessments
        : []

      normalizedAssessments.forEach(assessment => {
        const rawDayId = String(assessment?.dayId || '').trim()
        const shiftId = String(assessment?.shiftId || '').trim()
        const employeeId = String(
          assessment?.employeeId || ''
        ).trim()

        if (!rawDayId || !shiftId || !employeeId) return

        const dayId = getScheduleDayDocumentId(rawDayId)

        if (!assessmentsByDay.has(dayId)) {
          assessmentsByDay.set(dayId, new Map())
        }

        assessmentsByDay.get(dayId).set(shiftId, {
          employeeId,
          warnings: [...new Set(
            (Array.isArray(assessment.warnings)
              ? assessment.warnings
              : [])
              .filter(Boolean)
              .map(String)
          )]
        })
      })

      if (!assessmentsByDay.size) {
        return { days: [], schedule: currentSchedule.value }
      }

      const scheduleRef = doc(
        db,
        'users',
        restaurantId,
        'grafiki',
        scheduleId
      )
      const dayEntries = [...assessmentsByDay.entries()]
      const dayRefs = dayEntries.map(([dayId]) => doc(
        db,
        'users',
        restaurantId,
        'grafik_dni',
        dayId
      ))

      const result = await runTransaction(db, async transaction => {
        const scheduleSnapshot = await transaction.get(scheduleRef)
        const daySnapshots = []

        for (const dayRef of dayRefs) {
          daySnapshots.push(await transaction.get(dayRef))
        }

        if (!scheduleSnapshot.exists()) {
          throw new Error('Nie znaleziono nagłówka grafiku.')
        }

        const scheduleData = scheduleSnapshot.data()
        const changedDays = []
        let changedPublishedDay = false

        daySnapshots.forEach((daySnapshot, dayIndex) => {
          if (!daySnapshot.exists()) return

          const dayData = daySnapshot.data()
          const dayAssessments = dayEntries[dayIndex][1]

          assertScheduleDayBelongsToSchedule(dayData, scheduleId)

          let changed = false
          const nextShifts = (
            Array.isArray(dayData.workingShifts)
              ? dayData.workingShifts
              : []
          ).map(shift => {
            const assessment = dayAssessments.get(shift.id)

            if (
              !assessment ||
              shift.employeeId !== assessment.employeeId
            ) {
              return shift
            }

            const currentWarnings = Array.isArray(shift.warnings)
              ? shift.warnings.map(String)
              : []
            const nextWarnings = assessment.warnings
            const warningsChanged =
              currentWarnings.length !== nextWarnings.length ||
              currentWarnings.some(
                (warning, index) => warning !== nextWarnings[index]
              )

            if (!warningsChanged) {
              return shift
            }

            changed = true
            return replaceShiftWarnings(shift, nextWarnings)
          })

          if (!changed) return

          const publicationState = getWorkingEditPublicationState({
            day: dayData,
            schedule: scheduleData
          })
          changedPublishedDay =
            changedPublishedDay ||
            publicationState.dayHasUnpublishedChanges

          const nextDay = {
            ...dayData,
            id: daySnapshot.id,
            workingShifts: nextShifts,
            workingRevision:
              (Number(dayData.workingRevision) || 0) + 1,
            hasUnpublishedChanges:
              publicationState.dayHasUnpublishedChanges
          }

          transaction.update(daySnapshot.ref, {
            workingShifts: nextShifts,
            workingRevision: nextDay.workingRevision,
            hasUnpublishedChanges:
              publicationState.dayHasUnpublishedChanges,
            updatedAt: serverTimestamp()
          })
          changedDays.push(nextDay)
        })

        if (!changedDays.length) {
          return {
            days: [],
            schedule: {
              ...scheduleData,
              id: scheduleSnapshot.id
            }
          }
        }

        const nextSchedule = {
          ...scheduleData,
          id: scheduleSnapshot.id,
          workingRevision:
            (Number(scheduleData.workingRevision) || 0) + 1,
          hasUnpublishedChanges:
            scheduleData.hasUnpublishedChanges === true ||
            changedPublishedDay
        }

        transaction.update(scheduleRef, {
          workingRevision: nextSchedule.workingRevision,
          hasUnpublishedChanges:
            nextSchedule.hasUnpublishedChanges,
          updatedAt: serverTimestamp()
        })

        return { days: changedDays, schedule: nextSchedule }
      })

      result.days.forEach(updatedDay => {
        const dayIndex = currentDays.value.findIndex(
          day => day.id === updatedDay.id
        )

        if (dayIndex !== -1) {
          currentDays.value[dayIndex] = updatedDay
        }
      })

      if (currentSchedule.value?.id === result.schedule?.id) {
        currentSchedule.value = result.schedule
      }

      return result
    }

    return {
      schedules,
      currentSchedule,
      currentDays,
      currentPlanningContext,
      planningEmployees,
      planningPositions,
      planningEmploymentProfiles,
      planningGeneratorSettings,
      availabilityEntries,
      isLoading,
      isCreating,
      getCreationSafety,
      createSchedule,
      fetchSchedules,
      deleteSchedule,
      fetchSchedule,
      fetchScheduleDays,
      publishSchedule,
      unpublishSchedule,
      fetchPlanningContext,
      updateWorkingShift,
      addExtraShift,
      removeExtraShift,
      updateWorkingShiftAssessments
    }
  }
)
