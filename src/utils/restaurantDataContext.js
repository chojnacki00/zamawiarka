const normalizeRestaurantId = value => String(value || '').trim()

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
