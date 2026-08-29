import {
  getDateKeysInRange,
  isValidDateKey,
  isValidDateRange
} from './scheduleCreationValidation.js'
import { FIRESTORE_ATOMIC_WRITE_LIMIT } from './scheduleStructure.js'

export const PUBLICATION_STATUSES = Object.freeze({
  UNPUBLISHED: 'unpublished',
  PARTIALLY_PUBLISHED: 'partially_published',
  PUBLISHED: 'published'
})

const cloneValue = value => {
  if (Array.isArray(value)) {
    return Array.from(value, child => (
      child === undefined ? null : cloneValue(child)
    ))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, cloneValue(child)])
    )
  }

  return value
}

const getDayDateKey = day => String(
  day?.date || day?.id || ''
).trim()

const getExpectedRevision = (expectedDayRevisions, dateKey) => {
  if (expectedDayRevisions instanceof Map) {
    return expectedDayRevisions.get(dateKey)
  }

  return expectedDayRevisions?.[dateKey]
}

export const canPublishSchedule = ({
  hasEmployeeSession = false,
  employeePermissions = {},
  hasAdminSession = false
} = {}) => (
  hasEmployeeSession
    ? employeePermissions?.can_manage_schedule === true
    : hasAdminSession
)

export const isScheduleDayPublished = day => (
  (Number(day?.publishedRevision) || 0) > 0
)

export const getDefaultPublicationEndDate = schedule => {
  const dateTo = String(schedule?.dateTo || '').trim()

  if (!isValidDateKey(dateTo)) return ''

  try {
    return getPublicationDateKeys({
      schedule,
      publishUntil: dateTo
    }).length > 0
      ? dateTo
      : ''
  } catch {
    return ''
  }
}

export const getWorkingEditPublicationState = ({
  day,
  schedule
} = {}) => {
  const editedDayWasPublished = isScheduleDayPublished(day)

  return {
    dayHasUnpublishedChanges: editedDayWasPublished,
    scheduleHasUnpublishedChanges:
      schedule?.hasUnpublishedChanges === true ||
      editedDayWasPublished
  }
}

export const getPublicationDateKeys = ({
  schedule,
  publishUntil
} = {}) => {
  const dateFrom = String(schedule?.dateFrom || '').trim()
  const dateTo = String(schedule?.dateTo || '').trim()
  const targetDate = String(publishUntil || '').trim()
  const status = schedule?.publicationStatus

  if (!isValidDateRange(dateFrom, dateTo)) {
    throw new Error('Zakres grafiku jest nieprawidłowy.')
  }

  if (!isValidDateKey(targetDate)) {
    throw new Error('Wybierz prawidłową datę końcową publikacji.')
  }

  if (targetDate < dateFrom || targetDate > dateTo) {
    throw new Error('Data publikacji musi należeć do zakresu grafiku.')
  }

  if (schedule?.lifecycleStatus !== 'ready') {
    throw new Error('Publikować można wyłącznie gotowy grafik.')
  }

  if (status === PUBLICATION_STATUSES.PUBLISHED) {
    throw new Error('Cały grafik jest już opublikowany.')
  }

  let firstDate = dateFrom

  if (status === PUBLICATION_STATUSES.PARTIALLY_PUBLISHED) {
    const publishedUntil = String(schedule?.publishedUntil || '').trim()

    if (
      !isValidDateKey(publishedUntil) ||
      publishedUntil < dateFrom ||
      publishedUntil >= dateTo
    ) {
      throw new Error('Zapisany zakres publikacji jest niespójny.')
    }

    if (targetDate <= publishedUntil) {
      throw new Error(
        'Rozszerzenie publikacji musi kończyć się po obecnie opublikowanej dacie.'
      )
    }

    const remainingDates = getDateKeysInRange(
      publishedUntil,
      dateTo
    )
    firstDate = remainingDates[1]
  } else if (status !== PUBLICATION_STATUSES.UNPUBLISHED) {
    throw new Error('Status publikacji grafiku jest nieprawidłowy.')
  }

  const dateKeys = getDateKeysInRange(firstDate, targetDate)

  if (!dateKeys.length) {
    throw new Error('Zakres publikacji jest pusty.')
  }

  return dateKeys
}

