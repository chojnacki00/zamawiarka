import {
  collection,
  collectionGroup,
  doc,
  getDoc,
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

const deleteInvitationBatch = db => async ({ documents }) => {
  const batch = writeBatch(db)
  documents.forEach(document => {
    batch.delete(document.ref)
    batch.delete(doc(db, 'activationInvitations', document.tokenHash))
    if (document.deleteSlot && document.slotId) {
      batch.delete(doc(
        db,
        'restaurants',
        document.restaurantId,
        'identityInvitationSlots',
        document.slotId
      ))
    }
  })
  await batch.commit()
}

export const cleanupExpiredInvitations = async ({
  db,
  restaurantId,
  now = new Date()
} = {}) => runScopedCleanupBatches({
  restaurantId,
  batchSize: Math.min(FIRESTORE_CLEANUP_BATCH_SIZE, 150),
  loadBatch: async ({ batchSize }) => {
    const snapshot = await getDocs(query(
      collection(db, 'identityInvitations'),
      where('restaurantId', '==', restaurantId),
      where('expiresAt', '<=', Timestamp.fromDate(now)),
      limit(batchSize)
    ))
    return Promise.all(snapshot.docs.map(async invitationSnapshot => {
      const invitation = invitationSnapshot.data()
      const slotSnapshot = invitation.slotId
        ? await getDoc(doc(
            db,
            'restaurants',
            restaurantId,
            'identityInvitationSlots',
            invitation.slotId
          ))
        : null
      return {
        ref: invitationSnapshot.ref,
        tokenHash: invitationSnapshot.id,
        slotId: invitation.slotId || null,
        deleteSlot: slotSnapshot?.exists() === true &&
          slotSnapshot.data().tokenHash === invitationSnapshot.id,
        restaurantId: invitation.restaurantId,
        collectionName: 'identityInvitations'
      }
    }))
  },
  expectedCollection: 'identityInvitations',
  deleteBatch: deleteInvitationBatch(db)
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

export const cleanupDisconnectedDeviceSessions = async ({
  db,
  restaurantId,
  now = new Date(),
  retentionDays = 90
} = {}) => {
  const threshold = new Date(
    now.getTime() - (retentionDays * 24 * 60 * 60 * 1000)
  )
  return runScopedCleanupBatches({
    restaurantId,
    batchSize: FIRESTORE_CLEANUP_BATCH_SIZE,
    loadBatch: async ({ batchSize }) => {
      const snapshot = await getDocs(query(
        collectionGroup(db, 'deviceSessions'),
        where('restaurantId', '==', restaurantId),
        where('status', '==', 'disconnected'),
        where('disconnectedAt', '<=', Timestamp.fromDate(threshold)),
        limit(batchSize)
      ))
      return snapshot.docs.map(deviceSnapshot => ({
        ref: deviceSnapshot.ref,
        restaurantId: deviceSnapshot.data().restaurantId,
        collectionName: 'deviceSessions'
      }))
    },
    expectedCollection: 'deviceSessions',
    deleteBatch: deleteFirestoreBatch(db)
  })
}
