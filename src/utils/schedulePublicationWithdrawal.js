import {
  getDateKeysInRange,
  isValidDateKey,
  isValidDateRange
} from './scheduleCreationValidation.js'
import {
  PUBLICATION_STATUSES,
  canPublishSchedule
} from './schedulePublication.js'
import {
  FIRESTORE_ATOMIC_WRITE_LIMIT,
  canDeleteUnpublishedSchedule
} from './scheduleStructure.js'

const getDayDateKey = day => String(
  day?.date || day?.id || ''
).trim()

export const canUnpublishSchedule = options => (
  canPublishSchedule(options)
)

export const getUnpublicationDateKeys = schedule => {
  const dateFrom = String(schedule?.dateFrom || '').trim()
  const dateTo = String(schedule?.dateTo || '').trim()
  const publishedUntil = String(
    schedule?.publishedUntil || ''
  ).trim()

  if (!isValidDateRange(dateFrom, dateTo)) {
    throw new Error('Zakres grafiku jest nieprawidłowy.')
  }

  if (
    schedule?.publicationStatus !==
      PUBLICATION_STATUSES.PARTIALLY_PUBLISHED &&
    schedule?.publicationStatus !== PUBLICATION_STATUSES.PUBLISHED
  ) {
    throw new Error(
      'Wycofać można tylko częściowo lub całkowicie opublikowany grafik.'
    )
  }

  if (
    !isValidDateKey(publishedUntil) ||
    publishedUntil < dateFrom ||
    publishedUntil > dateTo
  ) {
    throw new Error('Zapisany zakres publikacji jest niespójny.')
  }

  if (
    schedule.publicationStatus === PUBLICATION_STATUSES.PUBLISHED &&
    publishedUntil !== dateTo
  ) {
    throw new Error('Pełna publikacja ma niespójny zakres.')
  }

  return getDateKeysInRange(dateFrom, publishedUntil)
}

export const assertAtomicUnpublicationSize = daysCount => {
  const normalizedDaysCount = Number(daysCount)

  if (
    !Number.isInteger(normalizedDaysCount) ||
    normalizedDaysCount < 1
  ) {
    throw new Error(
      'Wycofanie musi obejmować co najmniej jeden opublikowany dzień.'
    )
  }

  const writesCount = (normalizedDaysCount * 2) + 2

  if (writesCount > FIRESTORE_ATOMIC_WRITE_LIMIT) {
    throw new Error(
      'Zakres publikacji jest zbyt długi, aby wycofać go atomowo.'
    )
  }

  return writesCount
}

export const assertPublicProjectionOwnership = ({
  scheduleId,
  publicHeader = null,
  publicDays = []
} = {}) => {
  const normalizedScheduleId = String(scheduleId || '').trim()

  if (!normalizedScheduleId) {
    throw new Error('Brak identyfikatora grafiku.')
  }

  if (
    publicHeader &&
    publicHeader.scheduleId !== normalizedScheduleId
  ) {
    throw new Error(
      'Publiczny nagłówek należy do innego grafiku.'
    )
  }

  ;(Array.isArray(publicDays) ? publicDays : []).forEach(day => {
    if (!day) return

    if (day.scheduleId !== normalizedScheduleId) {
      throw new Error(
        `Publiczny dzień ${getDayDateKey(day)} należy do innego grafiku.`
      )
    }
  })

  return true
}

