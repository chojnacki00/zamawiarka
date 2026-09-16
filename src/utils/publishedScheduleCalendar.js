import {
  getDateKeysInRange,
  isValidDateKey,
  isValidDateRange
} from './scheduleCreationValidation.js'
import {
  PUBLIC_SCHEDULE_DAY_FIELDS,
  PUBLIC_SHIFT_FIELDS,
  PUBLIC_SHIFT_TYPES
} from './schedulePublicProjection.js'
import { PUBLICATION_STATUSES } from './schedulePublication.js'
import {
  PUBLISHED_SCHEDULE_EXTRA_COLOR,
  PUBLISHED_SCHEDULE_NEUTRAL_COLOR,
  getSchedulePositionColorOption,
  normalizeSchedulePositionColor
} from './schedulePositionColors.js'

export const PUBLISHED_CALENDAR_WEEKDAYS = Object.freeze([
  'PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'
])

export const MAX_PUBLISHED_SHIFT_LAYERS = 3
export const PUBLISHED_POSITION_LABEL_LIMITS = Object.freeze({
  compact: 7,
  medium: 11,
  desktop: 15
})

const formatUtcDateKey = date => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseMonthKey = monthKey => {
  const normalizedMonthKey = String(monthKey || '').trim()
  const match = /^(\d{4})-(\d{2})$/.exec(normalizedMonthKey)

  if (!match) {
    throw new Error('Miesiąc kalendarza jest nieprawidłowy.')
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (month < 1 || month > 12) {
    throw new Error('Miesiąc kalendarza jest nieprawidłowy.')
  }

  return { monthKey: normalizedMonthKey, year, month }
}

const assertExactFields = ({ value, fields, optionalFields = [] }) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Publiczne dane dnia mają nieprawidłowy format.')
  }

  const allowedFields = new Set(fields)
  const optional = new Set(optionalFields)
  const hasUnexpectedField = Object.keys(value).some(
    key => !allowedFields.has(key)
  )
  const hasMissingField = fields.some(
    key => !optional.has(key) && !Object.hasOwn(value, key)
  )

  if (hasUnexpectedField || hasMissingField) {
    throw new Error('Publiczne dane dnia mają nieprawidłowy format.')
  }
}

const assertPublicShift = shift => {
  assertExactFields({
    value: shift,
    fields: PUBLIC_SHIFT_FIELDS,
    optionalFields: ['positionColorSnapshot']
  })

  if (
    !String(shift.id || '').trim() ||
    !String(shift.employeeId || '').trim() ||
    !/^\d{2}:\d{2}$/.test(String(shift.from || '')) ||
    !/^\d{2}:\d{2}$/.test(String(shift.to || '')) ||
    !Object.values(PUBLIC_SHIFT_TYPES).includes(shift.shiftType)
  ) {
    throw new Error('Publiczna zmiana ma nieprawidłowy format.')
  }

  return true
}

export const getMonthKeyFromDateKey = dateKey => {
  if (!isValidDateKey(dateKey)) {
    throw new Error('Data kalendarza jest nieprawidłowa.')
  }

  return dateKey.slice(0, 7)
}

export const getPublishedMonthBounds = monthKey => {
  const { year, month, monthKey: normalizedMonthKey } =
    parseMonthKey(monthKey)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return {
    monthKey: normalizedMonthKey,
    dateFrom: `${normalizedMonthKey}-01`,
    dateTo: `${normalizedMonthKey}-${String(lastDay).padStart(2, '0')}`
  }
}

export const buildPublishedMonthGrid = ({
  monthKey,
  todayDateKey = null
} = {}) => {
  const { year, month } = parseMonthKey(monthKey)
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setUTCDate(gridStart.getUTCDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setUTCDate(gridStart.getUTCDate() + index)
    const dateKey = formatUtcDateKey(date)

    return {
      dateKey,
      dayNumber: date.getUTCDate(),
      columnIndex: index % 7,
      rowIndex: Math.floor(index / 7),
      isCurrentMonth:
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1,
      isToday: dateKey === todayDateKey
    }
  })
}

