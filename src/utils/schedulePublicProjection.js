import { isValidDateKey } from './scheduleCreationValidation.js'
import { assertAtomicPublicationSize } from './schedulePublication.js'
import {
  normalizeSchedulePositionColor
} from './schedulePositionColors.js'

export const PUBLIC_SHIFT_TYPES = Object.freeze({
  REGULAR: 'REGULAR',
  EXTRA: 'EXTRA'
})

export const PUBLIC_SCHEDULE_HEADER_FIELDS = Object.freeze([
  'id',
  'scheduleId',
  'name',
  'dateFrom',
  'dateTo',
  'publicationStatus',
  'publishedUntil',
  'publishedDaysCount',
  'publishedRevision',
  'publishedAt',
  'lastPublishedAt',
  'schemaVersion',
  'updatedAt'
])

export const PUBLIC_SCHEDULE_DAY_FIELDS = Object.freeze([
  'id',
  'date',
  'scheduleId',
  'publishedRevision',
  'employeeIds',
  'shifts',
  'schemaVersion',
  'publishedAt',
  'updatedAt'
])

export const PUBLIC_SHIFT_FIELDS = Object.freeze([
  'id',
  'shiftGroupId',
  'employeeId',
  'employeeNameSnapshot',
  'positionId',
  'positionNameSnapshot',
  'from',
  'to',
  'shiftType',
  'positionColorSnapshot'
])

const PUBLIC_HEADER_STATE_FIELDS = Object.freeze([
  'id',
  'scheduleId',
  'name',
  'dateFrom',
  'dateTo',
  'publicationStatus',
  'publishedUntil',
  'publishedDaysCount',
  'publishedRevision',
  'schemaVersion'
])

const PUBLIC_DAY_STATE_FIELDS = Object.freeze([
  'id',
  'date',
  'scheduleId',
  'publishedRevision',
  'employeeIds',
  'shifts',
  'schemaVersion'
])

const isPlainObject = value => {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const removeUndefinedFromPublicData = value => {
  if (Array.isArray(value)) {
    return Array.from(value, child => (
      child === undefined
        ? null
        : removeUndefinedFromPublicData(child)
    ))
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [
          key,
          removeUndefinedFromPublicData(child)
        ])
    )
  }

  return value
}

const assertOnlyAllowedFields = ({ value, allowedFields, label }) => {
  if (!isPlainObject(value)) {
    throw new Error(`${label} ma nieprawidłową strukturę.`)
  }

  const allowed = new Set(allowedFields)
  const unexpectedFields = Object.keys(value).filter(
    key => !allowed.has(key)
  )

  if (unexpectedFields.length > 0) {
    throw new Error(
      `${label} zawiera niedozwolone pola: ` +
      unexpectedFields.join(', ')
    )
  }

  const missingFields = allowedFields.filter(
    key => key !== 'positionColorSnapshot' &&
      !Object.hasOwn(value, key)
  )

  if (missingFields.length > 0) {
    throw new Error(
      `${label} nie zawiera wymaganych pól: ` +
      missingFields.join(', ')
    )
  }

  return true
}

const normalizeRequiredString = (value, label) => {
  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    throw new Error(`${label} jest wymagane.`)
  }

  return normalizedValue
}

const normalizeNullableString = value => {
  const normalizedValue = String(value || '').trim()
  return normalizedValue || null
}

const pickFields = (value, fields) => Object.fromEntries(
  fields.map(field => [field, value?.[field]])
)

const valuesAreEqual = (first, second) => (
  JSON.stringify(first) === JSON.stringify(second)
)

export const getPublicShiftType = shift => (
  shift?.origin === 'MANUAL_EXTRA'
    ? PUBLIC_SHIFT_TYPES.EXTRA
    : PUBLIC_SHIFT_TYPES.REGULAR
)

