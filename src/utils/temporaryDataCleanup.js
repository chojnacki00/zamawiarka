export const FIRESTORE_CLEANUP_BATCH_SIZE = 450

const normalizeId = value => String(value || '').trim()

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
  maxBatches = 20
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

    return {
      deletedCount,
      batchCount,
      completed: true,
      error: null
    }
  } catch (error) {
    return {
      deletedCount,
      batchCount,
      completed: false,
      error
    }
  }
}