export const buildPublishedCalendarIndex = (headers = []) => {
  const headersById = {}
  const scheduleIdByDate = {}

  ;(Array.isArray(headers) ? headers : []).forEach(header => {
    const id = String(header?.id || '').trim()
    const documentId = String(header?.documentId || id).trim()
    const scheduleId = String(header?.scheduleId || '').trim()
    const dateFrom = String(header?.dateFrom || '').trim()
    const dateTo = String(header?.dateTo || '').trim()
    const publishedUntil = String(header?.publishedUntil || '').trim()

    if (!id || documentId !== id || scheduleId !== id) {
      throw new Error('Publiczny nagłówek ma nieprawidłowy identyfikator.')
    }

    if (
      !isValidDateRange(dateFrom, dateTo) ||
      !isValidDateKey(publishedUntil) ||
      publishedUntil < dateFrom ||
      publishedUntil > dateTo
    ) {
      throw new Error('Publiczny nagłówek ma nieprawidłowy zakres.')
    }

    if (![
      PUBLICATION_STATUSES.PARTIALLY_PUBLISHED,
      PUBLICATION_STATUSES.PUBLISHED
    ].includes(header.publicationStatus)) {
      throw new Error('Publiczny nagłówek ma nieprawidłowy status.')
    }

    if (
      header.publicationStatus === PUBLICATION_STATUSES.PUBLISHED &&
      publishedUntil !== dateTo
    ) {
      throw new Error('Pełny publiczny grafik ma niespójny zakres.')
    }

    headersById[id] = header
    getDateKeysInRange(dateFrom, publishedUntil).forEach(dateKey => {
      if (scheduleIdByDate[dateKey]) {
        throw new Error(
          `Data ${dateKey} należy do dwóch opublikowanych grafików.`
        )
      }

      scheduleIdByDate[dateKey] = scheduleId
    })
  })

  const publishedDateKeys = Object.keys(scheduleIdByDate).sort()
  const publishedMonthKeys = [...new Set(
    publishedDateKeys.map(getMonthKeyFromDateKey)
  )]

  return {
    headersById,
    scheduleIdByDate,
    publishedDateKeys,
    publishedMonthKeys
  }
}

export const mergePublishedCalendarMonth = ({
  monthKey,
  calendarIndex,
  publicDays = []
} = {}) => {
  const { dateFrom, dateTo } = getPublishedMonthBounds(monthKey)
  const scheduleIdByDate = calendarIndex?.scheduleIdByDate || {}
  const expectedDateKeys = Object.keys(scheduleIdByDate)
    .filter(dateKey => dateKey >= dateFrom && dateKey <= dateTo)
    .sort()
  const daysByDate = {}

  ;(Array.isArray(publicDays) ? publicDays : []).forEach(day => {
    const documentId = String(day?.documentId || day?.id || '').trim()
    const publicDay = Object.fromEntries(
      Object.entries(day || {}).filter(([key]) => key !== 'documentId')
    )

    assertExactFields({
      value: publicDay,
      fields: PUBLIC_SCHEDULE_DAY_FIELDS
    })

    const id = String(publicDay.id || '').trim()
    const date = String(publicDay.date || '').trim()
    const scheduleId = String(publicDay.scheduleId || '').trim()

    if (!isValidDateKey(date) || documentId !== date || id !== date) {
      throw new Error('Publiczny dzień ma identyfikator niezgodny z datą.')
    }

    if (date < dateFrom || date > dateTo || !scheduleIdByDate[date]) {
      throw new Error(`Publiczny dzień ${date} nie należy do aktywnego zakresu.`)
    }

    if (scheduleIdByDate[date] !== scheduleId) {
      throw new Error(`Publiczny dzień ${date} należy do innego grafiku.`)
    }

    if (daysByDate[date]) {
      throw new Error(`Publiczny dzień ${date} występuje więcej niż raz.`)
    }

    if (
      !Array.isArray(publicDay.shifts) ||
      !Array.isArray(publicDay.employeeIds) ||
      !Number.isInteger(publicDay.publishedRevision) ||
      publicDay.publishedRevision < 1 ||
      publicDay.schemaVersion !== 1
    ) {
      throw new Error('Publiczne dane dnia mają nieprawidłowy format.')
    }

    publicDay.shifts.forEach(assertPublicShift)
    const expectedEmployeeIds = [...new Set(
      publicDay.shifts.map(shift => shift.employeeId)
    )]

    if (
      publicDay.employeeIds.some(employeeId => (
        typeof employeeId !== 'string' || !employeeId.trim()
      )) ||
      JSON.stringify(publicDay.employeeIds) !==
        JSON.stringify(expectedEmployeeIds)
    ) {
      throw new Error('Publiczne dane dnia mają nieprawidłowy format.')
    }

    daysByDate[date] = publicDay
  })

  const missingDateKeys = expectedDateKeys.filter(
    dateKey => !daysByDate[dateKey]
  )

  if (missingDateKeys.length > 0) {
    throw new Error(
      `Brakuje publicznych dokumentów dni: ${missingDateKeys.join(', ')}.`
    )
  }

  return { expectedDateKeys, daysByDate }
}

