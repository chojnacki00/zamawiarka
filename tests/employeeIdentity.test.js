import assert from 'node:assert/strict'
import test from 'node:test'
import { webcrypto } from 'node:crypto'
import {
  assertInvitationCanBeAccepted,
  buildAccountDocument,
  buildInvitationDocument,
  buildMembershipDocument,
  canManageScheduleWithMembership,
  canViewScheduleWithMembership,
  containsForbiddenCredentialData,
  isValidAccountEmail,
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
