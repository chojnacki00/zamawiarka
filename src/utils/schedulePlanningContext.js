import { getEmployeeFullName } from './employeeAssignments.js'
import { getScaledEmploymentProfile } from './employmentRules.js'
import { createEmptyRegularVacancy } from './scheduleAssignments.js'
import {
  normalizeSchedulePositionColor
} from './schedulePositionColors.js'

export const PLANNING_CONTEXT_VERSION = 2
export const PLANNING_CONTEXT_RECORD_TYPE = 'planning_context'
export const PLANNING_CONTEXT_COLLECTION = 'grafik_aktualizacje'
export const MAX_PLANNING_CONTEXT_DOCUMENT_BYTES = 900 * 1024
export const MAX_PLANNING_CONTEXT_TOTAL_BYTES = 8 * 1024 * 1024

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

const clone = value => {
  if (value === undefined) return null
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(clone)

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .map(([key, nestedValue]) => [key, clone(nestedValue)])
  )
}

const normalizeId = value => String(value || '').trim()

const normalizeAvailabilityEntry = entry => {
  if (!entry) return null

  const type = String(entry.type || '').trim()
  if (!type) return null

  return {
    type,
    timeFrom: type === 'partial' ? entry.timeFrom || null : null,
    timeTo: type === 'partial' ? entry.timeTo || null : null
  }
}

export const resolveEffectiveAvailability = record => {
  const managerEntry = normalizeAvailabilityEntry(record?.managerEntry)
  const employeeEntry = normalizeAvailabilityEntry(record?.employeeEntry)
  const legacyEntry = normalizeAvailabilityEntry(record)

  if (managerEntry) {
    return { entry: managerEntry, source: 'manager' }
  }

  if (employeeEntry) {
    return { entry: employeeEntry, source: 'employee' }
  }

  if (legacyEntry) {
    return { entry: legacyEntry, source: 'employee' }
  }

  return {
    entry: { type: 'full', timeFrom: null, timeTo: null },
    source: 'default'
  }
}

const buildEmployeeSnapshot = (employee, profilesById) => {
  const employeeId = normalizeId(employee?.id)
  const employmentProfileId = normalizeId(
    employee?.employmentProfileId
  ) || null
  const profile = employmentProfileId
    ? profilesById.get(employmentProfileId) || null
    : null
  const positionAssignments = (
    Array.isArray(employee?.positionAssignments)
      ? employee.positionAssignments
      : []
  ).map(assignment => ({
    positionId: normalizeId(assignment?.positionId),
    competencyStars: Math.min(
      5,
      Math.max(0, Number(assignment?.competencyStars) || 0)
    )
  })).filter(assignment => assignment.positionId)

  return {
    id: employeeId,
    employeeId,
    imie: String(employee?.imie || '').trim(),
    nazwisko: String(employee?.nazwisko || '').trim(),
    fullNameSnapshot:
      getEmployeeFullName(employee) || 'Pracownik bez nazwy',
    aktywny: employee?.aktywny !== false,
    positionAssignments,
    employmentProfileId,
    employmentPercentage: employmentProfileId
      ? Math.min(
          200,
          Math.max(5, Number(employee?.employmentPercentage) || 100)
        )
      : null,
    individualScheduleSettings: clone(
      employee?.scheduleSettings || {}
    ),
    effectiveEmploymentRules: clone(
      getScaledEmploymentProfile(employee, profile)
    )
  }
}

const buildPositionSnapshot = position => {
  const positionId = normalizeId(position?.id)

  return {
    id: positionId,
    positionId,
    nazwa: String(position?.nazwa || position?.name || '').trim() ||
      'Nieznane stanowisko',
    kolor: position?.kolor || position?.color || '#64748b',
    ikona: position?.ikona || position?.icon || null,
    scheduleColor: normalizeSchedulePositionColor(
      position?.scheduleColor
    ),
    active: position?.active !== false
  }
}