export const getEmployeePublishedShifts = ({
  day,
  employeeId
} = {}) => {
  const normalizedEmployeeId = String(employeeId || '').trim()

  if (!normalizedEmployeeId || !Array.isArray(day?.shifts)) return []

  return day.shifts.filter(
    shift => shift.employeeId === normalizedEmployeeId
  )
}

const getShiftTypeOrder = shiftType => (
  shiftType === PUBLIC_SHIFT_TYPES.REGULAR ? 0 : 1
)

export const sortPublishedShiftsForDisplay = shifts => (
  (Array.isArray(shifts) ? shifts : [])
    .map((shift, sourceIndex) => ({ shift, sourceIndex }))
    .sort((firstEntry, secondEntry) => {
      const first = firstEntry.shift || {}
      const second = secondEntry.shift || {}
      const timeComparison = String(first.from || '').localeCompare(
        String(second.from || '')
      )

      if (timeComparison !== 0) return timeComparison

      const typeComparison = getShiftTypeOrder(first.shiftType) -
        getShiftTypeOrder(second.shiftType)

      if (typeComparison !== 0) return typeComparison

      const idComparison = String(first.id || '').localeCompare(
        String(second.id || '')
      )

      return idComparison || firstEntry.sourceIndex - secondEntry.sourceIndex
    })
    .map(entry => entry.shift)
)

const formatCompactTime = value => {
  const normalizedValue = String(value || '').trim()
  const match = /^(\d{2}):(\d{2})$/.exec(normalizedValue)

  if (!match) return normalizedValue

  const hours = String(Number(match[1]))
  return match[2] === '00' ? hours : `${hours}:${match[2]}`
}

const formatAccessibleTime = value => {
  const normalizedValue = String(value || '').trim()
  return normalizedValue.replace(/^0(?=\d:)/, '')
}

const hasPositionSnapshot = shift => (
  Boolean(String(shift?.positionId || '').trim()) &&
  Boolean(String(shift?.positionNameSnapshot || '').trim())
)

export const truncatePublishedPositionName = (
  value,
  maxLength
) => {
  const normalizedValue = String(value || '').trim()
  const normalizedLimit = Math.max(
    1,
    Math.floor(Number(maxLength) || 1)
  )
  const characters = Array.from(normalizedValue)

  if (characters.length <= normalizedLimit) return normalizedValue
  if (normalizedLimit === 1) return '/'

  return characters
    .slice(0, normalizedLimit - 1)
    .join('')
    .trimEnd() + '/'
}

export const getPublishedShiftCardPresentation = shift => {
  const isExtra = shift?.shiftType === PUBLIC_SHIFT_TYPES.EXTRA
  const normalizedPositionColor = normalizeSchedulePositionColor(
    shift?.positionColorSnapshot
  )
  const usesPositionColor = Boolean(normalizedPositionColor) &&
    (!isExtra || hasPositionSnapshot(shift))
  const backgroundColor = isExtra && !usesPositionColor
    ? PUBLISHED_SCHEDULE_EXTRA_COLOR
    : normalizedPositionColor || PUBLISHED_SCHEDULE_NEUTRAL_COLOR
  const colorOption = getSchedulePositionColorOption(backgroundColor)
  const positionName = String(
    shift?.positionNameSnapshot || ''
  ).trim()
  const positionLabel = isExtra && !usesPositionColor
    ? 'Dodatkowa'
    : positionName || 'Bez stanowiska'
  const preserveFullPositionLabel = positionLabel === 'Dodatkowa'
  const getDisplayPositionLabel = limit => (
    preserveFullPositionLabel
      ? positionLabel
      : truncatePublishedPositionName(positionLabel, limit)
  )

  return {
    id: String(shift?.id || '').trim(),
    from: String(shift?.from || '').trim(),
    to: String(shift?.to || '').trim(),
    timeLabel: `${shift?.from || ''}–${shift?.to || ''}`,
    compactTimeLabel:
      `${formatCompactTime(shift?.from)}–${formatCompactTime(shift?.to)}`,
    positionLabel,
    compactPositionLabel: getDisplayPositionLabel(
      PUBLISHED_POSITION_LABEL_LIMITS.compact
    ),
    mediumPositionLabel: getDisplayPositionLabel(
      PUBLISHED_POSITION_LABEL_LIMITS.medium
    ),
    desktopPositionLabel: getDisplayPositionLabel(
      PUBLISHED_POSITION_LABEL_LIMITS.desktop
    ),
    backgroundColor,
    textColor: colorOption.textColor,
    isExtra,
    usesPositionColor
  }
}

