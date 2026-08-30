import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { webcrypto } from 'node:crypto'
import {
  assertInvitationCanBeAccepted,
  assertInvitationMembershipMatch,
  buildAccountDocument,
  buildInvitationDocument,
  buildMembershipDocument,
  canUseEmployeePermissionInSession,
  canUsePrivilegedEmployeeActions,
  canManageScheduleWithMembership,
  canViewScheduleWithMembership,
  containsForbiddenCredentialData,
  isValidAccountEmail,
  requireRestaurantContextId,
  resolveLegacyOwnerBootstrapRestaurantId,
  resolveMembershipSelection
} from '../src/utils/employeeIdentity.js'
import {
  clearLocalPin,
  getLocalPinDelayMs,
  hasLocalPin,
  setLocalPin,
  verifyLocalPin
} from '../src/utils/localPinLock.js'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    values
  }
}

const memberships = [{
  authUid: 'account-1',
  restaurantId: 'restaurant-1',
  employeeId: 'employee-1',
  status: 'active'
}, {
  authUid: 'account-1',
  restaurantId: 'restaurant-2',
  employeeId: 'employee-8',
  status: 'active'
}]
const firestoreRules = readFileSync(
  new URL('../firestore.rules', import.meta.url),
  'utf8'
)

test('rozdziela authUid, restaurantId i employeeId', () => {
  const member = buildMembershipDocument({
    authUid: 'account-1',
    restaurantId: 'restaurant-1',
    employeeId: 'employee-1',
    permissionProfileId: 'profile-1',
    createdAt: 'now'
  })

  assert.equal(member.authUid, 'account-1')
  assert.equal(member.restaurantId, 'restaurant-1')
  assert.equal(member.employeeId, 'employee-1')
  assert.notEqual(member.authUid, member.restaurantId)
})

test('brak wybranego kontekstu restauracji nie wraca do authUid', () => {
  assert.throws(
    () => requireRestaurantContextId(null),
    /Kontekst restauracji/
  )
  assert.equal(
    requireRestaurantContextId('restaurant-1'),
    'restaurant-1'
  )
})

test('bootstrap restauracji z authUid jest jawnym wyjątkiem właściciela', () => {
  assert.equal(resolveLegacyOwnerBootstrapRestaurantId({
    authUid: 'owner-auth-1',
    emailVerified: true
  }), 'owner-auth-1')
  assert.equal(resolveLegacyOwnerBootstrapRestaurantId({
    authUid: 'employee-auth-1',
    emailVerified: false
  }), null)
})

test('waliduje adres e-mail używany przez konto i zaproszenie', () => {
  assert.equal(isValidAccountEmail('jan@example.com'), true)
  assert.equal(isValidAccountEmail('jan@example'), false)
  assert.equal(isValidAccountEmail('jan @example.com'), false)
})

test('jedno konto może należeć do dwóch restauracji', () => {
  const result = resolveMembershipSelection({ memberships })

  assert.equal(result.activeMemberships.length, 2)
  assert.equal(result.requiresSelection, true)
  assert.equal(result.selectedMembership, null)
})

test('automatycznie wybiera jedyną aktywną restaurację', () => {
  const result = resolveMembershipSelection({ memberships: [memberships[0]] })

  assert.equal(result.selectedRestaurantId, 'restaurant-1')
  assert.equal(result.requiresSelection, false)
})

test('przy wielu członkostwach respektuje wybór restauracji', () => {
  const result = resolveMembershipSelection({
    memberships,
    preferredRestaurantId: 'restaurant-2'
  })

  assert.equal(result.selectedMembership.employeeId, 'employee-8')
})

test('nieaktywne członkostwo nie daje dostępu ani wyboru', () => {
  const membership = { ...memberships[0], status: 'blocked' }
  const result = resolveMembershipSelection({ memberships: [membership] })

  assert.equal(result.activeMemberships.length, 0)
  assert.equal(canViewScheduleWithMembership({
    membership,
    permissions: { can_view_schedule: true }
  }), false)
})

