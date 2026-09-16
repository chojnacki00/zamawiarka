export const FIRESTORE_CLEANUP_BATCH_SIZE = 450
export const FIRESTORE_INVITATION_CLEANUP_BATCH_SIZE = 1

const normalizeId = value => String(value || '').trim()

const toMillis = value => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) {
    const millis = value.getTime()
    return Number.isFinite(millis) ? millis : null
  }
  const millis = Number(value)
  return Number.isFinite(millis) ? millis : null
}

export const isExpiredTemporaryDocument = ({ expiresAt, now = new Date() }) => {
  const expiresAtMillis = toMillis(expiresAt)
  const nowMillis = toMillis(now)
  return expiresAtMillis !== null &&
    nowMillis !== null &&
    expiresAtMillis <= nowMillis
}

export const isDisconnectedDeviceSessionExpired = ({
  status,
  disconnectedAt,
  threshold
} = {}) => (
  status === 'disconnected' &&
  isExpiredTemporaryDocument({ expiresAt: disconnectedAt, now: threshold })
)

export const getCleanupFailureDetails = (results = {}) => (
  Object.entries(results)
    .filter(([, result]) => result?.completed === false)
    .map(([operation, result]) => ({
      operation,
      collection: result.collectionName || 'unknown',
      code: String(result.error?.code || 'unknown')
    }))
)

export const filterDocumentsForRestaurant = ({
  documents,
  restaurantId,
  getRestaurantId = document => document?.restaurantId,
  expectedCollection,
  getCollection = document => document?.collectionName
} = {}) => {
  const expectedRestaurantId = normalizeId(restaurantId)
  if (!expectedRestaurantId) {
    throw new Error('Brak restauracji dla operacji czyszczenia.')
  }

  return (Array.isArray(documents) ? documents : []).filter(document => {
    const belongsToRestaurant = normalizeId(getRestaurantId(document)) ===
      expectedRestaurantId
    const belongsToCollection = !expectedCollection ||
      normalizeId(getCollection(document)) === normalizeId(expectedCollection)
    return belongsToRestaurant && belongsToCollection
  })
}

export const runScopedCleanupBatches = async ({
  restaurantId,
  loadBatch,
  deleteBatch,
  getRestaurantId,
  expectedCollection,
  getCollection,
  batchSize = FIRESTORE_CLEANUP_BATCH_SIZE,
  maxBatches = 20,
  collectionName = expectedCollection
} = {}) => {
  const normalizedRestaurantId = normalizeId(restaurantId)
  if (!normalizedRestaurantId) {
    throw new Error('Brak restauracji dla operacji czyszczenia.')
  }
  if (typeof loadBatch !== 'function' || typeof deleteBatch !== 'function') {
    throw new Error('Brak kompletnej konfiguracji czyszczenia danych.')
  }

  let deletedCount = 0
  let batchCount = 0

  try {
    while (batchCount < maxBatches) {
      const loadedDocuments = await loadBatch({
        restaurantId: normalizedRestaurantId,
        batchSize
      })
      const documents = filterDocumentsForRestaurant({
        documents: loadedDocuments,
        restaurantId: normalizedRestaurantId,
        getRestaurantId,
        expectedCollection,
        getCollection
      }).slice(0, batchSize)

      if (documents.length === 0) break

      await deleteBatch({
        documents,
        restaurantId: normalizedRestaurantId
      })
      deletedCount += documents.length
      batchCount += 1

      if ((loadedDocuments?.length || 0) < batchSize) break
    }

    if (batchCount >= maxBatches) {
      const remainingDocuments = filterDocumentsForRestaurant({
        documents: await loadBatch({
          restaurantId: normalizedRestaurantId,
          batchSize: 1
        }),
        restaurantId: normalizedRestaurantId,
        getRestaurantId,
        expectedCollection,
        getCollection
      })
      if (remainingDocuments.length > 0) {
        const error = new Error(
          'Osiągnięto bezpieczny limit partii czyszczenia.'
        )
        error.code = 'cleanup/batch-limit-reached'
        return {
          deletedCount,
          batchCount,
          completed: false,
          error,
          collectionName
        }
      }
    }

    return {
      deletedCount,
      batchCount,
      completed: true,
      error: null,
      collectionName
    }
  } catch (error) {
    return {
      deletedCount,
      batchCount,
      completed: false,
      error,
      collectionName
    }
  }
}