export const buildPublicScheduleShift = shift => {
  const employeeId = normalizeNullableString(shift?.employeeId)

  if (!employeeId) return null

  const publicShift = {
    id: normalizeRequiredString(shift?.id, 'Identyfikator zmiany'),
    shiftGroupId: normalizeNullableString(shift?.shiftGroupId),
    employeeId,
    employeeNameSnapshot:
      normalizeNullableString(shift?.employeeNameSnapshot),
    positionId: normalizeNullableString(shift?.positionId),
    positionNameSnapshot:
      normalizeNullableString(shift?.positionNameSnapshot),
    from: normalizeRequiredString(shift?.from, 'Godzina rozpoczęcia zmiany'),
    to: normalizeRequiredString(shift?.to, 'Godzina zakończenia zmiany'),
    shiftType: getPublicShiftType(shift)
  }

  if (
    publicShift.positionId &&
    Object.hasOwn(shift || {}, 'positionColorSnapshot')
  ) {
    publicShift.positionColorSnapshot = normalizeNullableString(
      normalizeSchedulePositionColor(shift.positionColorSnapshot)
    )
  }

  const sanitizedShift = removeUndefinedFromPublicData(publicShift)
  assertOnlyAllowedFields({
    value: sanitizedShift,
    allowedFields: PUBLIC_SHIFT_FIELDS,
    label: 'Publiczna zmiana'
  })

  return sanitizedShift
}

export const buildPublicScheduleDay = ({
  day,
  publishedAt,
  updatedAt = publishedAt
} = {}) => {
  const date = normalizeRequiredString(
    day?.date || day?.id,
    'Data publicznego dnia grafiku'
  )

  if (!isValidDateKey(date)) {
    throw new Error('Data publicznego dnia grafiku jest nieprawidłowa.')
  }

  const shifts = (Array.isArray(day?.publishedShifts)
    ? day.publishedShifts
    : [])
    .map(buildPublicScheduleShift)
    .filter(Boolean)
  const employeeIds = [...new Set(
    shifts.map(shift => shift.employeeId)
  )]
  const publishedRevision = Number(day?.publishedRevision)

  if (!Number.isInteger(publishedRevision) || publishedRevision < 1) {
    throw new Error('Publiczny dzień ma nieprawidłową rewizję publikacji.')
  }

  const publicDay = removeUndefinedFromPublicData({
    id: date,
    date,
    scheduleId: normalizeRequiredString(
      day?.scheduleId,
      'Identyfikator grafiku publicznego dnia'
    ),
    publishedRevision,
    employeeIds,
    shifts,
    schemaVersion: 1,
    publishedAt: publishedAt ?? null,
    updatedAt: updatedAt ?? null
  })

  assertOnlyAllowedFields({
    value: publicDay,
    allowedFields: PUBLIC_SCHEDULE_DAY_FIELDS,
    label: 'Publiczny dzień grafiku'
  })
  publicDay.shifts.forEach(shift => assertOnlyAllowedFields({
    value: shift,
    allowedFields: PUBLIC_SHIFT_FIELDS,
    label: 'Publiczna zmiana'
  }))

  return publicDay
}

export const buildPublicScheduleHeader = ({
  schedule,
  publishedAt,
  lastPublishedAt,
  updatedAt = lastPublishedAt
} = {}) => {
  const scheduleId = normalizeRequiredString(
    schedule?.id || schedule?.scheduleId,
    'Identyfikator publicznego grafiku'
  )
  const publicHeader = removeUndefinedFromPublicData({
    id: scheduleId,
    scheduleId,
    name: normalizeRequiredString(
      schedule?.name || 'Grafik',
      'Nazwa publicznego grafiku'
    ),
    dateFrom: normalizeRequiredString(
      schedule?.dateFrom,
      'Początek publicznego grafiku'
    ),
    dateTo: normalizeRequiredString(
      schedule?.dateTo,
      'Koniec publicznego grafiku'
    ),
    publicationStatus: normalizeRequiredString(
      schedule?.publicationStatus,
      'Status publikacji'
    ),
    publishedUntil: normalizeNullableString(schedule?.publishedUntil),
    publishedDaysCount: Number(schedule?.publishedDaysCount) || 0,
    publishedRevision: Number(schedule?.publishedRevision) || 0,
    publishedAt: publishedAt ?? null,
    lastPublishedAt: lastPublishedAt ?? null,
    schemaVersion: 1,
    updatedAt: updatedAt ?? null
  })

  assertOnlyAllowedFields({
    value: publicHeader,
    allowedFields: PUBLIC_SCHEDULE_HEADER_FIELDS,
    label: 'Publiczny nagłówek grafiku'
  })

  return publicHeader
}

