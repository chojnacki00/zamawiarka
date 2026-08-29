import { isManualAssignment } from './scheduleAssignments.js'

const AVAILABILITY_WARNING_MESSAGES = new Set([
  'Pracownik oznaczył, że nie może pracować.',
  'Pracownik poprosił o wolne.'
])

const normalizeWarnings = warnings => (
  Array.isArray(warnings)
    ? warnings.filter(warning => typeof warning === 'string')
    : []
)

export const isAvailabilityWarning = warning => (
  AVAILABILITY_WARNING_MESSAGES.has(warning) ||
  /^Dyspozycja .+ nie obejmuje całej zmiany\.$/.test(warning)
)

export const hasAvailabilityRangeWarning = warnings => (
  normalizeWarnings(warnings).some(warning => (
    /^Dyspozycja .+ nie obejmuje całej zmiany\.$/.test(warning)
  ))
)

export const hasNonAvailabilityWarnings = warnings => (
  normalizeWarnings(warnings).some(warning => (
    !isAvailabilityWarning(warning)
  ))
)

export const shouldShowGeneralOverride = shift => (
  isManualAssignment(shift) &&
  hasNonAvailabilityWarnings(shift?.warnings)
)
