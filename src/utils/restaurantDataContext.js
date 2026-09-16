const normalizeRestaurantId = value => String(value || '').trim()

const LEGACY_LIST_VALUE_KEY = '__legacyListValue'

export const RESTAURANT_NAMED_LIST_FIELDS = Object.freeze([
  'suppliers',
  'warehouses',
  'orderTimings',
  'units',
  'categories',
  'whoOrders'
])

const supportsLegacyNamedValues = field => (
  RESTAURANT_NAMED_LIST_FIELDS.includes(field)
)

const buildLegacyListEntryId = (field, name, index) => {
  let hash = 0
  const source = `${field}:${name}`

  for (let characterIndex = 0; characterIndex < source.length; characterIndex += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(characterIndex)) | 0
  }

  return `legacy-${field}-${Math.abs(hash)}-${index}`
}

export const normalizeRestaurantList = (field, value) => {
  if (!Array.isArray(value)) return []
  if (!supportsLegacyNamedValues(field)) return value

  return value.map((entry, index) => {
    if (typeof entry !== 'string') return entry

    return {
      id: buildLegacyListEntryId(field, entry, index),
      name: entry,
      [LEGACY_LIST_VALUE_KEY]: entry
    }
  })
}

export const serializeRestaurantList = (field, value) => {
  if (!Array.isArray(value)) return []
  if (!supportsLegacyNamedValues(field)) return value

  return value.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return entry
    }

    const legacyValue = entry[LEGACY_LIST_VALUE_KEY]
    if (
      typeof legacyValue === 'string' &&
      String(entry.name || '') === legacyValue
    ) {
      return legacyValue
    }

    const { [LEGACY_LIST_VALUE_KEY]: ignoredLegacyValue, ...serializable } = entry
    return serializable
  })
}

export const buildRestaurantHydrationDiagnostic = ({
  mode,
  event,
  authUid = null,
  restaurantId = null,
  status = null,
  reason = null
}) => {
  if (mode !== 'test') return null

  const normalizedRestaurantId = normalizeRestaurantId(restaurantId) || null
  return {
    event: String(event || 'unknown'),
    authUid: normalizeRestaurantId(authUid) || null,
    restaurantId: normalizedRestaurantId,
    path: normalizedRestaurantId
      ? `users/${normalizedRestaurantId}/app/state`
      : null,
    status: status || null,
    reason: reason ? String(reason) : null
  }
}

export const RESTAURANT_DATA_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  MISSING: 'missing',
  ERROR: 'error'
})

export const isRestaurantContextCurrent = (
  listenerRestaurantId,
  currentRestaurantId
) => (
  Boolean(normalizeRestaurantId(listenerRestaurantId)) &&
  normalizeRestaurantId(listenerRestaurantId) ===
    normalizeRestaurantId(currentRestaurantId)
)

export const isRestaurantDataReadyForWrite = ({
  status,
  loadedRestaurantId,
  currentRestaurantId
}) => (
  status === RESTAURANT_DATA_STATUS.READY &&
  isRestaurantContextCurrent(loadedRestaurantId, currentRestaurantId)
)

export const isRestaurantSnapshotCurrent = ({
  status,
  listenerRestaurantId,
  loadedRestaurantId,
  currentRestaurantId
}) => (
  isRestaurantDataReadyForWrite({
    status,
    loadedRestaurantId,
    currentRestaurantId
  }) &&
  isRestaurantContextCurrent(listenerRestaurantId, currentRestaurantId)
)

export const persistRestaurantDataWhenReady = async ({
  status,
  loadedRestaurantId,
  currentRestaurantId,
  persistValue
}) => {
  if (!isRestaurantDataReadyForWrite({
    status,
    loadedRestaurantId,
    currentRestaurantId
  })) {
    throw new Error(
      'Dane restauracji nie zostały poprawnie wczytane. Zapis został zablokowany.'
    )
  }

  return persistValue()
}

export const persistRestaurantListChange = async ({
  previousValue,
  nextValue,
  applyValue,
  persistValue
}) => {
  applyValue(nextValue)

  try {
    await persistValue(nextValue)
    return true
  } catch (error) {
    applyValue(previousValue)
    throw error
  }
}