test('odrzuca zaproszenie dla innego adresu e-mail', () => {
  assert.throws(() => assertInvitationCanBeAccepted({
    invitation: {
      emailNormalized: 'anna@example.com',
      status: 'pending',
      expiresAt: new Date('2026-10-10')
    },
    authUser: { email: 'jan@example.com', emailVerified: true },
    now: new Date('2026-10-01')
  }), /innego adresu/)
})

test('odrzuca zaproszenie bez potwierdzonego e-maila', () => {
  assert.throws(() => assertInvitationCanBeAccepted({
    invitation: {
      email: 'jan@example.com',
      status: 'pending',
      expiresAt: new Date('2026-10-10')
    },
    authUser: { email: 'jan@example.com', emailVerified: false },
    now: new Date('2026-10-01')
  }), /potwierdź/)
})

test('zaproszenie można zaakceptować tylko raz', () => {
  assert.throws(() => assertInvitationCanBeAccepted({
    invitation: {
      email: 'jan@example.com',
      status: 'accepted',
      expiresAt: new Date('2026-10-10'),
      acceptedAt: new Date('2026-10-02')
    },
    authUser: { email: 'jan@example.com', emailVerified: true },
    now: new Date('2026-10-03')
  }), /wykorzystane/)
})

test('wygasłe zaproszenie jest odrzucane', () => {
  assert.throws(() => assertInvitationCanBeAccepted({
    invitation: {
      email: 'jan@example.com',
      status: 'pending',
      expiresAt: new Date('2026-10-01')
    },
    authUser: { email: 'jan@example.com', emailVerified: true },
    now: new Date('2026-10-02')
  }), /wygasło/)
})

test('zaproszenie nie może utworzyć członkostwa w innej restauracji', () => {
  assert.throws(() => assertInvitationMembershipMatch({
    invitation: {
      restaurantId: 'restaurant-1',
      employeeId: 'employee-1'
    },
    restaurantId: 'restaurant-2',
    employeeId: 'employee-1'
  }), /innej restauracji/)
})

test('zaproszenie nie może utworzyć członkostwa dla innego pracownika', () => {
  assert.throws(() => assertInvitationMembershipMatch({
    invitation: {
      restaurantId: 'restaurant-1',
      employeeId: 'employee-1'
    },
    restaurantId: 'restaurant-1',
    employeeId: 'employee-2'
  }), /innego pracownika/)
})

test('dokumenty tożsamości nie zawierają hasła ani jawnego PIN-u', () => {
  const account = buildAccountDocument({
    authUid: 'account-1',
    email: 'jan@example.com',
    createdAt: 'now'
  })
  const invitation = buildInvitationDocument({
    invitationId: 'invite-1',
    restaurantId: 'restaurant-1',
    employeeId: 'employee-1',
    permissionProfileId: 'profile-1',
    email: 'jan@example.com',
    invitedByAuthUid: 'owner-1',
    createdAt: 'now',
    expiresAt: 'later'
  })
  const membership = buildMembershipDocument({
    authUid: 'account-1',
    restaurantId: 'restaurant-1',
    employeeId: 'employee-1',
    permissionProfileId: 'profile-1',
    createdAt: 'now'
  })

  assert.equal(containsForbiddenCredentialData(account), false)
  assert.equal(containsForbiddenCredentialData(invitation), false)
  assert.equal(containsForbiddenCredentialData(membership), false)
  assert.equal(invitation.permissionProfileId, 'profile-1')
})

test('can_view_schedule i can_manage_schedule pozostają oddzielne', () => {
  const membership = memberships[0]

  assert.equal(canViewScheduleWithMembership({
    membership,
    permissions: { can_view_schedule: true }
  }), true)
  assert.equal(canManageScheduleWithMembership({
    membership,
    permissions: { can_view_schedule: true }
  }), false)
  assert.equal(canManageScheduleWithMembership({
    membership,
    permissions: { can_manage_schedule: true }
  }), true)
})