export const prepareScheduleUnpublication = ({
  schedule,
  days = [],
  publicHeader = null,
  publicDays = [],
  expectedPublicationStatus,
  expectedPublishedUntil,
  expectedPublishedRevision
} = {}) => {
  const dateKeys = getUnpublicationDateKeys(schedule)
  const writesCount = assertAtomicUnpublicationSize(dateKeys.length)

  if (
    expectedPublicationStatus !== undefined &&
    schedule?.publicationStatus !== expectedPublicationStatus
  ) {
    throw new Error(
      'Stan publikacji zmienił się na innym urządzeniu. Odśwież grafik.'
    )
  }

  if (
    expectedPublishedUntil !== undefined &&
    (schedule?.publishedUntil || null) !== expectedPublishedUntil
  ) {
    throw new Error(
      'Zakres publikacji zmienił się na innym urządzeniu. Odśwież grafik.'
    )
  }

  if (
    expectedPublishedRevision !== undefined &&
    (Number(schedule?.publishedRevision) || 0) !==
      Number(expectedPublishedRevision)
  ) {
    throw new Error(
      'Grafik został zmieniony na innym urządzeniu. Odśwież widok.'
    )
  }

  const daysByDate = new Map(
    (Array.isArray(days) ? days : []).map(day => [
      getDayDateKey(day),
      day
    ])
  )
  const resetDays = dateKeys.map(dateKey => {
    const day = daysByDate.get(dateKey)

    if (!day) {
      throw new Error(
        `Brakuje wewnętrznego dnia ${dateKey}. Wycofanie zostało anulowane.`
      )
    }

    if (day.scheduleId !== schedule?.id) {
      throw new Error(`Dzień ${dateKey} nie należy do tego grafiku.`)
    }

    return {
      ...day,
      publishedShifts: [],
      publishedRevision: 0,
      hasUnpublishedChanges: false
    }
  })

  assertPublicProjectionOwnership({
    scheduleId: schedule?.id,
    publicHeader,
    publicDays
  })

  const publicDaysByDate = new Map(
    (Array.isArray(publicDays) ? publicDays : [])
      .filter(Boolean)
      .map(day => [getDayDateKey(day), day])
  )

  return {
    dateKeys,
    days: resetDays,
    publicHeaderShouldDelete: Boolean(publicHeader),
    publicDayDateKeysToDelete: dateKeys.filter(
      dateKey => publicDaysByDate.has(dateKey)
    ),
    header: {
      publicationStatus: PUBLICATION_STATUSES.UNPUBLISHED,
      publishedUntil: null,
      publishedDaysCount: 0,
      publishedRevision: 0,
      publishedAt: null,
      lastPublishedAt: null,
      publishedByEmployeeId: null,
      publishedByAuthUid: null,
      lastPublishedByEmployeeId: null,
      lastPublishedByAuthUid: null,
      hasUnpublishedChanges: false
    },
    writesCount
  }
}

export const prepareScheduleDeletion = ({
  schedule,
  scheduleId = schedule?.id,
  days = [],
  updates = [],
  publicHeader = null,
  publicDays = []
} = {}) => {
  const normalizedScheduleId = String(scheduleId || '').trim()

  if (!canDeleteUnpublishedSchedule(schedule)) {
    throw new Error(
      'Można usunąć tylko gotowy, nieopublikowany grafik.'
    )
  }

  const normalizedDays = Array.isArray(days) ? days : []
  const normalizedUpdates = Array.isArray(updates) ? updates : []
  const normalizedPublicDays = Array.isArray(publicDays)
    ? publicDays
    : []

  normalizedDays.forEach(day => {
    if (day?.scheduleId !== normalizedScheduleId) {
      throw new Error('Dane dnia nie należą do tego grafiku.')
    }
  })
  normalizedUpdates.forEach(update => {
    if (update?.scheduleId !== normalizedScheduleId) {
      throw new Error('Dane aktualizacji nie należą do tego grafiku.')
    }
  })
  assertPublicProjectionOwnership({
    scheduleId: normalizedScheduleId,
    publicHeader,
    publicDays: normalizedPublicDays
  })

  const writesCount =
    1 +
    normalizedDays.length +
    normalizedUpdates.length +
    normalizedPublicDays.length +
    (publicHeader ? 1 : 0)

  if (writesCount > FIRESTORE_ATOMIC_WRITE_LIMIT) {
    throw new Error(
      'Grafik zawiera zbyt wiele dokumentów, aby usunąć go atomowo.'
    )
  }

  return {
    deleteScheduleHeader: true,
    deletePublicHeader: Boolean(publicHeader),
    dayDocumentIds: normalizedDays.map(day => day.id),
    updateDocumentIds: normalizedUpdates.map(update => update.id),
    publicDayDocumentIds: normalizedPublicDays.map(day => day.id),
    writesCount
  }
}