export const assertAtomicPublicationSize = daysCount => {
  const normalizedDaysCount = Number(daysCount)

  if (
    !Number.isInteger(normalizedDaysCount) ||
    normalizedDaysCount < 1
  ) {
    throw new Error('Publikacja musi obejmować co najmniej jeden dzień.')
  }

  const writesCount = (normalizedDaysCount * 2) + 2

  if (writesCount > FIRESTORE_ATOMIC_WRITE_LIMIT) {
    throw new Error(
      'Zakres publikacji jest zbyt długi, aby zapisać go atomowo.'
    )
  }

  return writesCount
}

export const prepareSchedulePublication = ({
  schedule,
  publishUntil,
  days,
  expectedPublicationStatus,
  expectedPublishedUntil,
  expectedPublishedRevision,
  expectedDayRevisions
} = {}) => {
  const dateKeys = getPublicationDateKeys({ schedule, publishUntil })
  assertAtomicPublicationSize(dateKeys.length)

  if (
    expectedPublicationStatus !== undefined &&
    schedule?.publicationStatus !== expectedPublicationStatus
  ) {
    throw new Error(
      'Zakres publikacji zmienił się na innym urządzeniu. Odśwież grafik.'
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
      'Grafik został opublikowany na innym urządzeniu. Odśwież widok.'
    )
  }

  const daysByDate = new Map(
    (Array.isArray(days) ? days : []).map(day => [
      getDayDateKey(day),
      day
    ])
  )
  const publishedDays = dateKeys.map(dateKey => {
    const day = daysByDate.get(dateKey)

    if (!day) {
      throw new Error(
        `Brakuje dnia ${dateKey}. Publikacja została anulowana.`
      )
    }

    if (day.scheduleId !== schedule?.id) {
      throw new Error(
        `Dzień ${dateKey} nie należy do tego grafiku.`
      )
    }

    if (getDayDateKey(day) !== dateKey) {
      throw new Error(`Dzień ${dateKey} ma nieprawidłową datę.`)
    }

    if (isScheduleDayPublished(day)) {
      throw new Error(
        `Dzień ${dateKey} został już opublikowany.`
      )
    }

    const workingRevision = Number(day.workingRevision)

    if (!Number.isInteger(workingRevision) || workingRevision < 1) {
      throw new Error(
        `Dzień ${dateKey} ma nieprawidłową rewizję roboczą.`
      )
    }

    const expectedWorkingRevision = getExpectedRevision(
      expectedDayRevisions,
      dateKey
    )

    if (
      expectedDayRevisions !== undefined &&
      Number(day.workingRevision) !== Number(expectedWorkingRevision)
    ) {
      throw new Error(
        `Dzień ${dateKey} zmienił się na innym urządzeniu. Odśwież grafik.`
      )
    }

    return {
      ...day,
      publishedShifts: cloneValue(
        Array.isArray(day.workingShifts) ? day.workingShifts : []
      ),
      publishedRevision: workingRevision,
      hasUnpublishedChanges: false
    }
  })
  const allPublishedDates = getDateKeysInRange(
    schedule.dateFrom,
    publishUntil
  )
  const publicationStatus = publishUntil === schedule.dateTo
    ? PUBLICATION_STATUSES.PUBLISHED
    : PUBLICATION_STATUSES.PARTIALLY_PUBLISHED

  return {
    dateKeys,
    days: publishedDays,
    header: {
      lifecycleStatus: 'ready',
      publicationStatus,
      publishedUntil: publishUntil,
      publishedDaysCount: allPublishedDates.length,
      publishedRevision:
        (Number(schedule.publishedRevision) || 0) + 1,
      hasUnpublishedChanges:
        schedule.hasUnpublishedChanges === true
    }
  }
}