test('uprzywilejowane operacje pracownika wymagają konta Firebase i kontekstu', () => {
  assert.equal(canUsePrivilegedEmployeeActions({
    sessionMode: 'legacy_pin',
    firebaseUser: null,
    hasActiveContext: false
  }), false)
  assert.equal(canUsePrivilegedEmployeeActions({
    sessionMode: 'firebase_account',
    firebaseUser: { uid: 'account-1' },
    hasActiveContext: false
  }), false)
  assert.equal(canUsePrivilegedEmployeeActions({
    sessionMode: 'firebase_account',
    firebaseUser: { uid: 'account-1' },
    hasActiveContext: true
  }), true)
})

test('legacy PIN zachowuje odczyt, ale nie daje uprawnień do zapisów', () => {
  assert.equal(canUseEmployeePermissionInSession({
    permissionKey: 'can_view_schedule',
    permissionEnabled: true,
    sessionMode: 'legacy_pin'
  }), true)
  assert.equal(canUseEmployeePermissionInSession({
    permissionKey: 'can_manage_schedule',
    permissionEnabled: true,
    sessionMode: 'legacy_pin'
  }), false)
  assert.equal(canUseEmployeePermissionInSession({
    permissionKey: 'can_edit_products',
    permissionEnabled: true,
    sessionMode: 'legacy_pin'
  }), false)
  assert.equal(canUseEmployeePermissionInSession({
    permissionKey: 'can_future_privileged_action',
    permissionEnabled: true,
    sessionMode: 'legacy_pin'
  }), false)
  assert.equal(canUseEmployeePermissionInSession({
    permissionKey: 'can_manage_schedule',
    permissionEnabled: true,
    sessionMode: 'firebase_account'
  }), true)
})

test('reguły wiążą akceptację zaproszenia z kontem i atomowym członkostwem', () => {
  assert.match(firestoreRules, /function hasVerifiedEmail\(\)/)
  assert.match(
    firestoreRules,
    /invitation\.emailNormalized == request\.auth\.token\.get\('email', null\)/
  )
  assert.match(firestoreRules, /invitationBefore\.data\.expiresAt > request\.time/)
  assert.match(firestoreRules, /invitationBefore\.data\.status == 'pending'/)
  assert.match(firestoreRules, /incoming\.restaurantId == restaurantId/)
  assert.match(firestoreRules, /data\.employeeId == incoming\.employeeId/)
  assert.match(firestoreRules, /getAfter\(invitationPath\)/)
})

test('reguły ograniczają bootstrap właściciela do istniejących starych danych', () => {
  assert.match(
    firestoreRules,
    /function isLegacyOwnerBootstrapRestaurant\(restaurantId\)/
  )
  assert.match(
    firestoreRules,
    /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(restaurantId\)\/app\/state\)/
  )
  assert.doesNotMatch(firestoreRules, /allow\s+(read|write)(,\s*(read|write))*:\s*if\s+true/)
})

test('lokalny PIN zapisuje tylko sól i weryfikator oraz blokuje po błędach', async () => {
  const storage = createStorage()
  await setLocalPin({
    authUid: 'account-1',
    pin: '1234',
    storage,
    cryptoImpl: webcrypto,
    iterations: 1000
  })

  assert.equal(hasLocalPin({ authUid: 'account-1', storage }), true)
  assert.equal(JSON.stringify([...storage.values.values()]).includes('1234'), false)
  assert.equal((await verifyLocalPin({
    authUid: 'account-1',
    pin: '1234',
    storage,
    cryptoImpl: webcrypto
  })).ok, true)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await verifyLocalPin({
      authUid: 'account-1',
      pin: '0000',
      storage,
      cryptoImpl: webcrypto,
      now: 1000
    })
  }

  const blocked = await verifyLocalPin({
    authUid: 'account-1',
    pin: '1234',
    storage,
    cryptoImpl: webcrypto,
    now: 1001
  })

  assert.equal(blocked.blocked, true)
  assert.ok(blocked.retryAfterMs > 0)
  assert.ok(getLocalPinDelayMs(4) > getLocalPinDelayMs(3))

  clearLocalPin({ authUid: 'account-1', storage })
  assert.equal(hasLocalPin({ authUid: 'account-1', storage }), false)
})