const buildProfileSnapshot = profile => ({
  id: normalizeId(profile?.id),
  name: String(profile?.name || '').trim() || 'Profil bez nazwy',
  description: String(profile?.description || '').trim(),
  profileVersionNumber: Number(profile?.profileVersionNumber) || 0,
  profileVersionId: profile?.profileVersionId || null,
  targetHours: clone(profile?.targetHours || {}),
  settlementPeriod: clone(profile?.settlementPeriod || {}),
  targetTolerance: clone(profile?.targetTolerance || {}),
  maximumDailyHours: clone(profile?.maximumDailyHours || {}),
  maximumWeeklyHours: clone(profile?.maximumWeeklyHours || {}),
  minimumRest: clone(profile?.minimumRest || {}),
  minimumWeeklyRest: clone(profile?.minimumWeeklyRest || {}),
  maximumConsecutiveDays: clone(profile?.maximumConsecutiveDays || {}),
  weekendRotation: clone(profile?.weekendRotation || {}),
  breaks: clone(Array.isArray(profile?.breaks) ? profile.breaks : [])
})

const buildAvailabilitySnapshotEntry = record => {
  const effective = resolveEffectiveAvailability(record)

  return {
    employeeId: normalizeId(record?.employeeId),
    employeeEntry: normalizeAvailabilityEntry(record?.employeeEntry),
    managerEntry: normalizeAvailabilityEntry(record?.managerEntry),
    effective: effective.entry,
    effectiveSource: effective.source
  }
}

export const getPlanningContextDocumentId = (
  scheduleId,
  contextType,
  sourceId = ''
) => {
  const normalizedScheduleId = normalizeId(scheduleId)
  const normalizedContextType = normalizeId(contextType)
  const normalizedSourceId = normalizeId(sourceId)

  if (!normalizedScheduleId || !normalizedContextType) {
    throw new Error('Brak danych dokumentu snapshotu grafiku.')
  }

  return [
    normalizedScheduleId,
    'planning',
    normalizedContextType,
    normalizedSourceId
  ].filter(Boolean).join('__')
}

export const buildDemandDaySnapshot = ({
  dateKey,
  demandModel,
  positions = []
}) => {
  const date = new Date(`${dateKey}T12:00:00`)
  const dayKey = Number.isNaN(date.getTime())
    ? null
    : DAY_KEYS[date.getDay()]
  const vacancies = dayKey && Array.isArray(demandModel?.days?.[dayKey])
    ? demandModel.days[dayKey]
    : []
  const positionsById = new Map(
    positions.map(position => [position.id, position])
  )
  const shiftGroups = []

  vacancies.forEach((vacancy, vacancyIndex) => {
    const positionId = normalizeId(vacancy?.positionId)
    const from = String(vacancy?.from || '')
    const to = String(vacancy?.to || '')
    const slotsCount = Math.max(
      1,
      Math.trunc(Number(vacancy?.requiredPeople) || 1)
    )

    if (!positionId || !from || !to || from === to) return

    const position = positionsById.get(positionId)
    shiftGroups.push({
      id: `${dateKey}-${vacancy.id || `vacancy-${vacancyIndex}`}`,
      positionId,
      positionName:
        position?.nazwa || position?.name || 'Nieznane stanowisko',
      positionColorSnapshot: normalizeSchedulePositionColor(
        position?.scheduleColor
      ),
      from,
      to,
      slotsCount
    })
  })

  return {
    date: dateKey,
    modelId: normalizeId(demandModel?.id),
    modelName: String(demandModel?.name || '').trim() ||
      'Model bez nazwy',
    modelVersionSnapshot:
      demandModel?.modelVersionId ||
      demandModel?.version ||
      demandModel?.updatedAt?.toMillis?.() ||
      null,
    slotsCount: shiftGroups.reduce(
      (sum, group) => sum + group.slotsCount,
      0
    ),
    shiftGroups
  }
}