export const assertPublicProjectionShape = ({
  header,
  days = []
} = {}) => {
  assertOnlyAllowedFields({
    value: header,
    allowedFields: PUBLIC_SCHEDULE_HEADER_FIELDS,
    label: 'Publiczny nagłówek grafiku'
  })

  ;(Array.isArray(days) ? days : []).forEach(day => {
    assertOnlyAllowedFields({
      value: day,
      allowedFields: PUBLIC_SCHEDULE_DAY_FIELDS,
      label: 'Publiczny dzień grafiku'
    })
    ;(Array.isArray(day.shifts) ? day.shifts : []).forEach(shift => {
      assertOnlyAllowedFields({
        value: shift,
        allowedFields: PUBLIC_SHIFT_FIELDS,
        label: 'Publiczna zmiana'
      })
    })
  })

  return true
}

export const assertExpectedPublicScheduleHeader = ({
  existingHeader,
  previousSchedule
} = {}) => {
  const isFirstPublication =
    previousSchedule?.publicationStatus === 'unpublished'

  if (isFirstPublication) {
    if (existingHeader) {
      throw new Error(
        'Publiczny nagłówek grafiku już istnieje. Publikacja została anulowana.'
      )
    }

    return true
  }

  if (!existingHeader) {
    throw new Error(
      'Brakuje publicznego nagłówka wcześniejszej publikacji.'
    )
  }

  assertOnlyAllowedFields({
    value: existingHeader,
    allowedFields: PUBLIC_SCHEDULE_HEADER_FIELDS,
    label: 'Istniejący publiczny nagłówek grafiku'
  })
  const expectedHeader = buildPublicScheduleHeader({
    schedule: previousSchedule,
    publishedAt: existingHeader.publishedAt,
    lastPublishedAt: existingHeader.lastPublishedAt,
    updatedAt: existingHeader.updatedAt
  })

  if (!valuesAreEqual(
    pickFields(existingHeader, PUBLIC_HEADER_STATE_FIELDS),
    pickFields(expectedHeader, PUBLIC_HEADER_STATE_FIELDS)
  )) {
    throw new Error(
      'Publiczny nagłówek grafiku ma niespodziewany stan.'
    )
  }

  return true
}

export const assertExpectedPublicScheduleDay = ({
  existingDay,
  expectedDay
} = {}) => {
  assertOnlyAllowedFields({
    value: existingDay,
    allowedFields: PUBLIC_SCHEDULE_DAY_FIELDS,
    label: 'Istniejący publiczny dzień grafiku'
  })

  if (!valuesAreEqual(
    pickFields(existingDay, PUBLIC_DAY_STATE_FIELDS),
    pickFields(expectedDay, PUBLIC_DAY_STATE_FIELDS)
  )) {
    if (existingDay?.scheduleId !== expectedDay?.scheduleId) {
      throw new Error(
        `Dzień ${expectedDay?.date || ''} należy już do innego grafiku.`
      )
    }

    throw new Error(
      `Publiczny dzień ${expectedDay?.date || ''} ma niespodziewany stan.`
    )
  }

  return true
}

export const preparePublicScheduleProjection = ({
  previousSchedule,
  publishedSchedule,
  publishedDays = [],
  existingHeader = null,
  existingDays = [],
  publishedAt,
  updatedAt = publishedAt
} = {}) => {
  assertExpectedPublicScheduleHeader({
    existingHeader,
    previousSchedule
  })

  const isFirstPublication =
    previousSchedule?.publicationStatus === 'unpublished'
  const firstPublishedAt = isFirstPublication
    ? publishedAt
    : existingHeader?.publishedAt ?? null
  const header = buildPublicScheduleHeader({
    schedule: publishedSchedule,
    publishedAt: firstPublishedAt,
    lastPublishedAt: updatedAt,
    updatedAt
  })
  const days = (Array.isArray(publishedDays) ? publishedDays : [])
    .map(day => buildPublicScheduleDay({
      day,
      publishedAt,
      updatedAt
    }))
  const existingDaysByDate = new Map(
    (Array.isArray(existingDays) ? existingDays : [])
      .filter(Boolean)
      .map(day => [day.date || day.id, day])
  )
  const daysToCreate = days.filter(day => {
    const existingDay = existingDaysByDate.get(day.date)

    if (!existingDay) return true

    assertExpectedPublicScheduleDay({
      existingDay,
      expectedDay: day
    })
    return false
  })

  assertPublicProjectionShape({ header, days })

  return {
    header,
    days,
    daysToCreate,
    writesCount: assertAtomicPublicationSize(days.length)
  }
}
