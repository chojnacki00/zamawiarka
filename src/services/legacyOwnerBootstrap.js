import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import {
  buildAccountDocument,
  buildMembershipDocument,
  buildRestaurantDocument,
  normalizeAccountEmail,
  resolveLegacyOwnerBootstrapRestaurantId
} from '../utils/employeeIdentity.js'

const bootstrapError = message => {
  const error = new Error(message)
  error.code = 'account/owner-bootstrap-conflict'
  return error
}

const isOwnerMembership = ({ data, authUid, restaurantId }) => (
  data?.authUid === authUid &&
  data?.restaurantId === restaurantId &&
  data?.employeeId === null &&
  data?.permissionProfileId === null &&
  data?.invitationId === null &&
  data?.role === 'owner' &&
  data?.status === 'active'
)

const accountNeedsUpdate = ({ data, user }) => (
  data?.authUid !== user.uid ||
  normalizeAccountEmail(data?.email) !== normalizeAccountEmail(user.email) ||
  String(data?.displayName || '') !== String(user.displayName || '') ||
  data?.status !== 'active'
)

export const completeLegacyOwnerBootstrap = async ({
  db,
  user,
  restaurantName
} = {}) => {
  const restaurantId = resolveLegacyOwnerBootstrapRestaurantId({
    authUid: user?.uid,
    emailVerified: user?.emailVerified
  })
  if (!restaurantId) return { bootstrapped: false, reason: 'not-eligible' }

  const markerRef = doc(db, 'users', restaurantId, 'app', 'state')
  const accountRef = doc(db, 'accounts', user.uid)
  const restaurantRef = doc(db, 'restaurants', restaurantId)
  const memberRef = doc(
    db,
    'restaurants',
    restaurantId,
    'members',
    user.uid
  )

  const result = await runTransaction(db, async transaction => {
    const markerSnapshot = await transaction.get(markerRef)
    if (!markerSnapshot.exists()) {
      return { bootstrapped: false, reason: 'marker-missing' }
    }

    const [accountSnapshot, restaurantSnapshot, memberSnapshot] =
      await Promise.all([
        transaction.get(accountRef),
        transaction.get(restaurantRef),
        transaction.get(memberRef)
      ])
    const now = serverTimestamp()

    if (
      restaurantSnapshot.exists() &&
      (
        restaurantSnapshot.data().id !== restaurantId ||
        restaurantSnapshot.data().ownerAuthUid !== user.uid ||
        restaurantSnapshot.data().status !== 'active'
      )
    ) {
      throw bootstrapError(
        'Nie można dokończyć konfiguracji właściciela, ponieważ restauracja ma niespójne dane.'
      )
    }

    if (
      memberSnapshot.exists() &&
      !isOwnerMembership({
        data: memberSnapshot.data(),
        authUid: user.uid,
        restaurantId
      })
    ) {
      throw bootstrapError(
        'Nie można dokończyć konfiguracji właściciela, ponieważ członkostwo ma niespójne dane.'
      )
    }

    let accountDocument = accountSnapshot.exists()
      ? accountSnapshot.data()
      : buildAccountDocument({
          authUid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          createdAt: now
        })

    if (!accountSnapshot.exists()) {
      transaction.set(accountRef, accountDocument)
    } else if (accountNeedsUpdate({ data: accountDocument, user })) {
      accountDocument = buildAccountDocument({
        authUid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        createdAt: accountDocument.createdAt || now,
        updatedAt: now
      })
      transaction.set(accountRef, accountDocument, { merge: true })
    }

    if (!restaurantSnapshot.exists()) {
      transaction.set(restaurantRef, buildRestaurantDocument({
        restaurantId,
        name: restaurantName,
        ownerAuthUid: user.uid,
        createdAt: now
      }))
    }

    if (!memberSnapshot.exists()) {
      transaction.set(memberRef, buildMembershipDocument({
        authUid: user.uid,
        restaurantId,
        role: 'owner',
        createdAt: now
      }))
    }

    return {
      bootstrapped: true,
      restaurantId,
      accountDocument
    }
  })

  if (!result.bootstrapped) return result

  const accountSnapshot = await getDoc(accountRef)
  return {
    ...result,
    accountDocument: accountSnapshot.exists()
      ? accountSnapshot.data()
      : result.accountDocument
  }
}