export const buildWorkingShiftsFromDemandDay = day => {
  const groups = Array.isArray(day?.shiftGroups)
    ? day.shiftGroups
    : []

  return groups.flatMap(group => {
    const slotsCount = Math.max(
      0,
      Math.trunc(Number(group?.slotsCount) || 0)
    )

    return Array.from({ length: slotsCount }, (_, slotIndex) => {
      const vacancy = {
        id: `${group.id}-slot-${slotIndex + 1}`,
        shiftGroupId: group.id,
        positionId: group.positionId,
        positionNameSnapshot:
          group.positionName || 'Nieznane stanowisko',
        from: group.from,
        to: group.to
      }

      if (Object.hasOwn(group || {}, 'positionColorSnapshot')) {
        vacancy.positionColorSnapshot = normalizeSchedulePositionColor(
          group.positionColorSnapshot
        )
      }

      return createEmptyRegularVacancy(vacancy)
    })
  })
}

export const buildPlanningContextSnapshot = ({
  scheduleId,
  dateKeys = [],
  employees = [],
  positions = [],
  employmentProfiles = [],
  generatorSettings = {},
  availabilityEntries = []
}) => {
  const profilesById = new Map(
    employmentProfiles
      .filter(profile => normalizeId(profile?.id))
      .map(profile => [normalizeId(profile.id), profile])
  )
  const employeeSnapshots = employees
    .filter(employee => normalizeId(employee?.id))
    .map(employee => buildEmployeeSnapshot(employee, profilesById))
  const employeeIds = new Set(
    employeeSnapshots.map(employee => employee.employeeId)
  )
  const usedProfileIds = new Set(
    employeeSnapshots
      .map(employee => employee.employmentProfileId)
      .filter(Boolean)
  )
  const positionSnapshots = positions
    .filter(position => normalizeId(position?.id))
    .map(buildPositionSnapshot)
  const profileSnapshots = employmentProfiles
    .filter(profile => usedProfileIds.has(normalizeId(profile?.id)))
    .map(buildProfileSnapshot)
  const availabilityByDate = new Map(
    dateKeys.map(dateKey => [dateKey, []])
  )

  availabilityEntries.forEach(record => {
    const dateKey = String(record?.date || '')
    const employeeId = normalizeId(record?.employeeId)

    if (!availabilityByDate.has(dateKey) || !employeeIds.has(employeeId)) {
      return
    }

    availabilityByDate.get(dateKey).push(
      buildAvailabilitySnapshotEntry(record)
    )
  })

  const makeDocument = (contextType, sourceId, data) => ({
    id: getPlanningContextDocumentId(
      scheduleId,
      contextType,
      sourceId
    ),
    data: {
      scheduleId,
      recordType: PLANNING_CONTEXT_RECORD_TYPE,
      contextType,
      planningContextVersion: PLANNING_CONTEXT_VERSION,
      ...data
    }
  })
  const documents = [
    makeDocument('meta', '', {
      defaultAvailability: {
        type: 'full',
        source: 'default'
      },
      generatorSettings: clone(generatorSettings),
      employeesCount: employeeSnapshots.length,
      positionsCount: positionSnapshots.length,
      employmentProfilesCount: profileSnapshots.length,
      availabilityDaysCount: dateKeys.length
    }),
    ...employeeSnapshots.map(employee => makeDocument(
      'employee',
      employee.employeeId,
      { employee }
    )),
    ...positionSnapshots.map(position => makeDocument(
      'position',
      position.positionId,
      { position }
    )),
    ...profileSnapshots.map(profile => makeDocument(
      'employment_profile',
      profile.id,
      { employmentProfile: profile }
    )),
    ...dateKeys.map(dateKey => makeDocument(
      'availability_day',
      dateKey,
      {
        date: dateKey,
        entries: availabilityByDate.get(dateKey)
          .sort((first, second) => (
            first.employeeId.localeCompare(second.employeeId)
          ))
      }
    ))
  ]

  assertPlanningContextDocumentSizes(documents)

  return {
    version: PLANNING_CONTEXT_VERSION,
    documents,
    employees: employeeSnapshots,
    positions: positionSnapshots,
    employmentProfiles: profileSnapshots,
    availabilityDays: dateKeys.map(dateKey => ({
      date: dateKey,
      entries: availabilityByDate.get(dateKey)
    })),
    generatorSettings: clone(generatorSettings)
  }
}

