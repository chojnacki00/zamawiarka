import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore'
import {
  FIRESTORE_CLEANUP_BATCH_SIZE,
  FIRESTORE_INVITATION_CLEANUP_BATCH_SIZE,
  isDisconnectedDeviceSessionExpired,
  isExpiredTemporaryDocument,
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
  batchSize: FIRESTORE_INVITATION_CLEANUP_BATCH_SIZE,
  maxBatches: 100,
  loadBatch: async () => {
    const snapshot = await getDocs(query(
      collection(db, 'identityInvitations'),
      where('restaurantId', '==', restaurantId)
    ))
    const expiredSnapshots = snapshot.docs.filter(invitationSnapshot => (
      isExpiredTemporaryDocument({
        expiresAt: invitationSnapshot.data().expiresAt,
        now
      })
    ))
    return Promise.all(expiredSnapshots.map(async invitationSnapshot => {
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
  loadBatch: async () => {
    const snapshot = await getDocs(query(
      collection(db, 'pairing_codes'),
      where('companyUid', '==', restaurantId)
    ))
    return snapshot.docs
      .filter(document => isExpiredTemporaryDocument({
        expiresAt: document.data().expiresAt,
        now
      }))
      .map(document => ({
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
    loadBatch: async () => {
      const membersSnapshot = await getDocs(collection(
        db,
        'restaurants',
        restaurantId,
        'members'
      ))
      const deviceSnapshots = await Promise.all(
        membersSnapshot.docs.map(memberSnapshot => getDocs(collection(
          memberSnapshot.ref,
          'deviceSessions'
        )))
      )
      return deviceSnapshots.flatMap(snapshot => snapshot.docs)
        .filter(deviceSnapshot => isDisconnectedDeviceSessionExpired({
          status: deviceSnapshot.data().status,
          disconnectedAt: deviceSnapshot.data().disconnectedAt,
          threshold
        }))
        .map(deviceSnapshot => ({
          ref: deviceSnapshot.ref,
          restaurantId: deviceSnapshot.data().restaurantId,
          collectionName: 'deviceSessions'
        }))
    },
    expectedCollection: 'deviceSessions',
    deleteBatch: deleteFirestoreBatch(db)
  })
}