export const buildPublishedShiftStack = ({
  shifts = [],
  maxVisible = MAX_PUBLISHED_SHIFT_LAYERS
} = {}) => {
  const sortedShifts = sortPublishedShiftsForDisplay(shifts)
  const visibleLimit = Math.max(1, Number(maxVisible) || 1)
  const visibleShifts = sortedShifts.slice(0, visibleLimit)

  return {
    cards: visibleShifts.map((shift, layerIndex) => ({
      ...getPublishedShiftCardPresentation(shift),
      layerIndex,
      zIndex: visibleShifts.length - layerIndex
    })),
    totalCount: sortedShifts.length,
    hiddenCount: Math.max(0, sortedShifts.length - visibleShifts.length)
  }
}

const getPolishShiftCountLabel = count => {
  if (count === 1) return '1 zmiana'
  if (count >= 2 && count <= 4) return `${count} zmiany`
  return `${count} zmian`
}

export const buildPublishedDayAriaLabel = ({
  dateKey,
  shifts = []
} = {}) => {
  const normalizedDateKey = String(dateKey || '').trim()
  const sortedShifts = sortPublishedShiftsForDisplay(shifts)

  if (!isValidDateKey(normalizedDateKey)) return ''

  const [year, month, day] = normalizedDateKey.split('-').map(Number)
  const dateLabel = new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))

  if (sortedShifts.length === 0) {
    return `${dateLabel}, brak zmian`
  }

  const shiftLabels = sortedShifts.map(shift => {
    const presentation = getPublishedShiftCardPresentation(shift)
    const positionLabel = presentation.isExtra
      ? presentation.positionLabel === 'Dodatkowa'
        ? 'zmiana dodatkowa'
        : `${presentation.positionLabel}, zmiana dodatkowa`
      : presentation.positionLabel

    return `${formatAccessibleTime(presentation.from)}–` +
      `${formatAccessibleTime(presentation.to)} ${positionLabel}`
  })

  return `${dateLabel}, ${getPolishShiftCountLabel(sortedShifts.length)}: ` +
    shiftLabels.join(', ')
}

export const buildPublishedCalendarDayPresentation = ({
  dateKey,
  day,
  employeeId
} = {}) => {
  const isPublished = Boolean(day)
  const employeeShifts = getEmployeePublishedShifts({ day, employeeId })
  const shiftStack = buildPublishedShiftStack({ shifts: employeeShifts })

  return {
    isPublished,
    isInteractive: isPublished,
    employeeShifts: sortPublishedShiftsForDisplay(employeeShifts),
    shiftStack,
    ariaLabel: isPublished
      ? buildPublishedDayAriaLabel({ dateKey, shifts: employeeShifts })
      : null
  }
}

export const chooseInitialPublishedMonth = ({
  currentMonthKey,
  publishedMonthKeys = []
} = {}) => {
  const normalizedMonths = [...new Set(
    (Array.isArray(publishedMonthKeys) ? publishedMonthKeys : [])
      .map(monthKey => parseMonthKey(monthKey).monthKey)
  )].sort()

  if (normalizedMonths.length === 0) return currentMonthKey
  if (normalizedMonths.includes(currentMonthKey)) return currentMonthKey

  return normalizedMonths.find(monthKey => monthKey > currentMonthKey) ||
    normalizedMonths.at(-1)
}

export const getAdjacentPublishedMonth = ({
  currentMonthKey,
  publishedMonthKeys = [],
  offset
} = {}) => {
  const normalizedMonths = [...new Set(publishedMonthKeys)].sort()
  const currentIndex = normalizedMonths.indexOf(currentMonthKey)
  const targetIndex = currentIndex + Number(offset)

  return currentIndex >= 0 && normalizedMonths[targetIndex]
    ? normalizedMonths[targetIndex]
    : null
}

export const getPublishedCalendarAccess = ({
  hasEmployeeSession = false,
  employeeId = null,
  employeePermissions = {},
  hasOwnerAccess = false
} = {}) => {
  if (hasEmployeeSession) {
    const canView = employeePermissions?.can_view_schedule === true
    const canManage = canView &&
      employeePermissions?.can_manage_schedule === true

    return {
      canAccess: canView,
      canSelectEmployee: canManage,
      ownEmployeeId: String(employeeId || '').trim() || null,
      defaultEmployeeId: String(employeeId || '').trim() || null,
      isOwner: false
    }
  }

  return {
    canAccess: hasOwnerAccess,
    canSelectEmployee: hasOwnerAccess,
    ownEmployeeId: null,
    defaultEmployeeId: null,
    isOwner: hasOwnerAccess
  }
}

export const resolvePublishedCalendarEmployeeId = ({
  access,
  requestedEmployeeId = null
} = {}) => {
  if (!access?.canAccess) return null
  if (!access.canSelectEmployee) return access.ownEmployeeId || null

  return String(requestedEmployeeId || '').trim() ||
    access.defaultEmployeeId ||
    null
}
