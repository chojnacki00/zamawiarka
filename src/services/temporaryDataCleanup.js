import {
  collection,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  writeBatch
} from 'firebase/firestore'
import {
  FIRESTORE_CLEANUP_BATCH_SIZE,
  runScopedCleanupBatches
} from '../utils/temporaryDataCleanup.js'

const deleteFirestoreBatch = db => async ({ documents }) => {
  const batch = writeBatch(db)
  documents.forEach(document => batch.delete(document.ref))
  await batch.commit()
}

export const cleanupExpiredInvitations = async ({
  db,
  restaurantId,
  now = new Date()
} = {}) => runScopedCleanupBatches({
  restaurantId,
  batchSize: FIRESTORE_CLEANUP_BATCH_SIZE,
  loadBatch: async ({ batchSize }) => {
    const snapshot = await getDocs(query(
      collection(db, 'restaurants', restaurantId, 'invitations'),
      where('expiresAt', '<=', Timestamp.fromDate(now)),
      limit(batchSize)
    ))
    return snapshot.docs.map(document => ({
      ref: document.ref,
      restaurantId: document.data().restaurantId,
      collectionName: 'invitations'
    }))
  },
  expectedCollection: 'invitations',
  deleteBatch: deleteFirestoreBatch(db)
})

export const cleanupExpiredPairingCodes = async ({
  db,
  restaurantId,
  now = new Date()
} = {}) => runScopedCleanupBatches({
  restaurantId,
  batchSize: FIRESTORE_CLEANUP_BATCH_SIZE,
  loadBatch: async ({ batchSize }) => {
    const snapshot = await getDocs(query(
      collection(db, 'pairing_codes'),
      where('companyUid', '==', restaurantId),
      where('expiresAt', '<=', Timestamp.fromDate(now)),
      limit(batchSize)
    ))
    return snapshot.docs.map(document => ({
      ref: document.ref,
      restaurantId: document.data().companyUid,
      collectionName: 'pairing_codes'
    }))
  },
  expectedCollection: 'pairing_codes',
  deleteBatch: deleteFirestoreBatch(db)
})