export const estimatePlanningDocumentBytes = documentData => (
  new TextEncoder().encode(JSON.stringify(documentData)).length
)

export const assertPlanningContextDocumentSizes = documents => {
  let totalBytes = 0

  documents.forEach(document => {
    const bytes = estimatePlanningDocumentBytes(document?.data || {})
    totalBytes += bytes

    if (bytes > MAX_PLANNING_CONTEXT_DOCUMENT_BYTES) {
      throw new Error(
        'Snapshot grafiku jest zbyt duży dla pojedynczego dokumentu. ' +
        'Skróć zakres grafiku lub zmniejsz liczbę danych zespołu.'
      )
    }
  })

  if (totalBytes > MAX_PLANNING_CONTEXT_TOTAL_BYTES) {
    throw new Error(
      'Snapshot grafiku jest zbyt duży do atomowego zapisania. ' +
      'Skróć zakres grafiku.'
    )
  }

  return totalBytes
}

export const hydratePlanningContext = documents => {
  const records = Array.isArray(documents) ? documents : []
  const contextRecords = records.filter(record => (
    record?.recordType === PLANNING_CONTEXT_RECORD_TYPE &&
    Number(record?.planningContextVersion) === PLANNING_CONTEXT_VERSION
  ))
  const meta = contextRecords.find(record => record.contextType === 'meta')

  if (!meta) {
    throw new Error(
      'Ten grafik nie zawiera kompletnego snapshotu danych planowania.'
    )
  }

  const employees = contextRecords
    .filter(record => record.contextType === 'employee' && record.employee)
    .map(record => clone(record.employee))
  const positions = contextRecords
    .filter(record => record.contextType === 'position' && record.position)
    .map(record => clone(record.position))
  const employmentProfiles = contextRecords
    .filter(record => (
      record.contextType === 'employment_profile' &&
      record.employmentProfile
    ))
    .map(record => clone(record.employmentProfile))
  const availabilityDays = contextRecords
    .filter(record => record.contextType === 'availability_day')
    .map(record => ({
      date: record.date,
      entries: clone(Array.isArray(record.entries) ? record.entries : [])
    }))
    .sort((first, second) => first.date.localeCompare(second.date))
  const availabilityEntries = availabilityDays.flatMap(day => (
    day.entries.map(entry => ({
      id: `${entry.employeeId}_${day.date}`,
      employeeId: entry.employeeId,
      date: day.date,
      employeeEntry: entry.employeeEntry,
      managerEntry: entry.managerEntry,
      effectiveSource: entry.effectiveSource,
      type: entry.effective?.type || 'full',
      timeFrom: entry.effective?.timeFrom || null,
      timeTo: entry.effective?.timeTo || null
    }))
  ))
  const expectedCounts = {
    employees: Number(meta.employeesCount) || 0,
    positions: Number(meta.positionsCount) || 0,
    employmentProfiles: Number(meta.employmentProfilesCount) || 0,
    availabilityDays: Number(meta.availabilityDaysCount) || 0
  }

  if (
    employees.length !== expectedCounts.employees ||
    positions.length !== expectedCounts.positions ||
    employmentProfiles.length !== expectedCounts.employmentProfiles ||
    availabilityDays.length !== expectedCounts.availabilityDays
  ) {
    throw new Error(
      'Snapshot danych planowania tego grafiku jest niekompletny.'
    )
  }

  return {
    version: PLANNING_CONTEXT_VERSION,
    meta: clone(meta),
    employees,
    positions,
    employmentProfiles,
    availabilityDays,
    availabilityEntries,
    generatorSettings: clone(meta.generatorSettings || {})
  }
}
