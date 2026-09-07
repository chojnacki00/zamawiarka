import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FIRESTORE_CLEANUP_BATCH_SIZE,
  FIRESTORE_INVITATION_CLEANUP_BATCH_SIZE,
  filterDocumentsForRestaurant,
  getCleanupFailureDetails,
  isDisconnectedDeviceSessionExpired,
  isExpiredTemporaryDocument,
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

test('lokalny filtr wybiera tylko dane, których termin rzeczywiście minął', () => {
  const now = new Date('2026-09-08T12:00:00.000Z')
  assert.equal(isExpiredTemporaryDocument({
    expiresAt: { toMillis: () => now.getTime() - 1 },
    now
  }), true)
  assert.equal(isExpiredTemporaryDocument({
    expiresAt: new Date(now.getTime() + 1),
    now
  }), false)
  assert.equal(isExpiredTemporaryDocument({ expiresAt: null, now }), false)
})

test('sesja urządzenia musi być odłączona i starsza od progu retencji', () => {
  const threshold = new Date('2026-06-10T00:00:00.000Z')
  assert.equal(isDisconnectedDeviceSessionExpired({
    status: 'disconnected',
    disconnectedAt: new Date('2026-06-09T23:59:59.000Z'),
    threshold
  }), true)
  assert.equal(isDisconnectedDeviceSessionExpired({
    status: 'active',
    disconnectedAt: new Date('2026-01-01T00:00:00.000Z'),
    threshold
  }), false)
  assert.equal(isDisconnectedDeviceSessionExpired({
    status: 'disconnected',
    disconnectedAt: new Date('2026-06-11T00:00:00.000Z'),
    threshold
  }), false)
})

test('zaproszenia są usuwane pojedynczo z uwagi na limit odczytów reguł', () => {
  assert.equal(FIRESTORE_INVITATION_CLEANUP_BATCH_SIZE, 1)
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
    error: null,
    collectionName: 'invitations'
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

test('osiągnięcie limitu partii nie jest raportowane jako pełny sukces', async () => {
  const documents = [
    temporaryDocument('first'),
    temporaryDocument('second')
  ]
  const deletedIds = []

  const result = await runScopedCleanupBatches({
    restaurantId: 'restaurant-a',
    expectedCollection: 'invitations',
    batchSize: 1,
    maxBatches: 1,
    loadBatch: async ({ batchSize }) => documents
      .filter(document => !deletedIds.includes(document.id))
      .slice(0, batchSize),
    deleteBatch: async ({ documents: batch }) => {
      deletedIds.push(...batch.map(document => document.id))
    }
  })

  assert.equal(result.deletedCount, 1)
  assert.equal(result.batchCount, 1)
  assert.equal(result.completed, false)
  assert.equal(result.error.code, 'cleanup/batch-limit-reached')
  assert.deepEqual(deletedIds, ['first'])
})

test('raport częściowego błędu ujawnia tylko operację, kolekcję i kod', () => {
  const failures = getCleanupFailureDetails({
    invitations: {
      completed: true,
      collectionName: 'identityInvitations'
    },
    pairingCodes: {
      completed: false,
      collectionName: 'pairing_codes',
      error: {
        code: 'failed-precondition',
        message: 'sekretny-token-nie-może-trafić-do-logu'
      }
    }
  })

  assert.deepEqual(failures, [{
    operation: 'pairingCodes',
    collection: 'pairing_codes',
    code: 'failed-precondition'
  }])
  assert.doesNotMatch(JSON.stringify(failures), /sekretny-token/)
})

test('czyszczenie bez jawnego identyfikatora restauracji jest blokowane', async () => {
  await assert.rejects(runScopedCleanupBatches({
    restaurantId: '',
    loadBatch: async () => [],
    deleteBatch: async () => {}
  }), /Brak restauracji/)
})
