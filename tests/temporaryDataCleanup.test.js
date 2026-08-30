import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FIRESTORE_CLEANUP_BATCH_SIZE,
  filterDocumentsForRestaurant,
  runScopedCleanupBatches
} from '../src/utils/temporaryDataCleanup.js'

const temporaryDocument = (id, {
  restaurantId = 'restaurant-a',
  collectionName = 'invitations'
} = {}) => ({ id, restaurantId, collectionName })

test('filtr czyszczenia zachowuje dane innej restauracji i inne kolekcje', () => {
  const documents = [
    temporaryDocument('own-invitation'),
    temporaryDocument('foreign-invitation', { restaurantId: 'restaurant-b' }),
    temporaryDocument('own-schedule', { collectionName: 'grafiki' }),
    temporaryDocument('own-availability', {
      collectionName: 'grafik_dyspozycyjnosc'
    })
  ]

  assert.deepEqual(filterDocumentsForRestaurant({
    documents,
    restaurantId: 'restaurant-a',
    expectedCollection: 'invitations'
  }).map(document => document.id), ['own-invitation'])
})

test('czyszczenie dzieli operację na bezpieczne partie po 450 dokumentów', async () => {
  const documents = Array.from({ length: 901 }, (_, index) => (
    temporaryDocument(`invitation-${index}`)
  ))
  const deletedIds = []

  const result = await runScopedCleanupBatches({
    restaurantId: 'restaurant-a',
    expectedCollection: 'invitations',
    batchSize: FIRESTORE_CLEANUP_BATCH_SIZE,
    loadBatch: async ({ batchSize }) => documents
      .filter(document => !deletedIds.includes(document.id))
      .slice(0, batchSize),
    deleteBatch: async ({ documents: batch }) => {
      deletedIds.push(...batch.map(document => document.id))
    }
  })

  assert.deepEqual(result, {
    deletedCount: 901,
    batchCount: 3,
    completed: true,
    error: null
  })
  assert.equal(new Set(deletedIds).size, 901)
})

test('błąd kolejnej partii nie ukrywa częściowego wyniku czyszczenia', async () => {
  const documents = Array.from({ length: 451 }, (_, index) => (
    temporaryDocument(`pairing-${index}`, {
      collectionName: 'pairing_codes'
    })
  ))
  const deletedIds = []
  let deleteAttempt = 0

  const result = await runScopedCleanupBatches({
    restaurantId: 'restaurant-a',
    expectedCollection: 'pairing_codes',
    batchSize: FIRESTORE_CLEANUP_BATCH_SIZE,
    loadBatch: async ({ batchSize }) => documents
      .filter(document => !deletedIds.includes(document.id))
      .slice(0, batchSize),
    deleteBatch: async ({ documents: batch }) => {
      deleteAttempt += 1
      if (deleteAttempt === 2) throw new Error('Testowy błąd zapisu')
      deletedIds.push(...batch.map(document => document.id))
    }
  })

  assert.equal(result.deletedCount, 450)
  assert.equal(result.batchCount, 1)
  assert.equal(result.completed, false)
  assert.match(result.error.message, /Testowy błąd zapisu/)
  assert.equal(deletedIds.length, 450)
})

test('czyszczenie bez jawnego identyfikatora restauracji jest blokowane', async () => {
  await assert.rejects(runScopedCleanupBatches({
    restaurantId: '',
    loadBatch: async () => [],
    deleteBatch: async () => {}
  }), /Brak restauracji/)
})
